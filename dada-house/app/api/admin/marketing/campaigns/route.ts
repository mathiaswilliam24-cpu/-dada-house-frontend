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
    flyer: c.flyer,
    flyerType: c.flyerType,
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

  const { name, subject, body, smsText, recipientFilter, flyer, flyerType } = await req.json();
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
      flyer: flyer || null, flyerType: flyerType || null,
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
        html: buildEmailHtml(recipient.name ?? "Valued Customer", body, baseUrl, flyer, flyerType),
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

function buildEmailHtml(name: string, body: string, baseUrl: string, flyer?: string | null, flyerType?: string | null) {
  const bodyHtml = body.replace(/\n\n/g, '</p><p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.75">').replace(/\n/g, "<br>");
  const isVideo = flyerType?.startsWith("video/");
  const flyerBlock = flyer ? (isVideo
    ? `<tr><td style="padding:0">
        <a href="${flyer}" target="_blank" style="display:block;position:relative;text-decoration:none">
          <div style="background:#000;text-align:center;padding:40px 20px">
            <div style="width:64px;height:64px;background:rgba(247,146,26,0.9);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
              <span style="font-size:28px">▶</span>
            </div>
            <p style="margin:0;color:#fff;font-size:14px;font-weight:600">Click to watch the video</p>
          </div>
        </a>
      </td></tr>`
    : `<tr><td style="padding:0">
        <img src="${flyer}" alt="DADA HOUSE Flyer" width="580" style="width:100%;max-width:580px;height:auto;display:block;object-fit:cover" />
      </td></tr>`)
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>DADA HOUSE</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#0F2A7A 0%,#1B3FA8 60%,#F7921A 100%);padding:32px 36px;text-align:center">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:3px;color:rgba(255,255,255,0.6);text-transform:uppercase">Houston Home Services</p>
            <h1 style="margin:0;color:#ffffff;font-size:32px;font-weight:900;letter-spacing:-1px">DADA HOUSE</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:13px">Plumbing · AC · Heating · Remodeling</p>
          </td>
        </tr>

        <!-- FLYER (image or video thumbnail) -->
        ${flyerBlock}

        <!-- GREETING BANNER -->
        <tr>
          <td style="background:#FFF8F0;border-bottom:3px solid #F7921A;padding:20px 36px">
            <p style="margin:0;color:#0F2A7A;font-size:18px;font-weight:800">Hello ${name}! 👋</p>
            <p style="margin:4px 0 0;color:#6B7280;font-size:13px">We have something special for you today.</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:32px 36px">
            <p style="margin:0 0 14px;color:#374151;font-size:15px;line-height:1.75">${bodyHtml}</p>
          </td>
        </tr>

        <!-- CTA BUTTONS -->
        <tr>
          <td style="padding:0 36px 36px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:12px">
                  <a href="${baseUrl}/booking"
                     style="display:block;background:linear-gradient(135deg,#F7921A,#e07210);color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;padding:16px 32px;border-radius:12px;letter-spacing:0.3px;text-align:center">
                    📅 Book a Service Now
                  </a>
                </td>
              </tr>
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="48%" style="padding-right:6px">
                        <a href="tel:+18326696747"
                           style="display:block;background:#0F2A7A;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 16px;border-radius:12px;text-align:center">
                          📞 Call Us
                        </a>
                      </td>
                      <td width="4%"></td>
                      <td width="48%" style="padding-left:6px">
                        <a href="sms:+18326696747"
                           style="display:block;background:#059669;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:14px 16px;border-radius:12px;text-align:center">
                          💬 Text Us
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- TRUST BAR -->
        <tr>
          <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 36px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" width="33%">
                  <p style="margin:0;font-size:20px">⭐</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#6B7280;font-weight:600">5-Star Rated</p>
                </td>
                <td align="center" width="33%">
                  <p style="margin:0;font-size:20px">🔧</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#6B7280;font-weight:600">Licensed &amp; Insured</p>
                </td>
                <td align="center" width="33%">
                  <p style="margin:0;font-size:20px">🚀</p>
                  <p style="margin:2px 0 0;font-size:11px;color:#6B7280;font-weight:600">Same-Day Service</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#0F2A7A;padding:20px 36px;text-align:center">
            <p style="margin:0 0 6px;color:rgba(255,255,255,0.9);font-size:13px;font-weight:700">DADA HOUSE · Houston, TX</p>
            <p style="margin:0 0 10px;color:rgba(255,255,255,0.6);font-size:12px">
              <a href="tel:+18326696747" style="color:#F7921A;text-decoration:none">(832) 669-6747</a>
              &nbsp;·&nbsp;
              <a href="${baseUrl}" style="color:rgba(255,255,255,0.6);text-decoration:none">dada-house.com</a>
            </p>
            <p style="margin:0;color:rgba(255,255,255,0.35);font-size:10px">
              You received this because you are a DADA HOUSE client.
              &nbsp;<a href="${baseUrl}/unsubscribe" style="color:rgba(255,255,255,0.35)">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
