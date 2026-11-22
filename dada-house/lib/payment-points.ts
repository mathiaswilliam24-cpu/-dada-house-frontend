import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { earnPointsForPayment } from "@/lib/loyalty";
import { loadBill } from "@/lib/bill-amounts";

/**
 * Reward points for every Stripe payment (called from the Stripe webhook).
 * 1 point per $1 actually paid for the service — the 3% credit-card fee is excluded.
 * Each payment earns once (keyed by the payment intent / Stripe invoice id).
 */

const last10 = (p: string | null | undefined) => (p ?? "").replace(/\D/g, "").slice(-10);

async function customerByPhone(phone: string | null | undefined) {
  const d = last10(phone);
  if (d.length !== 10) return null;
  const c = await db.customer.findFirst({ where: { phone: { endsWith: d } }, select: { id: true } });
  return c?.id ?? null;
}

/** One-time payments: invoices paid online, in person on the technician's device, diagnostic fees… */
export async function pointsForPaymentIntent(pi: Stripe.PaymentIntent) {
  const m = pi.metadata ?? {};
  let customerId: string | null = null;
  let billId: string | null = null;
  let label = pi.description || "Payment";

  const estimateId = m.estimateId || (m.estimateNumber ? m.invoiceId : undefined);
  if (estimateId) {
    const b = await loadBill("estimate", estimateId);
    if (b) { billId = b.id; label = `Invoice #${b.number} paid`; customerId = b.customerId ?? (await customerByPhone(b.clientPhone)); }
  } else if (m.adminInvoiceId) {
    const b = await loadBill("invoice", m.adminInvoiceId);
    if (b) { billId = b.id; label = `Invoice #${b.number} paid`; customerId = b.customerId ?? (await customerByPhone(b.clientPhone)); }
  } else if (m.appointmentId) {
    const a = await db.appointment.findUnique({ where: { id: m.appointmentId }, select: { customerId: true, phone: true, appointmentNumber: true, invoice: { select: { id: true } } } });
    if (a) { billId = a.invoice?.id ?? null; label = `Job #${a.appointmentNumber} payment`; customerId = a.customerId ?? (await customerByPhone(a.phone)); }
  } else if (m.maintenanceContractId) {
    const c = await db.maintenanceContract.findUnique({ where: { id: m.maintenanceContractId }, select: { customerId: true } });
    customerId = c?.customerId ?? null; label = "Maintenance plan payment";
  }
  if (!customerId && typeof pi.customer === "string") {
    const c = await db.customer.findFirst({ where: { stripeCustomerId: pi.customer }, select: { id: true } });
    customerId = c?.id ?? null;
  }
  if (!customerId) return null;

  const cardFee = Number(m.cardFee || 0) || 0;
  const amount = pi.amount_received / 100 - cardFee;
  return earnPointsForPayment({ customerId, amount, reference: `pi:${pi.id}`, description: label, invoiceId: billId });
}

/** Maintenance plan payments (first payment, monthly payments and yearly renewals). */
export async function pointsForSubscriptionInvoice(inv: Stripe.Invoice) {
  if (!inv.amount_paid || inv.amount_paid <= 0) return null;
  // Stripe API versions differ on where the subscription id lives.
  const raw = inv as unknown as { subscription?: string | { id: string } | null; parent?: { subscription_details?: { subscription?: string | { id: string } | null; metadata?: Record<string, string> } | null } | null };
  const subRef = raw.parent?.subscription_details?.subscription ?? raw.subscription ?? null;
  const subId = typeof subRef === "string" ? subRef : subRef?.id ?? null;
  if (!subId) return null;

  let customerId: string | null = raw.parent?.subscription_details?.metadata?.customerId ?? null;
  if (!customerId) {
    const c = await db.maintenanceContract.findFirst({ where: { stripeSubscriptionId: subId }, select: { customerId: true } });
    customerId = c?.customerId ?? null;
  }
  if (!customerId) {
    const sub = await getStripe().subscriptions.retrieve(subId).catch(() => null);
    customerId = sub?.metadata?.customerId ?? null;
    if (!customerId && sub?.metadata?.contractId) {
      const c = await db.maintenanceContract.findUnique({ where: { id: sub.metadata.contractId }, select: { customerId: true } });
      customerId = c?.customerId ?? null;
    }
  }
  if (!customerId) return null;
  const exists = await db.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!exists) return null;

  return earnPointsForPayment({
    customerId, amount: inv.amount_paid / 100, reference: `inv:${inv.id}`,
    description: `Maintenance plan payment${inv.number ? ` (${inv.number})` : ""}`,
  });
}
