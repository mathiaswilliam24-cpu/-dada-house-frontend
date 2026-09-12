import { NextRequest, NextResponse, after } from "next/server";
import { requireAuth, getAuthToken } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { appointmentSchema } from "@/lib/validations";
import { generateAppointmentNumber } from "@/lib/utils";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { sendSMS } from "@/lib/twilio";
import { sendOutboundSms } from "@/lib/messaging";
import { appointmentConfirmationHtml, adminAppointmentAlertHtml } from "@/lib/email-templates";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const appointments = await db.appointment.findMany({
    where: { userId: auth.id },
    include: { invoice: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip,
  });

  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken(req);
    const body = await req.json();

    const smsConsent = body.smsConsent === true;
    const diagnosticFee = typeof body.diagnosticFee === "number" && body.diagnosticFee > 0 ? body.diagnosticFee : null;

    const parsed = appointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const appointmentNumber = generateAppointmentNumber();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mydadahouse.com";

    if (diagnosticFee) {
      // Diagnostic flow: create appointment + invoice, send payment link, skip confirmation
      const appointment = await db.appointment.create({
        data: {
          appointmentNumber,
          userId: token?.id ?? null,
          ...parsed.data,
          preferredDate: parsed.data.preferredDate ? new Date(parsed.data.preferredDate) : null,
          status: "PENDING",
          diagnosticFee,
          diagnosticFeeStatus: "PENDING",
        },
      });

      const paymentToken = crypto.randomBytes(6).toString("hex");
      await db.invoice.create({
        data: {
          appointmentId: appointment.id,
          amount: diagnosticFee,
          status: "SENT",
          paymentToken,
          notes: `Diagnostic fee — appointment #${appointmentNumber}`,
          lineItems: {
            items: [{ description: `Diagnostic Fee — ${parsed.data.service}`, rate: diagnosticFee, qty: 1 }],
            taxEnabled: false,
            taxRate: 0,
          },
        },
      });

      const payUrl = `${baseUrl}/pay/${paymentToken}`;
      const date = parsed.data.preferredDate
        ? new Date(parsed.data.preferredDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "a date TBD";
      const timeStr = parsed.data.preferredTime ? ` at ${parsed.data.preferredTime}` : "";

      after(async () => {
        await Promise.allSettled([
          sendOutboundSms(
            parsed.data.phone,
            `DADA HOUSE: Hi ${parsed.data.name}, your ${parsed.data.service} appointment #${appointmentNumber} on ${date}${timeStr} is PENDING. Please pay the $${diagnosticFee} diagnostic fee to confirm — due at least 8 hrs before your appointment. Pay here: ${payUrl}`
          ).catch(console.error),

          resend.emails.send({
            from: FROM_EMAIL,
            to: parsed.data.email,
            subject: `Action Required: Pay Diagnostic Fee — Appointment #${appointmentNumber}`,
            html: buildDiagnosticEmail({ appointmentNumber, name: parsed.data.name, service: parsed.data.service, address: parsed.data.address, city: parsed.data.city, date, timeStr, fee: diagnosticFee, payUrl }),
          }).catch(console.error),

          process.env.ADMIN_PHONE
            ? sendSMS(
                process.env.ADMIN_PHONE,
                `DADA HOUSE DIAGNOSTIC (Web) #${appointmentNumber}\nService: ${parsed.data.service}\nClient: ${parsed.data.name}\nPhone: ${parsed.data.phone}\nFee: $${diagnosticFee}\nAddress: ${parsed.data.address}, ${parsed.data.city}${parsed.data.preferredDate ? `\nDate: ${parsed.data.preferredDate}${timeStr}` : ""}`
              ).catch(console.error)
            : Promise.resolve(),
        ]);
      });

      return NextResponse.json({ appointmentNumber, diagnosticPaymentUrl: payUrl }, { status: 201 });
    }

    // Standard flow — no diagnostic fee
    const appointment = await db.appointment.create({
      data: {
        appointmentNumber,
        userId: token?.id ?? null,
        ...parsed.data,
        preferredDate: parsed.data.preferredDate ? new Date(parsed.data.preferredDate) : null,
      },
    });

    const emailData = {
      appointmentNumber,
      name: parsed.data.name,
      service: parsed.data.service,
      subservice: parsed.data.subservice,
      address: parsed.data.address,
      city: parsed.data.city,
      preferredDate: parsed.data.preferredDate,
      preferredTime: parsed.data.preferredTime,
      description: parsed.data.description,
      phone: parsed.data.phone,
    };

    after(async () => {
      await Promise.allSettled([
        resend.emails
          .send({
            from: FROM_EMAIL,
            to: parsed.data.email,
            subject: `DADA HOUSE — Appointment #${appointmentNumber} Received`,
            html: appointmentConfirmationHtml(emailData),
          })
          .catch(console.error),

        smsConsent && parsed.data.phone
          ? sendSMS(
              parsed.data.phone,
              `DADA HOUSE: Hi ${parsed.data.name}, your appointment #${appointmentNumber} for ${parsed.data.service} has been received!${parsed.data.preferredDate ? ` Requested: ${parsed.data.preferredDate}${parsed.data.preferredTime ? ` at ${parsed.data.preferredTime}` : ""}` : ""} Our team will contact you shortly to confirm. Questions? Call (844) 928-0875.`
            ).catch(console.error)
          : Promise.resolve(),

        process.env.ADMIN_PHONE
          ? sendSMS(
              process.env.ADMIN_PHONE,
              `DADA HOUSE NEW BOOKING #${appointmentNumber}\nService: ${parsed.data.service}\nClient: ${parsed.data.name}\nPhone: ${parsed.data.phone}\nAddress: ${parsed.data.address}, ${parsed.data.city}${parsed.data.preferredDate ? `\nDate: ${parsed.data.preferredDate}${parsed.data.preferredTime ? ` at ${parsed.data.preferredTime}` : ""}` : ""}`
            ).catch(console.error)
          : Promise.resolve(),

        process.env.APPOINTMENT_ALERT_EMAIL
          ? resend.emails
              .send({
                from: FROM_EMAIL,
                to: process.env.APPOINTMENT_ALERT_EMAIL,
                subject: `[NEW BOOKING] #${appointmentNumber} — ${parsed.data.service} — ${parsed.data.name}`,
                html: adminAppointmentAlertHtml(emailData),
              })
              .catch(console.error)
          : Promise.resolve(),
      ]);
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (err) {
    console.error("Appointment creation error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function buildDiagnosticEmail({ appointmentNumber, name, service, address, city, date, timeStr, fee, payUrl }: {
  appointmentNumber: string; name: string; service: string; address: string; city: string;
  date: string; timeStr: string; fee: number; payUrl: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:#1B3FA8;padding:28px 32px;text-align:center;">
        <p style="margin:0;color:#F7921A;font-size:22px;font-weight:900;letter-spacing:1px;">DADA HOUSE</p>
        <p style="margin:4px 0 0;color:#ffffff;font-size:13px;opacity:0.8;">Appointment Pending Confirmation</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6;">Hi ${name},</p>
        <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">
          Your <strong>${service}</strong> appointment <strong>#${appointmentNumber}</strong> on <strong>${date}${timeStr}</strong>
          at <strong>${address}, ${city}</strong> is <span style="color:#F7921A;font-weight:700;">PENDING CONFIRMATION</span>.
        </p>
        <div style="background:#fff8f0;border:2px solid #F7921A;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
          <p style="margin:0 0 4px;color:#666;font-size:13px;font-weight:600;">Diagnostic Fee Required</p>
          <p style="margin:0;color:#F7921A;font-size:40px;font-weight:900;">$${fee}</p>
        </div>
        <p style="margin:0 0 20px;color:#dc2626;font-size:13px;font-weight:600;text-align:center;line-height:1.5;">
          ⚠️ Payment must be received at least 8 hours before your scheduled appointment time.<br>
          Without payment, the appointment will not be confirmed.
        </p>
        <p style="margin:0 0 24px;color:#555;font-size:13px;line-height:1.6;">
          Once your payment is received, your appointment will be confirmed and a technician will be dispatched to your location.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="${payUrl}" style="display:inline-block;background:#F7921A;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:12px;">
              Pay $${fee} Now →
            </a>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;color:#999;font-size:12px;text-align:center;">Questions? Call us at (844) 928-0875</p>
      </td></tr>
      <tr><td style="background:#f4f6fb;padding:16px 32px;text-align:center;">
        <p style="margin:0;color:#999;font-size:12px;">DADA HOUSE LLC · TX · NC · MD · (346) 649-9353</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
