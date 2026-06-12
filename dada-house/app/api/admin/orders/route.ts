import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const orders = await db.order.findMany({
    where: status ? { status: status as import("@/lib/generated/prisma/client").OrderStatus } : {},
    include: { items: true, user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id, status, technicianName, technicianId, jobComplete, adminConfirmed, installationPhotos } = await req.json();
  if (!id) return NextResponse.json({ error: "Order ID required" }, { status: 400 });

  const order = await db.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (technicianName !== undefined) updateData.technicianName = technicianName;
  if (technicianId !== undefined) updateData.technicianId = technicianId;
  if (jobComplete !== undefined) updateData.jobComplete = jobComplete;
  if (adminConfirmed !== undefined) updateData.adminConfirmed = adminConfirmed;
  if (installationPhotos !== undefined) updateData.installationPhotos = installationPhotos;

  const updated = await db.order.update({
    where: { id },
    data: updateData,
    include: { items: true },
  });

  const customerEmail = updated.customerEmail;
  const installDate = updated.installationDate
    ? new Date(updated.installationDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null;
  const installTime = updated.installationTime ?? "";
  const installAddr = updated.installationAddress
    ? `${updated.installationAddress}, ${updated.installationCity ?? "Houston"}`
    : "";
  const clientName = `${updated.installationFirstName ?? ""} ${updated.installationLastName ?? ""}`.trim();
  const productList = updated.items.map(i => `• ${i.productName} ×${i.quantity}`).join("<br>");

  if (customerEmail && status) {
    let subject = "";
    let bodyHtml = "";

    if (status === "PROCESSING") {
      subject = `🔄 Your Order is Being Processed — ${updated.orderNumber}`;
      bodyHtml = `<p style="font-size:15px;color:#1e293b">Hi ${clientName || "there"},</p>
        <p>Great news! Your order <strong>${updated.orderNumber}</strong> is now being processed. Our team is preparing your products for installation.</p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:16px 0">
          <p style="margin:0;color:#1d4ed8;font-size:14px">📦 ${productList}</p>
        </div>
        <p>We will reach out to confirm your installation appointment shortly.</p>`;
    } else if (status === "ASSIGNED") {
      const techName = technicianName ?? updated.technicianName ?? "—";
      subject = `👷 Technician Assigned — ${updated.orderNumber}`;
      bodyHtml = `<p style="font-size:15px;color:#1e293b">Hi ${clientName || "there"},</p>
        <p>A certified DADA HOUSE technician has been assigned to your installation job.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
          <tr><td style="padding:8px 0;color:#64748b;width:40%">Technician</td><td style="padding:8px 0;font-weight:600">${techName}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Product(s)</td><td style="padding:8px 0">${productList}</td></tr>
          ${installDate ? `<tr><td style="padding:8px 0;color:#64748b">Date</td><td style="padding:8px 0;font-weight:600">${installDate}</td></tr>` : ""}
          ${installTime ? `<tr><td style="padding:8px 0;color:#64748b">Time</td><td style="padding:8px 0;font-weight:600">${installTime}</td></tr>` : ""}
          ${installAddr ? `<tr><td style="padding:8px 0;color:#64748b">Address</td><td style="padding:8px 0;font-weight:600">${installAddr}</td></tr>` : ""}
        </table>
        <p style="font-size:14px;color:#64748b">Please ensure someone is available at the installation address during the scheduled time.</p>`;
    } else if (status === "EN_ROUTE") {
      subject = `🚗 Your Technician is On the Way — ${updated.orderNumber}`;
      bodyHtml = `<p style="font-size:15px;color:#1e293b">Hi ${clientName || "there"},</p>
        <p>Your technician <strong>${updated.technicianName ?? "from DADA HOUSE"}</strong> is now on their way to your location!</p>
        ${installAddr ? `<p style="font-size:14px;color:#475569">📍 Installation address: <strong>${installAddr}</strong></p>` : ""}
        <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:14px;margin:16px 0">
          <p style="margin:0;color:#854d0e;font-size:14px">⏱ Please be ready to receive the technician. Need help? <a href="tel:+13466499353" style="color:#F97316">+1 (346) 649-9353</a></p>
        </div>`;
    } else if (status === "ARRIVED") {
      subject = `✅ Your Technician Has Arrived — ${updated.orderNumber}`;
      bodyHtml = `<p style="font-size:15px;color:#1e293b">Hi ${clientName || "there"},</p>
        <p>Your DADA HOUSE technician <strong>${updated.technicianName ?? ""}</strong> has arrived and is ready to begin the installation.</p>
        <p style="font-size:14px;color:#475569">Questions during the installation? Call us: <a href="tel:+13466499353" style="color:#F97316">+1 (346) 649-9353</a>.</p>`;
    } else if (status === "INSTALLED") {
      subject = `🎉 Installation Complete — ${updated.orderNumber}`;
      const photosHtml = (updated.installationPhotos ?? []).length > 0
        ? `<div style="margin:16px 0"><p style="font-weight:600;color:#0A1628;margin-bottom:8px">Installation Photos:</p><div style="display:flex;flex-wrap:wrap;gap:8px">${(updated.installationPhotos ?? []).map((p: string) => `<img src="${p}" style="width:150px;height:100px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0" />`).join("")}</div></div>`
        : "";
      bodyHtml = `<p style="font-size:15px;color:#1e293b">Hi ${clientName || "there"},</p>
        <p>Your installation has been <strong>successfully completed</strong> by our certified DADA HOUSE technician!</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
          <tr><td style="padding:8px 0;color:#64748b;width:40%">Order</td><td style="padding:8px 0;font-weight:600">${updated.orderNumber}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Total Paid</td><td style="padding:8px 0;font-weight:600">${formatCurrency(updated.total)}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Technician</td><td style="padding:8px 0">${updated.technicianName ?? "DADA HOUSE Team"}</td></tr>
        </table>
        ${photosHtml}
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin:16px 0">
          <p style="margin:0;color:#166534;font-size:14px">⭐ We hope you love your new installation! Any issues within the warranty period? <a href="tel:+13466499353" style="color:#166534">+1 (346) 649-9353</a></p>
        </div>`;
    } else if (status === "CANCELLED") {
      subject = `Order Cancelled — ${updated.orderNumber}`;
      bodyHtml = `<p style="font-size:15px;color:#1e293b">Hi ${clientName || "there"},</p>
        <p>Your order <strong>${updated.orderNumber}</strong> has been cancelled. If you believe this is an error or would like to reschedule, please contact us at <a href="tel:+13466499353" style="color:#F97316">+1 (346) 649-9353</a>.</p>`;
    }

    if (subject && bodyHtml) {
      resend.emails.send({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: `${subject} | DADA HOUSE`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0A1628;padding:24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:20px">DADA <span style="color:#F97316">HOUSE</span></h1>
          </div>
          <div style="padding:28px">
            ${bodyHtml}
            <p style="margin-top:32px;font-size:12px;color:#94a3b8;text-align:center">DADA HOUSE · Houston, TX · <a href="tel:+13466499353" style="color:#F97316">+1 (346) 649-9353</a></p>
          </div>
        </div>`,
      }).catch(e => console.error("Order status email failed:", e));
    }
  }

  return NextResponse.json({ success: true, order: updated });
}
