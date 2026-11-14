import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { validateTwilioRequest } from "@/lib/twilio-validate";

export const dynamic = "force-dynamic";

function xml(twiml: InstanceType<typeof twilio.twiml.VoiceResponse>) {
  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}

/**
 * Call screening for the dispatcher-mobile leg of an inbound call (<Number url=...>).
 * Played to the dispatcher only, before bridging. Requiring a key press stops a
 * dispatcher's personal voicemail (phone off, DND, declined) from "answering"
 * and swallowing the customer's call — without the digit the leg hangs up and
 * the call continues to other dispatchers, then to the business voicemail.
 */
export async function POST(req: NextRequest) {
  const invalid = await validateTwilioRequest(req);
  if (invalid) return invalid;

  const formData = await req.formData();
  const digits = String(formData.get("Digits") ?? "");
  const stage = new URL(req.url).searchParams.get("stage");
  const twiml = new twilio.twiml.VoiceResponse();

  if (stage === "result") {
    // Digit pressed → return empty TwiML, which bridges the dispatcher to the customer.
    if (digits !== "1") twiml.hangup();
    return xml(twiml);
  }

  const gather = twiml.gather({
    numDigits: 1,
    timeout: 8,
    action: "/api/twilio/voice/screen?stage=result",
    method: "POST",
  });
  gather.say("DADA HOUSE customer call. Press 1 to accept.");
  twiml.hangup();
  return xml(twiml);
}
