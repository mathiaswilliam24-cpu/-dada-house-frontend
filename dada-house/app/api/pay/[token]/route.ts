import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { sendOutboundSms } from "@/lib/messaging";
import type { Prisma } from "@/lib/generated/prisma/client";

export const dynamic = "force-dynamic";

const CARD_FEE_RATE = 0.03;

type LI = { description?: string; note?: string; rate: number; qty: number };

function parseInvoiceLineItems(raw: unknown, fallbackService: string, fallbackAmount: number) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const m = raw as Record<string, unknown>;
    if (Array.isArray(m.items) && m.items.length > 0) {
      return {
        taxEnabled: m.taxEnabled !== false,
        taxRate: typeof m.taxRate === "number" ? m.taxRate : 8.25,
        items: m.items as LI[],
      };
    }
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return { taxEnabled: true, taxRate: 8.25, items: raw as LI[] };
  }
  return { taxEnabled: true, taxRate: 8.25, items: [{ description: fallbackService, rate: fallbackAmount, qty: 1 }] };
}

function computeInvoiceTotal(raw: unknown, fallbackService: string, fallbackAmount: number) {
  const { taxEnabled, taxRate, items } = parseInvoiceLineItems(raw, fallbackService, fallbackAmount);
  const subtotal = items.reduce((s, i) => s + i.rate * i.qty, 0);
  const tax = taxEnabled ? (subtotal * taxRate) / 100 : 0;
  return { items, total: subtotal + tax };
}

/** Card network rules (and federal law, for debit) only allow a surcharge on
 *  CREDIT cards — never debit or prepaid, even when run "as credit". We can't
 *  know which the customer is using until the card is tokenized, so the fee is
 *  computed here, server-side, after tokenization but before the charge — never
 *  assumed up front. */
async function chargeCard(paymentMethodId: string, total: number, description: string, metadata: Record<string, string>) {
  const stripe = getStripe();
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  const funding = pm.card?.funding ?? "unknown";
  const isCredit = funding === "credit";
  const cardFee = isCredit ? Math.round(total * CARD_FEE_RATE * 100) / 100 : 0;
  const chargeTotal = total + cardFee;

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(chargeTotal * 100),
    currency: "usd",
    payment_method: paymentMethodId,
    payment_method_types: ["card"],
    confirm: true,
    description,
    metadata: { ...metadata, cardFunding: funding, cardFee: String(cardFee) },
  });

  return { intent, cardFee, chargeTotal, funding };
}

/** Cash App Pay has no card-network fee to pass through — charged at face value. */
async function createCashAppIntent(total: number, description: string, metadata: Record<string, string>) {
  const stripe = getStripe();
  return stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency: "usd",
    payment_method_types: ["cashapp"],
    description,
    metadata,
  });
}

// GET — fetch invoice by payment token (public). Checks the technician/estimate
// invoice model first (the original owner of this payment page), then falls back
// to the call-center admin Invoice model — both use the same `paymentToken` pattern.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const estimate = await db.estimate.findUnique({
    where: { paymentToken: token },
    select: {
      id: true, estimateNumber: true, clientName: true, clientEmail: true,
      total: true, subtotal: true, taxType: true, taxRate: true, taxLabel: true,
      taxInclusive: true, discountType: true, discountValue: true, lineItems: true,
      additionalDetails: true, templateColor: true, paidAt: true, paymentMethod: true,
      sentByName: true, isInvoice: true,
    },
  });
  if (estimate && estimate.isInvoice) {
    return NextResponse.json({ invoice: estimate });
  }

  const invoice = await db.invoice.findUnique({
    where: { paymentToken: token },
    include: { appointment: { select: { name: true, email: true, service: true } } },
  });
  if (invoice) {
    const { items, total } = computeInvoiceTotal(invoice.lineItems, invoice.appointment.service, invoice.amount);
    return NextResponse.json({
      invoice: {
        id: invoice.id,
        estimateNumber: `INV${invoice.id.slice(-6).toUpperCase()}`,
        clientName: invoice.appointment.name,
        clientEmail: invoice.appointment.email,
        total,
        lineItems: items.map((i) => ({ desc: i.description ?? invoice.appointment.service, rate: i.rate, qty: i.qty, amount: i.rate * i.qty })),
        additionalDetails: invoice.notes,
        templateColor: null,
        paidAt: invoice.paidAt,
        paymentMethod: invoice.paymentMethod,
        sentByName: invoice.sentByName,
        isInvoice: true,
      },
    });
  }

  return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
}

