import { db } from "@/lib/db";

/** Amounts of the two kinds of customer bills (technician/office invoices = Estimate rows, appointment invoices = Invoice rows). */

type LI = { description?: string; rate: number; qty: number };

export function parseInvoiceLineItems(raw: unknown, fallbackService: string, fallbackAmount: number) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const m = raw as Record<string, unknown>;
    if (Array.isArray(m.items) && m.items.length > 0) {
      return { taxEnabled: m.taxEnabled !== false, taxRate: typeof m.taxRate === "number" ? m.taxRate : 8.25, items: m.items as LI[] };
    }
  }
  if (Array.isArray(raw) && raw.length > 0) return { taxEnabled: true, taxRate: 8.25, items: raw as LI[] };
  return { taxEnabled: true, taxRate: 8.25, items: [{ description: fallbackService, rate: fallbackAmount, qty: 1 }] };
}

/** Total of an appointment invoice (line items + tax) — same computation as the payment page. */
export function invoiceGrossTotal(raw: unknown, fallbackService: string, fallbackAmount: number) {
  const { taxEnabled, taxRate, items } = parseInvoiceLineItems(raw, fallbackService, fallbackAmount);
  const subtotal = items.reduce((s, i) => s + i.rate * i.qty, 0);
  return subtotal + (taxEnabled ? (subtotal * taxRate) / 100 : 0);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type Bill = {
  kind: "estimate" | "invoice"; id: string; number: string; gross: number; loyaltyDiscount: number; due: number; paid: boolean;
  customerId: string | null; clientPhone: string | null; clientEmail: string | null; appointmentUserId: string | null;
};

export async function loadBill(kind: "estimate" | "invoice", id: string): Promise<Bill | null> {
  if (kind === "estimate") {
    const e = await db.estimate.findUnique({ where: { id }, select: { id: true, isInvoice: true, estimateNumber: true, total: true, loyaltyDiscount: true, paidAt: true, clientPhone: true, clientEmail: true, appointmentId: true } });
    if (!e || !e.isInvoice) return null;
    const appt = e.appointmentId ? await db.appointment.findUnique({ where: { id: e.appointmentId }, select: { customerId: true, userId: true } }) : null;
    return { kind, id: e.id, number: e.estimateNumber, gross: e.total, loyaltyDiscount: e.loyaltyDiscount, due: round2(Math.max(0, e.total - e.loyaltyDiscount)), paid: !!e.paidAt,
      customerId: appt?.customerId ?? null, clientPhone: e.clientPhone, clientEmail: e.clientEmail, appointmentUserId: appt?.userId ?? null };
  }
  const inv = await db.invoice.findUnique({ where: { id }, include: { appointment: { select: { service: true, appointmentNumber: true, customerId: true, userId: true, phone: true, email: true } } } });
  if (!inv) return null;
  const gross = invoiceGrossTotal(inv.lineItems, inv.appointment.service, inv.amount);
  return { kind, id: inv.id, number: inv.appointment.appointmentNumber ?? `INV${inv.id.slice(-6).toUpperCase()}`, gross, loyaltyDiscount: inv.loyaltyDiscount,
    due: round2(Math.max(0, gross - inv.loyaltyDiscount)), paid: !!inv.paidAt || inv.status === "PAID",
    customerId: inv.appointment.customerId, clientPhone: inv.appointment.phone, clientEmail: inv.appointment.email, appointmentUserId: inv.appointment.userId };
}
