import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { resend, FROM_EMAIL } from "@/lib/resend";

export const dynamic = "force-dynamic";

// GET — fetch invoice by payment token (public)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invoice = await db.estimate.findUnique({
    where: { paymentToken: token },
    select: {
      id: true,
      estimateNumber: true,
      clientName: true,
      clientEmail: true,
      total: true,
      subtotal: true,
      taxType: true,
      taxRate: true,
      taxLabel: true,
      taxInclusive: true,
      discountType: true,
      discountValue: true,
      lineItems: true,
      additionalDetails: true,
      templateColor: true,
      paidAt: true,
      paymentMethod: true,
      sentByName: true,
      isInvoice: true,
    },
  });

  if (!invoice || !invoice.isInvoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ invoice });
}

// POST — handle payment actions
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const invoice = await db.estimate.findUnique({ where: { paymentToken: token } });

  if (!invoice || !invoice.isInvoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.paidAt) {
    return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "create-intent") {
    const stripe = getStripe();
    const amountCents = Math.round(invoice.total * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      description: `DADA HOUSE Invoice #${invoice.estimateNumber}`,
      metadata: { invoiceId: invoice.id, estimateNumber: invoice.estimateNumber },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  }

  if (action === "card-paid") {
    // Called after Stripe confirms payment on the client
    const { paymentIntentId } = body;
    if (!paymentIntentId) return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });

    // Verify payment with Stripe
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") {
      return NextResponse.json({ error: "Payment not succeeded" }, { status: 400 });
    }

    await db.estimate.update({
      where: { id: invoice.id },
      data: { paidAt: new Date(), status: "CLOSED", paymentMethod: "CARD" },
    });

    if (invoice.clientEmail) {
      const lineItems = (invoice.lineItems as Array<{ desc: string; rate: number; qty: number; amount: number }>) ?? [];
      const clientEmail = invoice.clientEmail;
      after(() => sendReceiptEmail({ ...invoice, clientEmail }, lineItems, "CARD").catch(console.error));
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function sendReceiptEmail(
  inv: { estimateNumber: string; clientName: string; total: number; clientEmail: string },
  lineItems: Array<{ desc: string; rate: number; qty: number; amount: number }>,
  method: string
) {
  const methodLabel = method === "CARD" ? "Credit/Debit Card" : method === "ZELLE" ? "Zelle" : "Cash";
  const itemRows = lineItems.map((item) =>
    `<tr><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0">${item.desc}</td><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold">$${item.amount.toFixed(2)}</td></tr>`
  ).join("");

  await resend.emails.send({
    from: FROM_EMAIL,
    to: inv.clientEmail,
    subject: `Payment Received — Invoice ${inv.estimateNumber} · DADA HOUSE`,
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#059669;padding:24px;border-radius:8px 8px 0 0;text-align:center">
    <h1 style="color:white;margin:0;font-size:24px">✓ Payment Received</h1>
    <p style="color:#a7f3d0;margin:4px 0 0">DADA HOUSE · Premier Home Services</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p>Dear ${inv.clientName},</p>
    <p>Thank you for your payment! Invoice #${inv.estimateNumber} is now paid.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0;font-size:13px;color:#166534"><strong>Payment method:</strong> ${methodLabel}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#166534"><strong>Amount paid:</strong> $${inv.total.toFixed(2)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#166534"><strong>Date:</strong> ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tbody>${itemRows}</tbody>
      <tfoot><tr><td style="padding:12px 4px;border-top:2px solid #1B3FA8;font-weight:bold;color:#1B3FA8">Total Paid</td><td style="padding:12px 4px;border-top:2px solid #1B3FA8;text-align:right;font-weight:bold;font-size:18px;color:#1B3FA8">$${inv.total.toFixed(2)}</td></tr></tfoot>
    </table>
    <p>We appreciate your business. For any questions: 📞 (346) 649-9353</p>
    <p style="color:#6b7280;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">DADA HOUSE · 7001 South Texas 6 STE 246, Houston, TX 77083</p>
  </div></body></html>`,
  });
}