// POST — handle payment actions
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await req.json();
  const { action } = body;

  const estimate = await db.estimate.findUnique({ where: { paymentToken: token } });
  if (estimate && estimate.isInvoice) {
    return handleEstimatePayment(estimate, action, body);
  }

  const invoice = await db.invoice.findUnique({
    where: { paymentToken: token },
    include: { appointment: { select: { name: true, email: true, phone: true, service: true } } },
  });
  if (invoice) {
    return handleAdminInvoicePayment(invoice, action, body);
  }

  return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
}

type EstimateRow = NonNullable<Awaited<ReturnType<typeof db.estimate.findUnique>>>;

async function handleEstimatePayment(invoice: EstimateRow, action: string, body: Record<string, unknown>) {
  if (invoice.paidAt) return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });

  if (action === "charge-card") {
    const paymentMethodId = body.paymentMethodId as string;
    if (!paymentMethodId) return NextResponse.json({ error: "Missing paymentMethodId" }, { status: 400 });

    const { intent, cardFee, chargeTotal } = await chargeCard(
      paymentMethodId,
      invoice.total,
      `DADA HOUSE Invoice #${invoice.estimateNumber}`,
      { invoiceId: invoice.id, estimateNumber: invoice.estimateNumber }
    );

    if (intent.status === "requires_action") {
      return NextResponse.json({ status: "requires_action", clientSecret: intent.client_secret, cardFee, chargeTotal });
    }
    if (intent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment failed" }, { status: 402 });
    }

    await db.estimate.update({
      where: { id: invoice.id },
      data: { paidAt: new Date(), status: "CLOSED", paymentMethod: "CARD" },
    });
    if (invoice.clientEmail) {
      const lineItems = (invoice.lineItems as Array<{ desc: string; rate: number; qty: number; amount: number }>) ?? [];
      const clientEmail = invoice.clientEmail;
      after(() => sendEstimateReceiptEmail({ ...invoice, clientEmail }, lineItems, cardFee).catch(console.error));
    }
    if (invoice.clientPhone) {
      after(() => sendPaymentReceiptSms(invoice.clientPhone!, invoice.estimateNumber, invoice.total, cardFee).catch(console.error));
    }
    after(() => notifyAdminPayment(invoice.clientName, invoice.estimateNumber, invoice.total, cardFee, "Credit Card"));
    return NextResponse.json({ status: "succeeded", cardFee, chargeTotal });
  }

  if (action === "card-paid") {
    const paymentIntentId = body.paymentIntentId as string;
    if (!paymentIntentId) return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });

    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") return NextResponse.json({ error: "Payment not succeeded" }, { status: 400 });

    await db.estimate.update({
      where: { id: invoice.id },
      data: { paidAt: new Date(), status: "CLOSED", paymentMethod: "CARD" },
    });

    const cardFee = pi.amount / 100 - invoice.total;
    if (invoice.clientEmail) {
      const lineItems = (invoice.lineItems as Array<{ desc: string; rate: number; qty: number; amount: number }>) ?? [];
      const clientEmail = invoice.clientEmail;
      after(() => sendEstimateReceiptEmail({ ...invoice, clientEmail }, lineItems, cardFee).catch(console.error));
    }
    if (invoice.clientPhone) {
      after(() => sendPaymentReceiptSms(invoice.clientPhone!, invoice.estimateNumber, invoice.total, cardFee).catch(console.error));
    }
    after(() => notifyAdminPayment(invoice.clientName, invoice.estimateNumber, invoice.total, cardFee, "Credit Card"));

    return NextResponse.json({ success: true });
  }

  if (action === "create-cashapp-intent") {
    const intent = await createCashAppIntent(
      invoice.total,
      `DADA HOUSE Invoice #${invoice.estimateNumber}`,
      { invoiceId: invoice.id, estimateNumber: invoice.estimateNumber }
    );
    return NextResponse.json({ clientSecret: intent.client_secret });
  }

  if (action === "cashapp-paid") {
    const paymentIntentId = body.paymentIntentId as string;
    if (!paymentIntentId) return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });

    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") return NextResponse.json({ error: "Payment not succeeded" }, { status: 400 });

    await db.estimate.update({
      where: { id: invoice.id },
      data: { paidAt: new Date(), status: "CLOSED", paymentMethod: "CASHAPP" },
    });

    if (invoice.clientEmail) {
      const lineItems = (invoice.lineItems as Array<{ desc: string; rate: number; qty: number; amount: number }>) ?? [];
      const clientEmail = invoice.clientEmail;
      after(() => sendEstimateReceiptEmail({ ...invoice, clientEmail }, lineItems, 0).catch(console.error));
    }
    if (invoice.clientPhone) {
      after(() => sendPaymentReceiptSms(invoice.clientPhone!, invoice.estimateNumber, invoice.total, 0).catch(console.error));
    }
    after(() => notifyAdminPayment(invoice.clientName, invoice.estimateNumber, invoice.total, 0, "Cash App"));

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

