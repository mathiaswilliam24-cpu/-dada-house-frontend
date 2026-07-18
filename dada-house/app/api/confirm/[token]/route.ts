import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resend, FROM_EMAIL } from "@/lib/resend";

export const dynamic = "force-dynamic";

async function getAppt(token: string) {
  return db.appointment.findFirst({
    where: { confirmationToken: token },
    select: {
      id: true, status: true, name: true, email: true, phone: true,
      appointmentNumber: true, service: true, subservice: true,
      preferredDate: true, preferredTime: true,
      address: true, city: true, zipCode: true, description: true,
      confirmedAt: true,
      technician: { select: { id: true, name: true, email: true } },
      dispatcher: { select: { id: true, name: true, email: true } },
    },
  });
}

// GET — return appointment details (no auto-confirm)
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appointment = await getAppt(token);
  if (!appointment) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  return NextResponse.json({ appointment });
}

// POST — client confirms the appointment
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appointment = await getAppt(token);
  if (!appointment) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  if (appointment.status !== "CONFIRMED") {
    await db.appointment.update({
      where: { id: appointment.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
  }

  const date = appointment.preferredDate
    ? new Date(appointment.preferredDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "To be scheduled";
  const time = appointment.preferredTime ?? "";
  const apptNum = appointment.appointmentNumber;

  // Emails to send (fire-and-forget)
  const emails: Promise<unknown>[] = [];

  // Admin
  if (process.env.APPOINTMENT_ALERT_EMAIL) {
    emails.push(resend.emails.send({
      from: FROM_EMAIL,
      to: process.env.APPOINTMENT_ALERT_EMAIL,
      subject: `✅ CLIENT CONFIRMED — #${apptNum} — ${appointment.service} — ${appointment.name}`,
      html: notifHtml({ apptNum, name: appointment.name, phone: appointment.phone, service: appointment.service, date, time, address: appointment.address, city: appointment.city, role: "Admin", action: "confirmed" }),
    }).catch(console.error));
  }

  // Dispatcher
  if (appointment.dispatcher?.email) {
    emails.push(resend.emails.send({
      from: FROM_EMAIL,
      to: appointment.dispatcher.email,
      subject: `✅ Client confirmed job #${apptNum} — ${appointment.service}`,
      html: notifHtml({ apptNum, name: appointment.name, phone: appointment.phone, service: appointment.service, date, time, address: appointment.address, city: appointment.city, role: `Dispatcher (${appointment.dispatcher.name ?? ""})`, action: "confirmed" }),
    }).catch(console.error));
  }

  // Technician
  if (appointment.technician?.email) {
    emails.push(resend.emails.send({
      from: FROM_EMAIL,
      to: appointment.technician.email,
      subject: `✅ Your job #${apptNum} is confirmed — ${appointment.service}`,
      html: notifHtml({ apptNum, name: appointment.name, phone: appointment.phone, service: appointment.service, date, time, address: appointment.address, city: appointment.city, role: `Technician (${appointment.technician.name ?? ""})`, action: "confirmed" }),
    }).catch(console.error));
  }

  await Promise.allSettled(emails);
  return NextResponse.json({ success: true });
}

// PATCH — client modifies appointment info
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appointment = await getAppt(token);
  if (!appointment) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  const body = await req.json();
  const { preferredDate, preferredTime, description } = body as Record<string, string>;

  await db.appointment.update({
    where: { id: appointment.id },
    data: {
      ...(preferredDate !== undefined ? { preferredDate: preferredDate ? new Date(preferredDate) : null } : {}),
      ...(preferredTime !== undefined ? { preferredTime } : {}),
      ...(description !== undefined ? { description } : {}),
    },
  });

  const apptNum = appointment.appointmentNumber;
  const newDate = preferredDate
    ? new Date(preferredDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : appointment.preferredDate
      ? new Date(appointment.preferredDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : "To be scheduled";
  const newTime = preferredTime ?? appointment.preferredTime ?? "";

  const changeLines = [
    preferredDate !== undefined && `Date: ${newDate}`,
    preferredTime !== undefined && `Time: ${newTime || "Any time"}`,
    description !== undefined && `Notes: ${description || "(cleared)"}`,
  ].filter(Boolean).join("<br>");

  const emails: Promise<unknown>[] = [];

  if (process.env.APPOINTMENT_ALERT_EMAIL) {
    emails.push(resend.emails.send({
      from: FROM_EMAIL,
      to: process.env.APPOINTMENT_ALERT_EMAIL,
      subject: `✏️ Client modified appointment #${apptNum} — ${appointment.name}`,
      html: notifHtml({ apptNum, name: appointment.name, phone: appointment.phone, service: appointment.service, date: newDate, time: newTime, address: appointment.address, city: appointment.city, role: "Admin", action: "modified", changes: changeLines }),
    }).catch(console.error));
  }

  if (appointment.dispatcher?.email) {
    emails.push(resend.emails.send({
      from: FROM_EMAIL,
      to: appointment.dispatcher.email,
      subject: `✏️ Client modified job #${apptNum} — ${appointment.service}`,
      html: notifHtml({ apptNum, name: appointment.name, phone: appointment.phone, service: appointment.service, date: newDate, time: newTime, address: appointment.address, city: appointment.city, role: `Dispatcher (${appointment.dispatcher.name ?? ""})`, action: "modified", changes: changeLines }),
    }).catch(console.error));
  }

  await Promise.allSettled(emails);
  return NextResponse.json({ success: true });
}

// ── HTML email helper ──────────────────────────────────────────────────────
function notifHtml({ apptNum, name, phone, service, date, time, address, city, role, action, changes }: {
  apptNum: string; name: string; phone: string; service: string;
  date: string; time: string; address: string; city: string;
  role: string; action: "confirmed" | "modified"; changes?: string;
}) {
  const isConfirm = action === "confirmed";
  const color = isConfirm ? "#16a34a" : "#d97706";
  const label = isConfirm ? "✅ Appointment Confirmed by Client" : "✏️ Appointment Modified by Client";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr><td style="background:#1B3FA8;padding:24px 32px;text-align:center;">
          <p style="margin:0;color:#F7921A;font-size:22px;font-weight:900;">DADA HOUSE</p>
          <p style="margin:4px 0 0;color:#fff;font-size:13px;opacity:.8;">Home Services</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:${color};">${label}</p>
          <p style="margin:0 0 20px;color:#666;font-size:13px;">Hello ${role} — appointment <strong>#${apptNum}</strong> has been <strong>${action}</strong> by the client.</p>
          <table width="100%" style="background:#f8faff;border-radius:12px;padding:16px;margin-bottom:${changes ? "16px" : "0"};">
            <tr><td style="padding:4px 0;color:#555;font-size:13px;"><strong style="color:#1B3FA8;">Client:</strong> ${name} · ${phone}</td></tr>
            <tr><td style="padding:4px 0;color:#555;font-size:13px;"><strong style="color:#1B3FA8;">Service:</strong> ${service}</td></tr>
            <tr><td style="padding:4px 0;color:#555;font-size:13px;"><strong style="color:#1B3FA8;">Date:</strong> ${date}${time ? ` at ${time}` : ""}</td></tr>
            <tr><td style="padding:4px 0;color:#555;font-size:13px;"><strong style="color:#1B3FA8;">Address:</strong> ${address}, ${city}</td></tr>
          </table>
          ${changes ? `<table width="100%" style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;"><tr><td style="color:#92400e;font-size:13px;"><strong>Changes made:</strong><br>${changes}</td></tr></table>` : ""}
        </td></tr>
        <tr><td style="background:#f4f6fb;padding:16px 32px;text-align:center;">
          <p style="margin:0;color:#999;font-size:12px;">DADA HOUSE LLC · Houston, TX · (346) 649-9353</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
