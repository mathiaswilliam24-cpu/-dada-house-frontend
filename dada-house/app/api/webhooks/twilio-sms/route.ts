import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const recipientId = searchParams.get("recipientId");

  const formData = await req.formData();
  const status = (formData.get("MessageStatus") as string ?? "").toLowerCase();
  const sid = formData.get("MessageSid") as string ?? "";

  if (!recipientId) return NextResponse.json({ ok: true });

  let smsStatus = "SENT";
  if (status === "delivered") smsStatus = "DELIVERED";
  else if (status === "failed" || status === "undelivered") smsStatus = "FAILED";

  await db.campaignRecipient.update({
    where: { id: recipientId },
    data: {
      smsStatus,
      ...(status === "delivered" && { deliveredAt: new Date() }),
      ...(sid && { twilioSid: sid }),
    },
  }).catch(() => {});

  return new NextResponse("<?xml version='1.0' encoding='UTF-8'?><Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
}
