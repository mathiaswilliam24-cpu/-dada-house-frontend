import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resend, FROM_EMAIL } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { firstName, lastName, address, city, phone, date, time } = await req.json();

  if (!date || !time) return NextResponse.json({ error: "Date and time are required." }, { status: 400 });

  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status === "CANCELLED") return NextResponse.json({ error: "This order has been cancelled." }, { status: 400 });

  // Re-check availability
  const installDate = new Date(date);
  const dayStart = new Date(installDate); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(installDate); dayEnd.setHours(23, 59, 59, 999);

  const [appointments, orders] = await Promise.all([
    db.appointment.findMany({
      where: {
        preferredDate: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["CANCELLED"] },
        preferredTime: time,
      },
      select: { id: true },
    }),
    db.order.findMany({
      where: {
        installationDate: { gte: dayStart, lte: dayEnd },
        installationTime: time,
        status: { notIn: ["CANCELLED"] },
        id: { not: id },
      },
      select: { id: true },
    }),
  ]);

  if (appointments.length + orders.length >= 2) {
    return NextResponse.json({ error: "This time slot is no longer available. Please choose another time." }, { status: 409 });
  }

  const updated = await db.order.update({
    where: { id },
    data: {
      installationFirstName: firstName,
      installationLastName: lastName,
      installationAddress: address,
      installationCity: city ?? "Houston",
      installationDate: installDate,
      installationTime: time,
      customerPhone: phone ?? order.customerPhone,
      status: "CONFIRMED",
    },
    include: { items: true },
  });

  const customerEmail = updated.customerEmail;
  if (customerEmail) {
    const productList = updated.items.map(i => `• ${i.productName} ×${i.quantity}`).join("<br>");
    resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `📅 Installation Scheduled — ${updated.orderNumber} | DADA HOUSE`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#0A1628;padding:28px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">DADA <span style="color:#F97316">HOUSE</span></h1>
        </div>
        <div style="padding:28px">
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:18px;margin-bottom:24px;text-align:center">
            <p style="font-size:32px;margin:0">📅</p>
            <h2 style="color:#9a3412;margin:8px 0 4px;font-size:18px">Installation Appointment Confirmed!</h2>
            <p style="color:#9a3412;margin:0;font-size:14px">Order <strong>${updated.orderNumber}</strong></p>
          </div>
          <h3 style="margin:0 0 12px;color:#0A1628">Appointment Details</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:8px 0;color:#64748b;width:40%">Date</td><td style="padding:8px 0;font-weight:600">${date}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Time</td><td style="padding:8px 0;font-weight:600">${time}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Address</td><td style="padding:8px 0;font-weight:600">${address}, ${city ?? "Houston"}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b">Contact</td><td style="padding:8px 0;font-weight:600">${firstName} ${lastName}</td></tr>
          </table>
          <div style="margin-top:20px;padding:14px;background:#f8fafc;border-radius:8px">
            <p style="margin:0 0 8px;font-weight:600;color:#0A1628">Products to Install:</p>
            <p style="margin:0;color:#475569;font-size:14px;line-height:1.8">${productList}</p>
          </div>
          <div style="margin-top:20px;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
            <p style="margin:0;color:#166534;font-size:14px">🔧 Our certified technician will contact you before the visit. Please ensure someone is available at the installation address during the scheduled time.</p>
          </div>
          <p style="margin-top:24px;font-size:12px;color:#94a3b8;text-align:center">Questions? <a href="tel:+13466499353" style="color:#F97316">+1 (346) 649-9353</a> · DADA HOUSE · Houston, TX</p>
        </div>
      </div>`,
    }).catch(e => console.error("Schedule confirmation email failed:", e));
  }

  return NextResponse.json({ success: true, orderId: updated.id });
}
