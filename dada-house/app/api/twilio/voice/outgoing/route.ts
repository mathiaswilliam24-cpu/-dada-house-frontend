import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { db } from "@/lib/db";
import { validateTwilioRequest } from "@/lib/twilio-validate";
import { findOrCreateCustomerByPhone } from "@/lib/customers";

export const dynamic = "force-dynamic";

/**
 * TwiML App Voice URL — hit when the browser softphone calls
 * device.connect({ params: { To } }). "From" arrives as the Twilio Client
 * identity (e.g. "client:agent-<userId>"), not a phone number.
 */
export async function POST(req: NextRequest) {
  const invalid = await validateTwilioRequest(req);
  if (invalid) return invalid;

  const formData = await req.formData();
  const to = String(formData.get("To") ?? "");
  const from = String(formData.get("From") ?? "");
  const callSid = String(formData.get("CallSid") ?? "");
  const callerId = process.env.CALL_CENTER_PHONE_NUMBER ?? "";

  const agentUserId = from.startsWith("client:agent-") ? from.replace("client:agent-", "") : null;

  const twiml = new twilio.twiml.VoiceResponse();

  if (!to) {
    twiml.say("No destination number provided.");
    twiml.hangup();
    return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
  }

  const customer = await findOrCreateCustomerByPhone(to);

  await db.call.create({
    data: {
      twilioCallSid: callSid,
      direction: "OUTBOUND",
      fromNumber: callerId,
      toNumber: to,
      status: "RINGING",
      customerId: customer.id,
      agentId: agentUserId,
    },
  }).catch(() => {});

  twiml.dial({ callerId, action: "/api/twilio/voice/status", method: "POST" }).number(to);

  return new NextResponse(twiml.toString(), { headers: { "Content-Type": "text/xml" } });
}
