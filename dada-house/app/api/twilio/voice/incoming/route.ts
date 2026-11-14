import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { db } from "@/lib/db";
import { validateTwilioRequest } from "@/lib/twilio-validate";
import { findOrCreateCustomerByPhone } from "@/lib/customers";
import { agentIdentity, SAY_VOICE } from "@/lib/twilio-voice";
import { isWithinBusinessHours } from "@/lib/business-hours";
import { normalizePhone } from "@/lib/customers";
import { alertOwner } from "@/lib/inbound-sms-alert";
import { AgentStatus, Role } from "@/lib/generated/prisma/enums";

export const dynamic = "force-dynamic";

// Ring the browser softphone alone first, so a quick-to-voicemail mobile number
// can't "win" the race before an agent has any real chance to answer on screen.
const BROWSER_RING_TIMEOUT = Number(process.env.BROWSER_RING_TIMEOUT_SECONDS ?? "12");
const MOBILE_RING_TIMEOUT = Number(process.env.NO_ANSWER_TIMEOUT_SECONDS ?? "20");

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");
const CALL_CENTER_ROLES: Role[] = ["SUPER_ADMIN", "MANAGER", "CUSTOMER_SERVICE_REP", "ADMIN", "DISPATCHER"];

function xml(twiml: InstanceType<typeof twilio.twiml.VoiceResponse>) {
  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}

async function getAvailableAgents() {
  if (!isWithinBusinessHours()) return [];
  return db.user.findMany({
    where: { agentStatus: "AVAILABLE" as AgentStatus, role: { in: CALL_CENTER_ROLES } },
    select: { id: true, phone: true },
  });
}

async function markCompleted(callId: string, dialCallDuration: FormDataEntryValue | null) {
  await db.call.update({
    where: { id: callId },
    data: {
      status: "COMPLETED",
      endedAt: new Date(),
      durationSeconds: dialCallDuration ? Number(dialCallDuration) : undefined,
    },
  }).catch(() => {});
}

/**
 * Marks the call as unanswered by a human before handing off to overflow. When
 * Vapi picks it up, the disposition says so explicitly — otherwise the call
 * sits in /calls as a plain NO_ANSWER with no indication a 40-second AI
 * conversation may have followed on Vapi's side (which we have no visibility
 * into once <Redirect> hands the live call away).
 */
async function markOverflowed(callId: string) {
  const toVapi = !!process.env.VAPI_OVERFLOW_WEBHOOK_URL;
  const call = await db.call.update({
    where: { id: callId },
    data: {
      status: "NO_ANSWER",
      endedAt: toVapi ? new Date() : undefined,
      disposition: toVapi ? "TRANSFERRED_TO_VAPI" : undefined,
    },
  }).catch(() => null);
  if (call && !toVapi) {
    await alertOwner(
      `DADA HOUSE - missed call from ${call.fromNumber} (no dispatcher answered). Call back: ${APP_URL}/calls`,
      [call.fromNumber]
    );
  }
}

/**
 * Twilio's "A call comes in" webhook for the DADA HOUSE call-center number.
 * Configure this URL directly on the Twilio number (Console > Phone Numbers
 * > Voice Configuration). This route also owns the number's webhook, so it
 * is responsible for explicitly forwarding to the Vapi assistant for
 * after-hours/no-answer overflow — see VAPI_OVERFLOW_WEBHOOK_URL below.
 *
 * Ring order: browser softphone alone (BROWSER_RING_TIMEOUT) -> agents'
 * mobile numbers as fallback (MOBILE_RING_TIMEOUT) -> overflow (Vapi or
 * voicemail). Staggered on purpose: dialing a mobile number and the browser
 * client in the same <Dial> lets whichever answers first win the race, and a
 * phone that forwards to voicemail almost instantly (off, DND, etc.) was
 * consistently beating the browser before the agent had any real chance to
 * click Accept.
 */