type InvoiceWithAppt = Prisma.InvoiceGetPayload<{ include: { appointment: { select: { name: true; email: true; phone: true; service: true } } } }>;

async function handleAdminInvoicePayment(invoice: InvoiceWithAppt, action: string, body: Record<string, unknown>) {
  if (invoice.paidAt) return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });

  const { total } = computeInvoiceTotal(invoice.lineItems, invoice.appointment.service, invoice.amount);

  if (action === "charge-card") {
    const paymentMethodId = body.paymentMethodId as string;
    if (!paymentMethodId) return NextResponse.json({ error: "Missing paymentMethodId" }, { status: 400 });

    const { intent, cardFee, chargeTotal } = await chargeCard(
      paymentMethodId,
      total,
      `DADA HOUSE Invoice #INV${invoice.id.slice(-6).toUpperCase()}`,
      { adminInvoiceId: invoice.id }
    );

    if (intent.status === "requires_action") {
      return NextResponse.json({ status: "requires_action", clientSecret: intent.client_secret, cardFee, chargeTotal });
    }
    if (intent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment failed" }, { status: 402 });
    }

    await db.invoice.update({
      where: { id: invoice.id },
      data: { paidAt: new Date(), status: "PAID", paymentMethod: "CARD", stripePaymentIntentId: intent.id },
    });
    if (invoice.appointment.email) {
      const email = invoice.appointment.email;
      after(() =>
        sendAdminInvoiceReceiptEmail({
          invoiceNum: `INV${invoice.id.slice(-6).toUpperCase()}`,
          clientName: invoice.appointment.name,
          clientEmail: email,
          total,
          cardFee,
        }).catch(console.error)
      );
    }
    if (invoice.appointment.phone) {
      after(() => sendPaymentReceiptSms(invoice.appointment.phone, `INV${invoice.id.slice(-6).toUpperCase()}`, total, cardFee).catch(console.error));
    }
    after(() => notifyAdminPayment(invoice.appointment.name, `INV${invoice.id.slice(-6).toUpperCase()}`, total, cardFee, "Credit Card"));
    return NextResponse.json({ status: "succeeded", cardFee, chargeTotal });
  }

  if (action === "card-paid") {
    const paymentIntentId = body.paymentIntentId as string;
    if (!paymentIntentId) return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });

    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") return NextResponse.json({ error: "Payment not succeeded" }, { status: 400 });

    await db.invoice.update({
      where: { id: invoice.id },
      data: { paidAt: new Date(), status: "PAID", paymentMethod: "CARD", stripePaymentIntentId: paymentIntentId },
    });

    const cardFee = pi.amount / 100 - total;
    if (invoice.appointment.email) {
      after(() =>
        sendAdminInvoiceReceiptEmail({
          invoiceNum: `INV${invoice.id.slice(-6).toUpperCase()}`,
          clientName: invoice.appointment.name,
          clientEmail: invoice.appointment.email!,
          total,
          cardFee,
        }).catch(console.error)
      );
    }
    if (invoice.appointment.phone) {
      after(() => sendPaymentReceiptSms(invoice.appointment.phone, `INV${invoice.id.slice(-6).toUpperCase()}`, total, cardFee).catch(console.error));
    }
    after(() => notifyAdminPayment(invoice.appointment.name, `INV${invoice.id.slice(-6).toUpperCase()}`, total, cardFee, "Credit Card"));

    return NextResponse.json({ success: true });
  }

  if (action === "create-cashapp-intent") {
    const intent = await createCashAppIntent(
      total,
      `DADA HOUSE Invoice #INV${invoice.id.slice(-6).toUpperCase()}`,
      { adminInvoiceId: invoice.id }
    );
    return NextResponse.json({ clientSecret: intent.client_secret });
  }

  if (action === "cashapp-paid") {
    const paymentIntentId = body.paymentIntentId as string;
    if (!paymentIntentId) return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });

    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") return NextResponse.json({ error: "Payment not succeeded" }, { status: 400 });

    await db.invoice.update({
      where: { id: invoice.id },
      data: { paidAt: new Date(), status: "PAID", paymentMethod: "CASHAPP", stripePaymentIntentId: paymentIntentId },
    });

    if (invoice.appointment.email) {
      const email = invoice.appointment.email;
      after(() =>
        sendAdminInvoiceReceiptEmail({
          invoiceNum: `INV${invoice.id.slice(-6).toUpperCase()}`,
          clientName: invoice.appointment.name,
          clientEmail: email,
          total,
          cardFee: 0,
        }).catch(console.error)
      );
    }
    if (invoice.appointment.phone) {
      after(() => sendPaymentReceiptSms(invoice.appointment.phone, `INV${invoice.id.slice(-6).toUpperCase()}`, total, 0).catch(console.error));
    }
    after(() => notifyAdminPayment(invoice.appointment.name, `INV${invoice.id.slice(-6).toUpperCase()}`, total, 0, "Cash App"));

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function sendPaymentReceiptSms(phone: string, invoiceNum: string, total: number, cardFee: number) {
  const chargeTotal = total + cardFee;
  const feeLine = cardFee > 0 ? ` (incl. ${cardFee.toFixed(2)} card fee)` : "";
  await sendOutboundSms(
    phone,
    `DADA HOUSE: Thanks! Payment received for Invoice ${invoiceNum} — $${chargeTotal.toFixed(2)} charged${feeLine}. Questions? Call (844) 928-0875.`
  );
}

