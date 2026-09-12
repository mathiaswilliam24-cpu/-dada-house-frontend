import { NextRequest, NextResponse } from "next/server";
import { verifyResendWebhook } from "@/lib/resend-webhook";
import { handleInboundEmail } from "@/lib/customer-email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const verified = verifyResendWebhook(rawBody, {
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
  });
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const event = JSON.parse(rawBody);
  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true });
  }

  const emailId = event.data.email_id;
  const detailRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  });
  if (!detailRes.ok) {
    return NextResponse.json({ error: "Could not fetch email content" }, { status: 502 });
  }
  const detail = await detailRes.json();

  try {
    await handleInboundEmail({
      from: detail.from,
      to: Array.isArray(detail.to) ? detail.to[0] : detail.to,
      subject: detail.subject ?? null,
      text: detail.text ?? null,
      html: detail.html ?? null,
      messageId: detail.message_id ?? null,
      resendId: emailId,
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      // Already processed this email (webhook retry) — treat as success.
      return NextResponse.json({ ok: true });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
