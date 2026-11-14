import { NextRequest, NextResponse, after } from "next/server";
import { validateTwilioRequest } from "@/lib/twilio-validate";
import { handleInboundSms } from "@/lib/messaging";
import { readTwilioMedia } from "@/lib/inbound-media";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * General inbound-SMS/MMS webhook for the call center. Separate from the
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
  const media = readTwilioMedia(formData);

  // Photo-only texts have an empty Body — they must still be saved.
  if (from && (body || media.length)) {
    // Re-hosting photos can take a few seconds; answer Twilio right away
    // (its webhook timeout is 15s) and finish the work after the response.
    after(() =>
      handleInboundSms(from, to, body, messageSid, media).catch((err) => console.error("Inbound SMS handling failed", err))
    );
  }

  return new NextResponse("<?xml version='1.0' encoding='UTF-8'?><Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
}