async function notifyAdminPayment(clientName: string, invoiceNum: string, total: number, cardFee: number, method: string) {
  const adminPhone = process.env.ADMIN_PHONE;
  if (!adminPhone) return;
  const chargeTotal = total + cardFee;
  const feeLine = cardFee > 0 ? ` (+$${cardFee.toFixed(2)} card fee)` : "";
  await sendOutboundSms(
    adminPhone,
    `💳 DADA HOUSE Payment Received!\nClient: ${clientName}\nInvoice: ${invoiceNum}\nAmount: $${chargeTotal.toFixed(2)}${feeLine}\nMethod: ${method}`
  ).catch(console.error);
}

async function sendEstimateReceiptEmail(
  inv: { estimateNumber: string; clientName: string; total: number; clientEmail: string },
  lineItems: Array<{ desc: string; rate: number; qty: number; amount: number }>,
  cardFee: number
) {
  const itemRows = lineItems.map((item) =>
    `<tr><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0">${item.desc}</td><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold">$${item.amount.toFixed(2)}</td></tr>`
  ).join("");
  const chargeTotal = inv.total + cardFee;

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
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tbody>${itemRows}</tbody>
      <tfoot>
        ${cardFee > 0 ? `<tr><td style="padding:8px 4px;color:#6b7280">Card processing fee (3%)</td><td style="padding:8px 4px;text-align:right;color:#6b7280">$${cardFee.toFixed(2)}</td></tr>` : ""}
        <tr><td style="padding:12px 4px;border-top:2px solid #1B3FA8;font-weight:bold;color:#1B3FA8">Total Charged</td><td style="padding:12px 4px;border-top:2px solid #1B3FA8;text-align:right;font-weight:bold;font-size:18px;color:#1B3FA8">$${chargeTotal.toFixed(2)}</td></tr>
      </tfoot>
    </table>
    <p>We appreciate your business. For any questions: 📞 (844) 928-0875</p>
    <p style="color:#6b7280;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">DADA HOUSE · 7001 South Texas 6 STE 246, Houston, TX 77083</p>
  </div></body></html>`,
  });
}

async function sendAdminInvoiceReceiptEmail(opts: {
  invoiceNum: string; clientName: string; clientEmail: string; total: number; cardFee: number;
}) {
  const chargeTotal = opts.total + opts.cardFee;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: opts.clientEmail,
    subject: `Payment Received — Invoice ${opts.invoiceNum} · DADA HOUSE`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:white;">
    <div style="height:8px;background:#16a34a;"></div>
    <div style="padding:24px 32px 16px;text-align:center;">
      <img src="https://www.dada-house.com/logo%20dada%20house.png" alt="DADA HOUSE" style="height:56px;width:auto;" />
    </div>
    <div style="padding:0 32px 20px;text-align:center;">
      <div style="font-size:18px;font-weight:700;color:#16a34a;">✓ Payment Received — Thank You!</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px;">Invoice ${opts.invoiceNum}</div>
    </div>
    <div style="padding:0 32px 24px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:6px 0;color:#6b7280;">Amount</td><td style="padding:6px 0;text-align:right;color:#111827;">$${opts.total.toFixed(2)}</td></tr>
        ${opts.cardFee > 0 ? `<tr><td style="padding:6px 0;color:#6b7280;">Card processing fee (3%)</td><td style="padding:6px 0;text-align:right;color:#111827;">$${opts.cardFee.toFixed(2)}</td></tr>` : ""}
        <tr style="border-top:2px solid #e5e7eb;"><td style="padding:10px 0 4px;font-weight:700;color:#111827;">Total Charged</td><td style="padding:10px 0 4px;text-align:right;font-weight:700;color:#16a34a;font-size:16px;">$${chargeTotal.toFixed(2)}</td></tr>
      </table>
    </div>
    <div style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#374151;margin:0 0 4px;">Thank you, ${opts.clientName}, for choosing DADA HOUSE.</p>
      <p style="font-size:12px;color:#374151;margin:0;">Questions? Call (844) 928-0875 or visit www.dada-house.com.</p>
    </div>
  </div>
</body></html>`,
  });
}
