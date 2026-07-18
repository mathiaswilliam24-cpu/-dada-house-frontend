import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { resend, FROM_EMAIL } from "@/lib/resend";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const appointment = await db.appointment.findUnique({
    where: { id },
    select: { id: true, appointmentNumber: true, name: true, email: true, service: true, preferredDate: true, preferredTime: true, address: true, city: true, status: true, confirmationToken: true },
  });

  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  if (appointment.status === "CONFIRMED") return NextResponse.json({ error: "Already confirmed" }, { status: 400 });

  // Generate or reuse token
  const token = appointment.confirmationToken ?? crypto.randomBytes(32).toString("hex");

  await db.appointment.update({
    where: { id },
    data: { confirmationToken: token },
  });

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
        <!-- Header -->
        <tr><td style="background:#1B3FA8;padding:28px 32px;text-align:center;">
          <p style="margin:0;color:#F7921A;font-size:22px;font-weight:900;letter-spacing:1px;">DADA HOUSE</p>
          <p style="margin:4px 0 0;color:#ffffff;font-size:13px;opacity:0.8;">Heating & Air Conditioning</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1B3FA8;">Confirm your appointment</p>
          <p style="margin:0 0 24px;color:#555;font-size:14px;line-height:1.6;">
            Hi ${appointment.name}, your appointment <strong>#${appointment.appointmentNumber}</strong> is ready to be confirmed. Please click the button below to confirm.
          </p>
          <!-- Details box -->
          <table width="100%" style="background:#f8faff;border-radius:12px;padding:16px;margin-bottom:24px;">
            <tr><td style="padding:4px 0;color:#666;font-size:13px;"><strong style="color:#1B3FA8;">Service:</strong> ${appointment.service}</td></tr>
            <tr><td style="padding:4px 0;color:#666;font-size:13px;"><strong style="color:#1B3FA8;">Date:</strong> ${date}${time ? ` at ${time}` : ""}</td></tr>
            <tr><td style="padding:4px 0;color:#666;font-size:13px;"><strong style="color:#1B3FA8;">Address:</strong> ${appointment.address}, ${appointment.city}</td></tr>
          </table>
          <!-- CTA button -->
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
        <!-- Footer -->
        <tr><td style="background:#f4f6fb;padding:16px 32px;text-align:center;">
          <p style="margin:0;color:#999;font-size:12px;">DADA HOUSE LLC · Houston, TX · (346) 649-9353</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: appointment.email,
    subject: `DADA HOUSE — Please confirm your appointment #${appointment.appointmentNumber}`,
    html,
  });

  return NextResponse.json({ success: true, confirmUrl });
}
