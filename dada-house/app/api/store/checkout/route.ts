import { NextRequest, NextResponse } from "next/server";
import { getAuthToken } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { formatCurrency } from "@/lib/utils";

interface CheckoutItem {
  productId: string;
  quantity: number;
  price?: number;
  productName?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { items, shippingAddress, shipping } = await req.json();
    if (!items?.length) return NextResponse.json({ error: "No items" }, { status: 400 });

    const token = await getAuthToken(req);
    const addr = shippingAddress ?? shipping ?? null;

    const productIds: string[] = items.map((i: CheckoutItem) => i.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds } } });

    const subtotal = items.reduce((sum: number, item: CheckoutItem) => {
      const p = products.find((p) => p.id === item.productId);
      return sum + (p?.price ?? item.price ?? 0) * item.quantity;
    }, 0);

    const taxSettings = await db.setting.findMany({ where: { key: { in: ["store.taxEnabled", "store.taxRate"] } } });
    const taxMap = Object.fromEntries(taxSettings.map(s => [s.key, s.value]));
    const taxEnabled = taxMap["store.taxEnabled"] !== "false";
    const taxRate = parseFloat(taxMap["store.taxRate"] ?? "8.25") / 100;
    const tax = taxEnabled ? subtotal * taxRate : 0;
    const total = subtotal + tax;

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const order = await db.order.create({
      data: {
        orderNumber,
        userId: token?.id ?? null,
        status: "PENDING",
        subtotal,
        tax,
        shipping: 0,
        total,
        shippingAddress: addr,
        customerEmail: addr?.email ?? null,
        customerPhone: addr?.phone ?? null,
        items: {
          create: items.map((item: CheckoutItem) => {
            const p = products.find((p) => p.id === item.productId);
            return {
              productId: item.productId,
              quantity: item.quantity,
              price: p?.price ?? item.price ?? 0,
              productName: p?.name ?? item.productName ?? "",
            };
          }),
        },
      },
      include: { items: true },
    });

    // Instant receipt email
    const customerEmail = addr?.email;
    if (customerEmail) {
      const itemsHtml = order.items.map(i =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px">${i.productName}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;font-size:14px">×${i.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;font-size:14px">${formatCurrency(i.price * i.quantity)}</td>
        </tr>`
      ).join("");

      resend.emails.send({
        from: FROM_EMAIL,
        to: customerEmail,
        subject: `✅ Order Confirmed — ${orderNumber} | DADA HOUSE`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0A1628;padding:28px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:22px">DADA <span style="color:#F97316">HOUSE</span></h1>
          </div>
          <div style="padding:28px">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:18px;margin-bottom:24px;text-align:center">
              <p style="font-size:28px;margin:0">✅</p>
              <h2 style="color:#166534;margin:8px 0 4px;font-size:18px">Payment Confirmed!</h2>
              <p style="color:#166534;margin:0;font-size:14px">Order <strong>${orderNumber}</strong></p>
            </div>
            <h3 style="margin:0 0 12px;color:#0A1628">Your Order</h3>
            <table style="width:100%;border-collapse:collapse">
              <tbody>${itemsHtml}</tbody>
              <tfoot>
                <tr><td colspan="2" style="padding:6px 0;text-align:right;color:#64748b;font-size:13px">Subtotal</td><td style="padding:6px 0;text-align:right;font-size:13px">${formatCurrency(subtotal)}</td></tr>
                <tr><td colspan="2" style="padding:6px 0;text-align:right;color:#64748b;font-size:13px">Tax (8.25%)</td><td style="padding:6px 0;text-align:right;font-size:13px">${formatCurrency(tax)}</td></tr>
                <tr style="background:#f8fafc"><td colspan="2" style="padding:10px 8px;text-align:right;font-weight:700">Total Paid</td><td style="padding:10px 8px;text-align:right;font-weight:700;color:#0A1628">${formatCurrency(total)}</td></tr>
              </tfoot>
            </table>
            <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:18px;margin-top:24px">
              <h3 style="color:#9a3412;margin:0 0 8px;font-size:15px">🔧 Next Step: Schedule Your Installation</h3>
              <p style="color:#9a3412;margin:0;font-size:14px">Our certified technician will install your product at your address. Please schedule your installation appointment.</p>
            </div>
            <p style="margin-top:24px;font-size:12px;color:#94a3b8;text-align:center">Questions? <a href="tel:+13466499353" style="color:#F97316">+1 (346) 649-9353</a> · DADA HOUSE · Houston, TX</p>
          </div>
        </div>`,
      }).catch(e => console.error("Receipt email failed:", e));
    }

    return NextResponse.json({ success: true, orderId: order.id, orderNumber });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}
