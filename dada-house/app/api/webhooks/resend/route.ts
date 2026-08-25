import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const type: string = body?.type ?? "";
  const data = body?.data ?? {};

  const emailId: string | undefined = data?.email_id;
  const tags: { name: string; value: string }[] = data?.tags ?? [];
  const recipientIdTag = tags.find(t => t.name === "campaign_recipient_id");

  if (!emailId && !recipientIdTag) return NextResponse.json({ ok: true });

  if (type === "email.delivered") {
    if (recipientIdTag) {
      await db.campaignRecipient.updateMany({
        where: { id: recipientIdTag.value },
        data: { emailStatus: "DELIVERED", deliveredAt: new Date() },
      }).catch(() => {});
    } else if (emailId) {
      await db.campaignRecipient.updateMany({
        where: { resendEmailId: emailId },
        data: { emailStatus: "DELIVERED", deliveredAt: new Date() },
      }).catch(() => {});
    }
  }

  if (type === "email.opened") {
    if (recipientIdTag) {
      await db.campaignRecipient.updateMany({
        where: { id: recipientIdTag.value, openedAt: null },
        data: { emailStatus: "OPENED", openedAt: new Date() },
      }).catch(() => {});
    } else if (emailId) {
      await db.campaignRecipient.updateMany({
        where: { resendEmailId: emailId, openedAt: null },
        data: { emailStatus: "OPENED", openedAt: new Date() },
      }).catch(() => {});
    }
  }

  if (type === "email.bounced" || type === "email.complained") {
    if (recipientIdTag) {
      await db.campaignRecipient.updateMany({
        where: { id: recipientIdTag.value },
        data: { emailStatus: "BOUNCED" },
      }).catch(() => {});
    } else if (emailId) {
      await db.campaignRecipient.updateMany({
        where: { resendEmailId: emailId },
        data: { emailStatus: "BOUNCED" },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
