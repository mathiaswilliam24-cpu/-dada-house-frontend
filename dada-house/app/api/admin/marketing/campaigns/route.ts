import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { sendSMS } from "@/lib/twilio";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const campaigns = await db.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { recipients: true } },
      recipients: {
        select: { emailStatus: true, smsStatus: true, openedAt: true },
      },
    },
  });

  const result = campaigns.map(c => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    smsText: c.smsText,
    status: c.status,
    sentAt: c.sentAt,
    createdAt: c.createdAt,
    total: c._count.recipients,
    emailSent: c.recipients.filter(r => r.emailStatus === "SENT" || r.emailStatus === "DELIVERED" || r.emailStatus === "OPENED").length,
    emailDelivered: c.recipients.filter(r => r.emailStatus === "DELIVERED" || r.emailStatus === "OPENED").length,
    emailOpened: c.recipients.filter(r => r.openedAt).length,
    emailFailed: c.recipients.filter(r => r.emailStatus === "FAILED" || r.emailStatus === "BOUNCED").length,
    smsSent: c.recipients.filter(r => r.smsStatus === "SENT" || r.smsStatus === "DELIVERED").length,
    smsDelivered: c.recipients.filter(r => r.smsStatus === "DELIVERED").length,
    smsFailed: c.recipients.filter(r => r.smsStatus === "FAILED").length,
  }));

  return NextResponse.json({ campaigns: result });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { name, subject, body, smsText, recipientFilter } = await req.json();
  if (!name) return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
  if (!subject && !smsText) return NextResponse.json({ error: "Provide an email subject or SMS text" }, { status: 400 });

  // Build recipient list
  let users: { id: string; name: string | null; email: string; phone: string | null }[] = [];

  if (recipientFilter === "all" || !recipientFilter) {
    users = await db.user.findMany({
      where: { role: "CLIENT" },
      select: { id: true, name: true, email: true, phone: true },
    });
  } else if (recipientFilter === "with_appointments") {
    users = await db.user.findMany({
      where: { role: "CLIENT", appointments: { some: {} } },
      select: { id: true, name: true, email: true, phone: true },
    });
  } else if (recipientFilter === "completed_jobs") {
    users = await db.user.findMany({
      where: { role: "CLIENT", appointments: { some: { status: "COMPLETED" } } },
      select: { id: true, name: true, email: true, phone: true },
    });
  }

  // Also include walk-in clients who have email
  const walkInAppts = await db.appointment.findMany({
    where: { userId: null },
    select: { email: true, name: true, phone: true },
    distinct: ["email"],
  });
  const walkInRecipients = walkInAppts
    .filter(a => a.email)
    .map(a => ({ id: `walkin-${a.email}`, name: a.name, email: a.email!, phone: a.phone }));

  const allRecipients = [
    ...users,
    ...walkInRecipients.filter(w => !users.find(u => u.email === w.email)),
  ];

  if (allRecipients.length === 0) {
    return NextResponse.json({ error: "No recipients found" }, { status: 400 });
  }

  // Create campaign in DB
  const campaign = await db.campaign.create({
    data: {
      name, subject: subject || null, body: body || null, smsText: smsText || null,
      status: "SENDING", sentAt: new Date(),
    },
  });

  // Create recipient rows
  const recipientRows = await db.campaignRecipient.createManyAndReturn({
    data: allRecipients.map(r => ({
      campaignId: campaign.id,
      email: r.email,
      phone: r.phone,
      name: r.name,
    })),
  });

  // Send emails in background (don't await — fire and forget per recipient)
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://dada-house.com";

  for (const recipient of recipientRows) {
    if (subject && body && recipient.email) {
      resend.emails.send({
        from: FROM_EMAIL,
        to: recipient.email,
        subject,
        html: buildEmailHtml(recipient.name ?? "Valued Customer", body, baseUrl),
        tags: [{ name: "campaign_recipient_id", value: recipient.id }],
      }).then(async (result) => {
        const emailId = (result as { data?: { id?: string } })?.data?.id ?? null;
        await db.campaignRecipient.update({
          where: { id: recipient.id },
          data: { emailStatus: "SENT", resendEmailId: emailId },
        }).catch(() => {});
      }).catch(async () => {
        await db.campaignRecipient.update({
          where: { id: recipient.id },
          data: { emailStatus: "FAILED" },
        }).catch(() => {});
      });
    }

    if (smsText && recipient.phone) {
      const twilioBaseUrl = process.env.NEXTAUTH_URL ?? "https://dada-house.com";
      sendSMS(recipient.phone, smsText, {
        statusCallback: `${twilioBaseUrl}/api/webhooks/twilio-sms?recipientId=${recipient.id}`,
      }).then(async (msg) => {
        await db.campaignRecipient.update({
          where: { id: recipient.id },
          data: { smsStatus: "SENT", twilioSid: (msg as { sid?: string })?.sid ?? null },
        }).catch(() => {});
      }).catch(async () => {
        await db.campaignRecipient.update({
          where: { id: recipient.id },
          data: { smsStatus: "FAILED" },
        }).catch(() => {});
      });
    }
  }

  // Mark campaign as SENT
  await db.campaign.update({ where: { id: campaign.id }, data: { status: "SENT" } });

  return NextResponse.json({ campaign: { id: campaign.id, total: allRecipients.length } }, { status: 201 });
}

function buildEmailHtml(name: string, body: string, baseUrl: string) {
  const bodyHtml = body.replace(/\n/g, "<br>");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#1B3FA8 0%,#F7921A 100%);padding:36px 32px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700">DADA HOUSE</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px">Houston Home Services</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 16px;color:#111827;font-size:16px;font-weight:700">Hello ${name},</p>
            <div style="color:#374151;font-size:14px;line-height:1.7">${bodyHtml}</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0">
              <tr><td align="center">
                <a href="${baseUrl}/booking" style="display:inline-block;background:#F7921A;color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 32px;border-radius:10px">
                  Book a Service →
                </a>
              </td></tr>
            </table>
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center">
              Questions? Call us at <strong style="color:#F7921A">(832) 669-6747</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:16px 32px;text-align:center">
            <p style="margin:0;color:#9ca3af;font-size:11px">DADA HOUSE · Houston Home Services · <a href="${baseUrl}/unsubscribe" style="color:#9ca3af">Unsubscribe</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
