import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { sendOutboundSms } from "@/lib/messaging";
import { sendTechnicianAssignmentNotification, sendAppointmentConfirmationEmail, sendAppointmentConfirmationSms } from "@/lib/appointment-notifications";
import type { Prisma } from "@/lib/generated/prisma/client";
import { sendPaymentReceiptSms, notifyAdminPayment, sendEstimateReceiptEmail, sendAdminInvoiceReceiptEmail } from "@/lib/payment-receipts";

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
      taxInclusive: true, discountType: true, discountValue: true, lineItems: true, loyaltyDiscount: true,
      additionalDetails: true, templateColor: true, paidAt: true, paymentMethod: true,
      sentByName: true, isInvoice: true,
    },
  });
  if (estimate && estimate.isInvoice) {
    return NextResponse.json({ invoice: { ...estimate, total: Math.round((estimate.total - estimate.loyaltyDiscount) * 100) / 100 } });
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
        total: Math.round((total - invoice.loyaltyDiscount) * 100) / 100,
        loyaltyDiscount: invoice.loyaltyDiscount,
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
    include: { appointment: { select: { id: true, name: true, email: true, phone: true, service: true, diagnosticFee: true, diagnosticFeeStatus: true, technicianId: true } } },
  });
  if (invoice) {
    return handleAdminInvoicePayment(invoice, action, body);
  }

  return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
}

type EstimateRow = NonNullable<Awaited<ReturnType<typeof db.estimate.findUnique>>>;

async function handleEstimatePayment(invoice: EstimateRow, action: string, body: Record<string, unknown>) {
  if (invoice.paidAt) return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
  // Reward points the customer applied are deducted from what is charged.
  const due = Math.round((invoice.total - invoice.loyaltyDiscount) * 100) / 100;

  if (action === "charge-card") {
    const paymentMethodId = body.paymentMethodId as string;
    if (!paymentMethodId) return NextResponse.json({ error: "Missing paymentMethodId" }, { status: 400 });

    const { intent, cardFee, chargeTotal } = await chargeCard(
      paymentMethodId,
      due,
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
      after(() => sendEstimateReceiptEmail({ ...invoice, total: due, clientEmail }, lineItems, cardFee).catch(console.error));
    }
    if (invoice.clientPhone) {
      after(() => sendPaymentReceiptSms(invoice.clientPhone!, invoice.estimateNumber, due, cardFee).catch(console.error));
    }
    after(() => notifyAdminPayment(invoice.clientName, invoice.estimateNumber, due, cardFee, "Credit Card"));
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

    const cardFee = pi.amount / 100 - due;
    if (invoice.clientEmail) {
      const lineItems = (invoice.lineItems as Array<{ desc: string; rate: number; qty: number; amount: number }>) ?? [];
      const clientEmail = invoice.clientEmail;
      after(() => sendEstimateReceiptEmail({ ...invoice, total: due, clientEmail }, lineItems, cardFee).catch(console.error));
    }
    if (invoice.clientPhone) {
      after(() => sendPaymentReceiptSms(invoice.clientPhone!, invoice.estimateNumber, due, cardFee).catch(console.error));
    }
    after(() => notifyAdminPayment(invoice.clientName, invoice.estimateNumber, due, cardFee, "Credit Card"));

    return NextResponse.json({ success: true });
  }

  if (action === "create-cashapp-intent") {
    const intent = await createCashAppIntent(
      due,
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
      after(() => sendEstimateReceiptEmail({ ...invoice, total: due, clientEmail }, lineItems, 0).catch(console.error));
    }
    if (invoice.clientPhone) {
      after(() => sendPaymentReceiptSms(invoice.clientPhone!, invoice.estimateNumber, due, 0).catch(console.error));
    }
    after(() => notifyAdminPayment(invoice.clientName, invoice.estimateNumber, due, 0, "Cash App"));

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

type InvoiceWithAppt = Prisma.InvoiceGetPayload<{ include: { appointment: { select: { id: true; name: true; email: true; phone: true; service: true; diagnosticFee: true; diagnosticFeeStatus: true; technicianId: true } } } }>;

async function triggerDiagnosticPaid(invoice: InvoiceWithAppt) {
  const appt = invoice.appointment;
  if (!appt.diagnosticFee || appt.diagnosticFeeStatus !== "PENDING") return;
  await db.appointment.update({ where: { id: appt.id }, data: { diagnosticFeeStatus: "PAID" } });
  // Confirm the appointment to the client
  after(() => Promise.allSettled([
    sendAppointmentConfirmationEmail(appt.id).catch(console.error),
    sendAppointmentConfirmationSms(appt.id).catch(console.error),
  ]));
  // Notify the technician only after payment
  if (appt.technicianId) {
    after(() => sendTechnicianAssignmentNotification(appt.id).catch(console.error));
  }
}

async function handleAdminInvoicePayment(invoice: InvoiceWithAppt, action: string, body: Record<string, unknown>) {
  if (invoice.paidAt) return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });

  const { total: gross } = computeInvoiceTotal(invoice.lineItems, invoice.appointment.service, invoice.amount);
  // Reward points the customer applied are deducted from what is charged.
  const total = Math.round((gross - invoice.loyaltyDiscount) * 100) / 100;

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
    await triggerDiagnosticPaid(invoice);
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
    await triggerDiagnosticPaid(invoice);

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
    await triggerDiagnosticPaid(invoice);

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
