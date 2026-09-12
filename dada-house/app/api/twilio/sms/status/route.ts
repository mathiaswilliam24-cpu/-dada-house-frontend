import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateTwilioRequest } from "@/lib/twilio-validate";
import { MessageStatus } from "@/lib/generated/prisma/enums";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, MessageStatus> = {
  queued: "QUEUED",
  sent: "SENT",
  delivered: "DELIVERED",
  failed: "FAILED",
  undelivered: "UNDELIVERED",
};

/** statusCallback for call-center-originated sends (see lib/messaging.ts::sendOutboundSms). */
export async function POST(req: NextRequest) {
  const invalid = await validateTwilioRequest(req);
  if (invalid) return invalid;

  const formData = await req.formData();
  const sid = String(formData.get("MessageSid") ?? "");
  const rawStatus = String(formData.get("MessageStatus") ?? "").toLowerCase();
  const status = STATUS_MAP[rawStatus];

  if (sid && status) {
    await db.message.updateMany({ where: { twilioSid: sid }, data: { status } }).catch(() => {});
  }

  return new NextResponse("<?xml version='1.0' encoding='UTF-8'?><Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
}
