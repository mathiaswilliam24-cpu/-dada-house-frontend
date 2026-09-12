import { NextRequest, NextResponse } from "next/server";
import { validateTwilioRequest } from "@/lib/twilio-validate";
import { handleInboundSms } from "@/lib/messaging";

export const dynamic = "force-dynamic";

/**
 * General inbound-SMS webhook for the call center. Separate from the
 * existing app/api/webhooks/twilio-sms/route.ts, which is delivery-status
 * only and keyed to CampaignRecipient — a different shape entirely.
 */
export async function POST(req: NextRequest) {
  const invalid = await validateTwilioRequest(req);
  if (invalid) return invalid;

  const formData = await req.formData();
  const from = String(formData.get("From") ?? "");
  const to = String(formData.get("To") ?? "");
  const body = String(formData.get("Body") ?? "");
  const messageSid = String(formData.get("MessageSid") ?? "");

  if (from && body) {
    await handleInboundSms(from, to, body, messageSid).catch((err) => console.error("Inbound SMS handling failed", err));
  }

  return new NextResponse("<?xml version='1.0' encoding='UTF-8'?><Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
}