export async function POST(req: NextRequest) {
  const invalid = await validateTwilioRequest(req);
  if (invalid) return invalid;

  const formData = await req.formData();
  const from = String(formData.get("From") ?? "");
  const to = String(formData.get("To") ?? "");
  const callSid = String(formData.get("CallSid") ?? "");
  const dialCallStatus = formData.get("DialCallStatus") ? String(formData.get("DialCallStatus")) : null;
  const dialCallDuration = formData.get("DialCallDuration");

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const callId = searchParams.get("callId");

  const twiml = new twilio.twiml.VoiceResponse();

  // Third hit: the mobile-fallback <Dial> just ended.
  if (stage === "noanswer") {
    // A screened cell leg answered by a personal voicemail reports "completed"
    // even though nobody pressed 1 — only a real bridge counts as answered.
    const dialBridged = formData.get("DialBridged");
    console.log("Inbound dial ended", { callId, dialCallStatus, dialBridged, dialCallDuration });
    const answered =
      dialBridged !== null
        ? String(dialBridged) === "true"
        : dialCallStatus === "completed" || dialCallStatus === "answered";
    if (answered) {
      if (callId) await markCompleted(callId, dialCallDuration);
      twiml.hangup();
      return xml(twiml);
    }

    if (callId) await markOverflowed(callId);
    return xml(buildOverflowTwiml());
  }

  // Second hit: the browser-only <Dial> just ended — try agents' mobile numbers next.
  if (stage === "mobile-fallback" && callId) {
    if (dialCallStatus === "completed" || dialCallStatus === "answered") {
      await markCompleted(callId, dialCallDuration);
      twiml.hangup();
      return xml(twiml);
    }

    const agents = await getAvailableAgents();
    const agentsWithPhone = agents.filter((a) => a.phone);

    if (agentsWithPhone.length === 0) {
      await markOverflowed(callId);
      return xml(buildOverflowTwiml());
    }

    const dial = twiml.dial({
      timeout: MOBILE_RING_TIMEOUT,
      action: `/api/twilio/voice/incoming?stage=noanswer&callId=${callId}`,
      method: "POST",
    });
    for (const agent of agentsWithPhone) {
      // Screened: dispatcher must press 1, so a personal voicemail can't take the call.
      dial.number({ url: "/api/twilio/voice/screen", method: "POST" }, normalizePhone(agent.phone!));
    }
    return xml(twiml);
  }

  // First hit: brand-new inbound call.
  const customer = await findOrCreateCustomerByPhone(from);

  const call = await db.call.create({
    data: {
      twilioCallSid: callSid,
      direction: "INBOUND",
      fromNumber: from,
      toNumber: to,
      status: "RINGING",
      customerId: customer.id,
    },
  });

  const availableAgents = await getAvailableAgents();

  if (availableAgents.length === 0) {
    await markOverflowed(call.id);
    return xml(buildOverflowTwiml());
  }

  // Ring browser softphones AND dispatchers' cells at the same time. The cell
  // leg is screened ("press 1"), so a personal voicemail can no longer win the
  // race — the reason the old flow made cells wait BROWSER_RING_TIMEOUT first,
  // which in practice meant callers hung up before any cell rang.
  // Calls with dispatchers are recorded (then transcribed + summarized for
  // Call History), so callers are told up front.
  twiml.say(SAY_VOICE, "Thank you for calling DADA HOUSE. This call may be recorded for quality purposes.");
  const dial = twiml.dial({
    timeout: MOBILE_RING_TIMEOUT + BROWSER_RING_TIMEOUT,
    action: `/api/twilio/voice/incoming?stage=noanswer&callId=${call.id}`,
    method: "POST",
    record: "record-from-answer",
    recordingStatusCallback: `/api/twilio/voice/call-recording?callId=${call.id}`,
    recordingStatusCallbackMethod: "POST",
    recordingStatusCallbackEvent: ["completed"],
  });
  for (const agent of availableAgents) {
    dial.client(agentIdentity(agent.id));
  }
  for (const agent of availableAgents) {
    if (agent.phone) {
      dial.number(
        { url: `/api/twilio/voice/screen?callId=${call.id}&agentId=${agent.id}`, method: "POST" },
        normalizePhone(agent.phone)
      );
    }
  }

  return xml(twiml);
}

function buildOverflowTwiml() {
  const twiml = new twilio.twiml.VoiceResponse();
  const overflowWebhookUrl = process.env.VAPI_OVERFLOW_WEBHOOK_URL;

  if (overflowWebhookUrl) {
    // Vapi owns the number via its own webhook (e.g. https://api.vapi.ai/twilio/inbound_call),
    // not a dialable phone number — hand the live call back to it with <Redirect>, which tells
    // Twilio to fetch fresh TwiML from that URL for this same call.
    twiml.redirect({ method: "POST" }, overflowWebhookUrl);
  } else {
    twiml.say(
      SAY_VOICE,
      "Thank you for calling DADA HOUSE. We're sorry we missed your call. Please leave your name, phone number and a short message after the tone, and we will call you back as soon as possible."
    );
    twiml.record({
      recordingStatusCallback: "/api/twilio/voice/recording",
      recordingStatusCallbackMethod: "POST",
      maxLength: 120,
      playBeep: true,
    });
  }

  return twiml;
}
