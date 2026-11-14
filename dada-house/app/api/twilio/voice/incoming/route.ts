import { NextRequest, NextResponse, after } from "next/server";
import twilio from "twilio";
import { db } from "@/lib/db";
import { validateTwilioRequest } from "@/lib/twilio-validate";
import { findOrCreateCustomerByPhone } from "@/lib/customers";
import { SAY_VOICE } from "@/lib/twilio-voice";
import { alertOwner } from "@/lib/inbound-sms-alert";
import {
  RING_SECONDS,
  queueName,
  getAvailableAgents,
  ringDispatchers,
  cancelOtherLegs,
  deleteQueue,
} from "@/lib/ring-dispatchers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");

function xml(twiml: InstanceType<typeof twilio.twiml.VoiceResponse>) {
  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}

/**
 * Marks the call as unanswered by a human before handing off to overflow
 * (Vapi if VAPI_OVERFLOW_WEBHOOK_URL is set, otherwise the business voicemail)
 * and texts the owner about the missed call.
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
 * Twilio's "A call comes in" webhook for the DADA HOUSE number (844).
 *
 *  1. New call → recording notice, then the caller is put in a per-call queue
 *     (stage=wait plays ringback) while lib/ring-dispatchers.ts calls every
 *     AVAILABLE dispatcher at once (cell + browser softphone).
 *  2. The first dispatcher to accept is bridged from the queue; all other
 *     dispatcher phones stop ringing (see voice/screen).
 *  3. Nobody accepts within RING_SECONDS → the caller leaves the queue
 *     (stage=done, QueueResult=leave) → business voicemail + owner SMS.
 */
export async function POST(req: NextRequest) {
  const invalid = await validateTwilioRequest(req);
  if (invalid) return invalid;

  const formData = await req.formData();
  const from = String(formData.get("From") ?? "");
  const to = String(formData.get("To") ?? "");
  const callSid = String(formData.get("CallSid") ?? "");

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const callId = searchParams.get("callId");

  const twiml = new twilio.twiml.VoiceResponse();

  // Hold loop while dispatchers ring (Enqueue waitUrl — re-requested after each play).
  if (stage === "wait" && callId) {
    const queueTime = Number(formData.get("QueueTime") ?? 0);
    if (queueTime >= RING_SECONDS) {
      const call = await db.call.findUnique({ where: { id: callId }, select: { answeredAt: true } });
      // A dispatcher just accepted and is being bridged — don't pull the caller out.
      if (!call?.answeredAt) {
        twiml.leave();
        return xml(twiml);
      }
    }
    twiml.play(`${APP_URL}/sounds/ringback.wav`);
    return xml(twiml);
  }

  // Caller left the queue (Enqueue action).
  if (stage === "done" && callId) {
    const result = String(formData.get("QueueResult") ?? "");
    const queueSid = formData.get("QueueSid") ? String(formData.get("QueueSid")) : null;
    after(() => deleteQueue(queueSid));

    if (result === "bridged" || result === "bridging-in-process") {
      // Conversation over (status/duration set by the dispatcher leg + recording callback).
      const call = await db.call.findUnique({ where: { id: callId }, select: { answeredAt: true } });
      await db.call.update({
        where: { id: callId },
        data: {
          status: "COMPLETED",
          endedAt: new Date(),
          durationSeconds: call?.answeredAt ? Math.round((Date.now() - call.answeredAt.getTime()) / 1000) : undefined,
        },
      }).catch(() => {});
      twiml.hangup();
      return xml(twiml);
    }

    // Not answered (timeout, caller hung up, or error): stop every dispatcher phone.
    await cancelOtherLegs(callId);
    await markOverflowed(callId);
    if (result === "hangup") {
      await db.call.update({ where: { id: callId }, data: { endedAt: new Date() } }).catch(() => {});
      return xml(twiml);
    }
    return xml(buildOverflowTwiml());
  }

  // Legacy stage from the previous <Dial>-based flow (calls already in progress during deploy).
  if (stage === "noanswer" && callId) {
    if (String(formData.get("DialBridged") ?? "") === "true") {
      await db.call.update({ where: { id: callId }, data: { status: "COMPLETED", endedAt: new Date() } }).catch(() => {});
      twiml.hangup();
      return xml(twiml);
    }
    await markOverflowed(callId);
    return xml(buildOverflowTwiml());
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

  // Ring every dispatcher device in parallel, after answering Twilio.
  after(() => ringDispatchers(call.id, from, availableAgents));

  // Calls with dispatchers are recorded (then transcribed for Call History).
  twiml.say(SAY_VOICE, "Thank you for calling DADA HOUSE. This call may be recorded for quality purposes.");
  twiml.enqueue(
    {
      waitUrl: `/api/twilio/voice/incoming?stage=wait&callId=${call.id}`,
      waitUrlMethod: "POST",
      action: `/api/twilio/voice/incoming?stage=done&callId=${call.id}`,
      method: "POST",
    },
    queueName(call.id)
  );
  return xml(twiml);
}

function buildOverflowTwiml() {
  const twiml = new twilio.twiml.VoiceResponse();
  const overflowWebhookUrl = process.env.VAPI_OVERFLOW_WEBHOOK_URL;

  if (overflowWebhookUrl) {
    // Hand the live call to Vapi, which fetches fresh TwiML for this same call.
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
