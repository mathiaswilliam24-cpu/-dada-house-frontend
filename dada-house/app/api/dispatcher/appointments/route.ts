import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { generateAppointmentNumber } from "@/lib/utils";
import { sendAppointmentConfirmationEmail, sendAppointmentConfirmationSms, sendTechnicianAssignmentNotification } from "@/lib/appointment-notifications";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { sendOutboundSms } from "@/lib/messaging";
import { z } from "zod";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const schema = z.object({
  service: z.string().min(1),
  subservice: z.string().optional(),
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.union([z.literal(""), z.string().email()]).optional().default(""),
  address: z.string().min(3),
  city: z.string().min(2),
  zipCode: z.string().optional().default(""),
  description: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  technicianId: z.string().optional(),
  customerId: z.string().optional(),
  photos: z.array(z.string()).default([]),
  diagnosticFee: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = (parsed.error.issues as any[]).map(i => `${Array.isArray(i.path) ? i.path.join(".") || "root" : "?"}: ${i.message}`).join(" | ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { technicianId, diagnosticFee, ...data } = parsed.data;
  const isDiagnostic = typeof diagnosticFee === "number" && diagnosticFee > 0;
  const appointmentNumber = generateAppointmentNumber();
  const confirmationToken = crypto.randomBytes(32).toString("hex");

  const appointment = await db.appointment.create({
    data: {
      appointmentNumber,
      dispatcherId: auth.id,
      source: "dispatcher",
      confirmationToken,
      ...data,
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
      ...(technicianId ? { technicianId } : {}),
      ...(isDiagnostic ? { diagnosticFee, diagnosticFeeStatus: "PENDING" } : {}),
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mydadahouse.com";
  const confirmUrl = `${baseUrl}/confirm/${confirmationToken}`;

  if (isDiagnostic) {
    const paymentToken = crypto.randomBytes(6).toString("hex");
    await db.invoice.create({
      data: {
        appointmentId: appointment.id,
        amount: diagnosticFee!,
        status: "SENT",
        paymentToken,
        notes: `Diagnostic fee — appointment #${appointmentNumber}`,
        lineItems: {
          items: [{ description: `Diagnostic Fee — ${data.service}`, rate: diagnosticFee!, qty: 1 }],
          taxEnabled: false,
          taxRate: 0,
        },
      },
    });

    const payUrl = `${baseUrl}/pay/${paymentToken}`;
    const date = appointment.preferredDate
      ? new Date(appointment.preferredDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "a date TBD";
    const timeStr = appointment.preferredTime ? ` at ${appointment.preferredTime}` : "";

    const smsSent = await sendOutboundSms(
      appointment.phone,
      `DADA HOUSE: Your ${data.service} appt #${appointmentNumber} on ${date}${timeStr} at ${data.address}, ${data.city} is PENDING. Please pay the $${diagnosticFee} diagnostic fee to confirm — due at least 8 hrs before your appointment. Pay here: ${payUrl}`
    ).then(() => true).catch(() => false);

    let emailSent = false;
    if (data.email) {
      emailSent = await resend.emails.send({
        from: FROM_EMAIL,
        to: data.email,
        subject: `Action Required: Pay Diagnostic Fee — Appointment #${appointmentNumber}`,
        html: buildDiagnosticEmail({ appointmentNumber, name: data.name, service: data.service, address: data.address, city: data.city, date, timeStr, fee: diagnosticFee!, payUrl }),
      }).then(() => true).catch(() => false);
    }

    return NextResponse.json({ appointment, confirmUrl, emailSent, smsSent, diagnosticPaymentUrl: payUrl }, { status: 201 });
  }

  // Standard flow — no diagnostic fee
  const [emailResult, smsResult] = await Promise.allSettled([
    sendAppointmentConfirmationEmail(appointment.id),
    sendAppointmentConfirmationSms(appointment.id),
    ...(technicianId ? [sendTechnicianAssignmentNotification(appointment.id)] : []),
  ]);
  if (emailResult.status === "rejected") console.error("Appointment confirmation email failed", emailResult.reason);
  if (smsResult.status === "rejected") console.error("Appointment confirmation SMS failed", smsResult.reason);

  return NextResponse.json({
    appointment,
    confirmUrl,
    emailSent: emailResult.status === "fulfilled" && !!emailResult.value,
    smsSent: smsResult.status === "fulfilled" && !!smsResult.value,
  }, { status: 201 });
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
        <p style="margin:20px 0 0;color:#999;font-size:12px;text-align:center;">
          Questions? Call us at (844) 928-0875
        </p>
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
