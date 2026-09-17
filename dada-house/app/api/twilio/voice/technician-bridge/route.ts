import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { validateTwilioRequest } from "@/lib/twilio-validate";

export const dynamic = "force-dynamic";

/**
 * TwiML webhook hit when the technician answers the call Twilio placed to
 * their own phone (see app/api/technician/jobs/[id]/call/route.ts). Bridges
 * them straight into a call to the customer, showing DADA HOUSE's caller ID.
 * The Call DB row was already created when the outbound call was initiated —
 * this only needs to return TwiML, not write to the database.
 */
export async function POST(req: NextRequest) {
  const invalid = await validateTwilioRequest(req);
  if (invalid) return invalid;

  const customerPhone = req.nextUrl.searchParams.get("customerPhone") ?? "";
  const callerId = process.env.CALL_CENTER_PHONE_NUMBER ?? "";

  const twiml = new twilio.twiml.VoiceResponse();

  if (!customerPhone) {
    twiml.say("No customer number provided.");
    twiml.hangup();
    return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
  }

  twiml.say("Connecting you now.");
  twiml.dial({ callerId, action: "/api/twilio/voice/status", method: "POST" }).number(customerPhone);

  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}
