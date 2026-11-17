import { UTApi } from "uploadthing/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { findOrCreateCustomerByPhone } from "@/lib/customers";
import { formatCurrency } from "@/lib/utils";
import type { Estimate } from "@/lib/generated/prisma/client";

/** Same rule as the online /pay page: 3% surcharge on CREDIT cards only (never debit/prepaid). */
export const CARD_FEE_RATE = 0.03;

export const BUSINESS_NAME = "DADA HOUSE LLC";
export const BUSINESS_PHONE = "(346) 649-9353";

export type SignatureKind = "ESTIMATE_APPROVAL" | "PAYMENT_AUTHORIZATION" | "WORK_COMPLETION" | "PAYMENT_ACKNOWLEDGMENT";

const money = (n: number) => formatCurrency(n);
const brandName = (b?: string | null) => (b ? (b === "amex" ? "American Express" : b.charAt(0).toUpperCase() + b.slice(1)) : "card");

// ─── Statements the customer signs (built server-side so the stored text is authoritative) ───

export function approvalStatement(e: Pick<Estimate, "estimateNumber" | "total">, signerName: string) {
  return `I, ${signerName}, have reviewed estimate #${e.estimateNumber}, including the items, prices and tax shown, for a total of ${money(e.total)}. I approve this work and authorize ${BUSINESS_NAME} to perform it at my property.`;
}

export function paymentStatement(opts: {
  signerName: string; estimateNumber: string; invoiceTotal: number; cardFee: number; chargeTotal: number;
  brand?: string | null; last4?: string | null; saveCard: boolean;
}) {
  const fee = opts.cardFee > 0 ? ` (invoice ${money(opts.invoiceTotal)} + ${money(opts.cardFee)} credit card fee)` : "";
  let s = `I, ${opts.signerName}, authorize ${BUSINESS_NAME} to charge ${money(opts.chargeTotal)}${fee} to my ${brandName(opts.brand)} ending in ${opts.last4 ?? "----"} for invoice #${opts.estimateNumber}. I am the cardholder or am authorized to use this card, and I gave this card to the technician myself.`;
  if (opts.saveCard) s += ` I also authorize ${BUSINESS_NAME} to keep this card on file and charge it only for future services that I approve.`;
  return s;
}

export function workCompletionStatement(signerName: string, invoiceNumber: string | null) {
  const inv = invoiceNumber ? ` listed on invoice #${invoiceNumber}` : "";
  return `I, ${signerName}, confirm that the work${inv} was completed at my property today, that the technician explained the work performed, and that I accept it. Any equipment serviced was left in working condition.`;
}

export function paymentAcknowledgmentStatement(signerName: string, paid: { amount: number; brand?: string | null; last4?: string | null } | null, invoiceNumber: string | null) {
  const inv = invoiceNumber ? ` for invoice #${invoiceNumber}` : "";
  const what = paid
    ? `the payment of ${money(paid.amount)}${paid.last4 ? ` charged to my ${brandName(paid.brand)} ending in ${paid.last4}` : ""}${inv}`
    : `the amount due${inv}`;
  return `I, ${signerName}, acknowledge and accept ${what}, which I authorized for the products and services I received. If I have any concern about this charge, I agree to contact ${BUSINESS_NAME} first at ${BUSINESS_PHONE} so it can be resolved before I contact my bank or card issuer.`;
}

// ─── Signature storage ───

/** Stores the PNG on UploadThing (falls back to the data URL if the upload fails, so a signature is never lost). */
async function storeSignatureImage(dataUrl: string, name: string) {
  const m = /^data:image\/png;base64,(.+)$/.exec(dataUrl);
  if (!m) throw new Error("Invalid signature image");
  try {
    const file = new File([Buffer.from(m[1], "base64")], `${name}.png`, { type: "image/png" });
    const up = await new UTApi().uploadFiles(file);
    if (up.error) throw new Error(up.error.message);
    return up.data.ufsUrl ?? up.data.url;
  } catch (err) {
    console.error("Signature upload failed, keeping data URL", err);
    return dataUrl;
  }
}

export async function recordSignature(input: {
  kind: SignatureKind; signerName: string; signature: string; statement: string;
  estimateId?: string | null; appointmentId?: string | null; customerId?: string | null;
  amount?: number | null; cardBrand?: string | null; cardLast4?: string | null; stripePaymentIntentId?: string | null;
  collectedById: string; ipAddress?: string | null; userAgent?: string | null;
}) {
  const { signature, ...rest } = input;
  const signatureUrl = await storeSignatureImage(signature, `signature-${input.kind.toLowerCase()}-${Date.now()}`);
  return db.customerSignature.create({ data: { ...rest, signatureUrl } });
}

