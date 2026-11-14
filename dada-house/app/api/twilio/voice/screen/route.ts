import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { db } from "@/lib/db";
import { validateTwilioRequest } from "@/lib/twilio-validate";
import { SAY_VOICE } from "@/lib/twilio-voice";
import { claimCall, cancelOtherLegs, queueName } from "@/lib/ring-dispatchers";

export const dynamic = "force-dynamic";

function xml(twiml: InstanceType<typeof twilio.twiml.VoiceResponse>) {
  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}

/**
 * TwiML for one dispatcher leg of an inbound call (see lib/ring-dispatchers.ts).
 *
 *  mode=cell     the dispatcher's phone picked up → "press 1 to accept". The key
 *                press stops a personal voicemail from taking the call.
 *  mode=browser  the dispatcher clicked Accept in the softphone → accept directly.
 *
 * Accepting claims the call atomically: the first dispatcher is bridged to the
 * waiting caller (recorded) and every other dispatcher phone stops ringing.
 */
export async function POST(req: NextRequest) {
  const invalid = await validateTwilioRequest(req);
  if (invalid) return invalid;

  const formData = await req.formData();
  const digits = String(formData.get("Digits") ?? "");
  const legSid = String(formData.get("CallSid") ?? "");
  const params = new URL(req.url).searchParams;
  const stage = params.get("stage");
  const mode = params.get("mode");
  const callId = params.get("callId");
  const agentId = params.get("agentId");
  const twiml = new twilio.twiml.VoiceResponse();

  if (!callId) {
    twiml.hangup();
    return xml(twiml);
  }

  const accepting = mode === "browser" || (stage === "result" && digits === "1");

  if (!accepting && stage !== "result") {
    // Cell picked up: ask the dispatcher to confirm.
    const qs = new URLSearchParams({ stage: "result", mode: "cell", callId, ...(agentId ? { agentId } : {}) });
    const gather = twiml.gather({ numDigits: 1, timeout: 8, action: `/api/twilio/voice/screen?${qs.toString()}`, method: "POST" });
    gather.say(SAY_VOICE, "DADA HOUSE customer call. Press 1 to accept.");
    twiml.hangup();
    return xml(twiml);
  }

  if (!accepting) {
    twiml.hangup();
    return xml(twiml);
  }

  const won = await claimCall(callId, agentId);
  if (!won) {
    const call = await db.call.findUnique({ where: { id: callId }, select: { answeredAt: true } });
    twiml.say(
      SAY_VOICE,
      call?.answeredAt ? "This call was already answered by another dispatcher." : "Sorry, the caller has already hung up."
    );
    twiml.hangup();
    return xml(twiml);
  }

  // Winner: stop every other dispatcher phone, then bridge to the waiting caller.
  await cancelOtherLegs(callId, legSid);
  const dial = twiml.dial({
    record: "record-from-answer",
    recordingStatusCallback: `/api/twilio/voice/call-recording?callId=${callId}`,
    recordingStatusCallbackMethod: "POST",
    recordingStatusCallbackEvent: ["completed"],
  });
  dial.queue(queueName(callId));
  return xml(twiml);
}
