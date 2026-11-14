import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { db } from "@/lib/db";
import { validateTwilioRequest } from "@/lib/twilio-validate";
import { SAY_VOICE } from "@/lib/twilio-voice";

export const dynamic = "force-dynamic";

function xml(twiml: InstanceType<typeof twilio.twiml.VoiceResponse>) {
  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}

/**
 * Call screening for the dispatcher-mobile leg of an inbound call (<Number url=...>).
 * Played to the dispatcher only, before bridging. Requiring a key press stops a
 * dispatcher's personal voicemail (phone off, DND, declined) from "answering"
 * and swallowing the customer's call — without the digit the leg hangs up and
 * the caller goes on to the business voicemail.
 */
export async function POST(req: NextRequest) {
  const invalid = await validateTwilioRequest(req);
  if (invalid) return invalid;

  const formData = await req.formData();
  const digits = String(formData.get("Digits") ?? "");
  const params = new URL(req.url).searchParams;
  const stage = params.get("stage");
  const callId = params.get("callId");
  const agentId = params.get("agentId");
  const twiml = new twilio.twiml.VoiceResponse();

  if (stage === "result") {
    if (digits !== "1") {
      twiml.hangup();
      return xml(twiml);
    }
    // Accepted → record who took it, then empty TwiML bridges dispatcher and customer.
    if (callId) {
      await db.call
        .update({
          where: { id: callId },
          data: { status: "IN_PROGRESS", answeredAt: new Date(), ...(agentId ? { agentId } : {}) },
        })
        .catch(() => {});
    }
    return xml(twiml);
  }

  const qs = new URLSearchParams({ stage: "result", ...(callId ? { callId } : {}), ...(agentId ? { agentId } : {}) });
  const gather = twiml.gather({
    numDigits: 1,
    timeout: 8,
    action: `/api/twilio/voice/screen?${qs.toString()}`,
    method: "POST",
  });
  gather.say(SAY_VOICE, "DADA HOUSE customer call. Press 1 to accept.");
  twiml.hangup();
  return xml(twiml);
}
