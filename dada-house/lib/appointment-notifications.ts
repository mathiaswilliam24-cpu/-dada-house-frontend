import { db } from "@/lib/db";
import { sendTrackedEmail } from "@/lib/customer-email";
import { sendOutboundSms, DoNotContactError } from "@/lib/messaging";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { sendSMS } from "@/lib/twilio";
import crypto from "crypto";

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "To be scheduled";
}

/**
 * Sends (or re-sends) the customer-facing "please confirm your appointment" email.
 * Shared by the dispatcher creation flow (auto-send) and the manual "Send
 * Confirmation Email" button (re-send) so both paths render identical content.
 */
export async function sendAppointmentConfirmationEmail(appointmentId: string) {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true, appointmentNumber: true, name: true, email: true, service: true,
      preferredDate: true, preferredTime: true, address: true, city: true,
      confirmationToken: true, customerId: true,
      technician: { select: { name: true } },
    },
  });
  if (!appointment || !appointment.email) return null;

  const token = appointment.confirmationToken ?? crypto.randomBytes(32).toString("hex");
  if (!appointment.confirmationToken) {
    await db.appointment.update({ where: { id: appointmentId }, data: { confirmationToken: token } });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mydadahouse.com";
  const confirmUrl = `${baseUrl}/confirm/${token}`;

  const date = appointment.preferredDate
    ? new Date(appointment.preferredDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "To be scheduled";
  const time = appointment.preferredTime ?? "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#1B3FA8;padding:28px 32px;text-align:center;">
          <p style="margin:0;color:#F7921A;font-size:22px;font-weight:900;letter-spacing:1px;">DADA HOUSE</p>
          <p style="margin:4px 0 0;color:#ffffff;font-size:13px;opacity:0.8;">Heating & Air Conditioning</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1B3FA8;">Confirm your appointment</p>
          <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
            Hi ${appointment.name}, your appointment <strong>#${appointment.appointmentNumber}</strong> is ready to be confirmed. Please click the button below to confirm.
          </p>
          <table width="100%" style="background:#f8faff;border-radius:12px;padding:16px;margin-bottom:24px;">
            <tr><td style="padding:4px 0;color:#666;font-size:13px;"><strong style="color:#1B3FA8;">Service:</strong> ${appointment.service}</td></tr>
            <tr><td style="padding:4px 0;color:#666;font-size:13px;"><strong style="color:#1B3FA8;">Date:</strong> ${date}${time ? ` at ${time}` : ""}</td></tr>
            <tr><td style="padding:4px 0;color:#666;font-size:13px;"><strong style="color:#1B3FA8;">Address:</strong> ${appointment.address}, ${appointment.city}</td></tr>
            ${appointment.technician?.name ? `<tr><td style="padding:4px 0;color:#666;font-size:13px;"><strong style="color:#1B3FA8;">Technician:</strong> ${appointment.technician.name}</td></tr>` : ""}
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${confirmUrl}" style="display:inline-block;background:#F7921A;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.5px;">
                ✅ Confirm My Appointment
              </a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;color:#999;font-size:12px;text-align:center;">
            Or copy this link: <a href="${confirmUrl}" style="color:#1B3FA8;">${confirmUrl}</a>
          </p>
        </td></tr>
        <tr><td style="background:#f4f6fb;padding:16px 32px;text-align:center;">
          <p style="margin:0;color:#999;font-size:12px;">DADA HOUSE LLC · TX · NC · MD · (844) 928-0875</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendTrackedEmail({
    to: appointment.email,
    subject: `DADA HOUSE — Please confirm your appointment #${appointment.appointmentNumber}`,
    html,
    customerId: appointment.customerId,
  });

  return { confirmUrl };
}

/** Sends the customer-facing appointment confirmation SMS (DNC-checked, thread-logged via lib/messaging). */
export async function sendAppointmentConfirmationSms(appointmentId: string) {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      phone: true, appointmentNumber: true, service: true, address: true, city: true,
      preferredDate: true, preferredTime: true, description: true,
      technician: { select: { name: true } },
    },
  });
  if (!appointment?.phone) return null;

  const date = appointment.preferredDate
    ? new Date(appointment.preferredDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "a date to be scheduled";
  const time = appointment.preferredTime ? ` at ${appointment.preferredTime}` : "";
  const techLine = appointment.technician?.name ? ` Technician: ${appointment.technician.name}.` : "";

  const descLine = appointment.description ? ` Notes: ${appointment.description}.` : "";
  const body = `DADA HOUSE: Your appointment #${appointment.appointmentNumber} (${appointment.service}) is booked for ${date}${time} at ${appointment.address}, ${appointment.city}.${techLine}${descLine} We'll confirm by email/text with any updates.`;

  try {
    return await sendOutboundSms(appointment.phone, body);
  } catch (err) {
    if (err instanceof DoNotContactError) return null;
    throw err;
  }
}