export function requestMeta(req: Request) {
  return {
    ipAddress: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
    userAgent: req.headers.get("user-agent"),
  };
}

// ─── Customers & cards on file ───

/** The DADA HOUSE Customer for an estimate: the job's customer, else matched by phone. */
export async function customerForEstimate(e: Estimate) {
  if (e.appointmentId) {
    const appt = await db.appointment.findUnique({ where: { id: e.appointmentId }, select: { customerId: true } });
    if (appt?.customerId) return db.customer.findUnique({ where: { id: appt.customerId } });
  }
  const phone = e.clientMobile || e.clientPhone;
  if (!phone) return null;
  const [firstName, ...rest] = e.clientName.trim().split(/\s+/);
  return findOrCreateCustomerByPhone(phone, { firstName: firstName || "Customer", lastName: rest.join(" ") || null, email: e.clientEmail || null }).catch(() => null);
}

export async function ensureStripeCustomer(customer: NonNullable<Awaited<ReturnType<typeof customerForEstimate>>>, e: Estimate) {
  if (customer.stripeCustomerId) return customer.stripeCustomerId;
  const sc = await getStripe().customers.create({
    name: [customer.firstName, customer.lastName].filter(Boolean).join(" ") || e.clientName,
    email: customer.email || e.clientEmail || undefined,
    phone: customer.phone,
    metadata: { dadaCustomerId: customer.id },
  });
  await db.customer.update({ where: { id: customer.id }, data: { stripeCustomerId: sc.id } });
  return sc.id;
}

export type CardOnFile = { id: string; brand: string; last4: string; expMonth: number; expYear: number; funding: string };

export async function listCardsOnFile(stripeCustomerId: string | null | undefined): Promise<CardOnFile[]> {
  if (!stripeCustomerId) return [];
  const res = await getStripe().paymentMethods.list({ customer: stripeCustomerId, type: "card", limit: 20 });
  return res.data.map((pm) => ({
    id: pm.id, brand: pm.card?.brand ?? "card", last4: pm.card?.last4 ?? "", funding: pm.card?.funding ?? "unknown",
    expMonth: pm.card?.exp_month ?? 0, expYear: pm.card?.exp_year ?? 0,
  }));
}

export async function quoteCard(paymentMethodId: string, invoiceTotal: number) {
  const pm = await getStripe().paymentMethods.retrieve(paymentMethodId);
  const funding = pm.card?.funding ?? "unknown";
  const cardFee = funding === "credit" ? Math.round(invoiceTotal * CARD_FEE_RATE * 100) / 100 : 0;
  return {
    pm,
    brand: pm.card?.brand ?? null,
    last4: pm.card?.last4 ?? null,
    funding,
    cardFee,
    chargeTotal: Math.round((invoiceTotal + cardFee) * 100) / 100,
  };
}

/** Marks the estimate/invoice paid and records the job payment. Idempotent on the PaymentIntent. */
export async function finalizeCardPayment(e: Estimate, pi: Stripe.PaymentIntent, technicianId: string) {
  if (pi.status !== "succeeded") throw new Error(`Payment not succeeded (${pi.status})`);
  const cardFee = Math.round((pi.amount / 100 - e.total) * 100) / 100;
  const already = await db.estimate.findUnique({ where: { id: e.id }, select: { paidAt: true } });
  if (!already?.paidAt) {
    await db.estimate.update({ where: { id: e.id }, data: { paidAt: new Date(), status: "CLOSED", paymentMethod: "CARD" } });
  }
  if (e.appointmentId) {
    const exists = await db.jobPayment.findFirst({ where: { stripePaymentIntentId: pi.id } });
    if (!exists) {
      const card = typeof pi.payment_method === "string" ? null : pi.payment_method?.card;
      await db.jobPayment.create({
        data: {
          appointmentId: e.appointmentId,
          amount: pi.amount / 100,
          method: "CARD",
          reference: card ? `${brandName(card.brand)} •••• ${card.last4}` : null,
          stripePaymentIntentId: pi.id,
          collectedBy: technicianId,
          notes: `Card payment on technician device for invoice #${e.estimateNumber}${cardFee > 0 ? ` (incl. ${money(cardFee)} card fee)` : ""}`,
        },
      });
    }
    await db.invoice.updateMany({ where: { appointmentId: e.appointmentId }, data: { status: "PAID", paidAt: new Date(), paymentMethod: "CARD" } }).catch(() => {});
  }
  return { cardFee };
}