/**
 * Notifies the assigned technician (SMS + email) with everything they need to
 * head to the job: client name/phone, address, date/time, service. Shared by
 * the "create appointment with technician" flow and the standalone assign flow
 * so both paths send the same complete notification.
 */
export async function sendTechnicianAssignmentNotification(appointmentId: string) {
  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      appointmentNumber: true, name: true, phone: true, address: true, city: true,
      service: true, preferredDate: true, preferredTime: true, diagnosticFee: true,
      technician: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
  if (!appointment?.technician) return null;

  const { technician } = appointment;
  const date = fmtDate(appointment.preferredDate);
  const time = appointment.preferredTime ? ` at ${appointment.preferredTime}` : "";
  const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dada-house.com"}/technician/jobs/${appointmentId}`;

  const diagLine = appointment.diagnosticFee ? ` 🔍 DIAGNOSTIC JOB.` : "";
  const smsBody = `DADA HOUSE: New job assigned — #${appointment.appointmentNumber}.${diagLine} Client: ${appointment.name} (${appointment.phone}). Service: ${appointment.service}. Address: ${appointment.address}, ${appointment.city}. Date: ${date}${time}.`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#1B3FA8;padding:28px 32px;text-align:center;">
          <p style="margin:0;color:#F7921A;font-size:22px;font-weight:900;letter-spacing:1px;">DADA HOUSE</p>
          <p style="margin:4px 0 0;color:#ffffff;font-size:13px;opacity:0.8;">New Job Assigned</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6;">
            Hi ${technician.name ?? "there"}, you've been assigned a new job — <strong>#${appointment.appointmentNumber}</strong>.
          </p>
          ${appointment.diagnosticFee ? `<div style="background:#fff8f0;border:2px solid #F7921A;border-radius:10px;padding:12px 16px;margin-bottom:16px;text-align:center;"><p style="margin:0;color:#F7921A;font-size:15px;font-weight:800;">🔍 DIAGNOSTIC JOB</p></div>` : ""}
          <table width="100%" style="background:#f8faff;border-radius:12px;padding:16px;margin-bottom:24px;">
            <tr><td style="padding:4px 0;color:#666;font-size:13px;"><strong style="color:#1B3FA8;">Client:</strong> ${appointment.name}</td></tr>
            <tr><td style="padding:4px 0;color:#666;font-size:13px;"><strong style="color:#1B3FA8;">Phone:</strong> ${appointment.phone}</td></tr>
            <tr><td style="padding:4px 0;color:#666;font-size:13px;"><strong style="color:#1B3FA8;">Service:</strong> ${appointment.service}</td></tr>
            <tr><td style="padding:4px 0;color:#666;font-size:13px;"><strong style="color:#1B3FA8;">Address:</strong> ${appointment.address}, ${appointment.city}</td></tr>
            <tr><td style="padding:4px 0;color:#666;font-size:13px;"><strong style="color:#1B3FA8;">Date:</strong> ${date}${time}</td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${jobUrl}" style="display:inline-block;background:#F7921A;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.5px;">
                View Job Details
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f4f6fb;padding:16px 32px;text-align:center;">
          <p style="margin:0;color:#999;font-size:12px;">DADA HOUSE LLC · TX · NC · MD · (844) 928-0875</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const [smsResult, emailResult] = await Promise.allSettled([
    technician.phone ? sendSMS(technician.phone, smsBody) : Promise.resolve(null),
    resend.emails.send({
      from: FROM_EMAIL,
      to: technician.email,
      subject: `New Job Assigned — #${appointment.appointmentNumber} · ${appointment.service}`,
      html,
    }),
  ]);
  if (smsResult.status === "rejected") console.error("Technician assignment SMS failed", smsResult.reason);
  if (emailResult.status === "rejected") console.error("Technician assignment email failed", emailResult.reason);

  return { smsSent: smsResult.status === "fulfilled", emailSent: emailResult.status === "fulfilled" };
}
