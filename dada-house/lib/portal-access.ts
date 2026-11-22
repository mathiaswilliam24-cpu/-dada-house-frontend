import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/customers";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Customer portal access.
 * A client account (User) sees the records of the Customer linked to it (Customer.userId),
 * not only the appointments created while logged in. The link is made only from a proof of identity:
 * a personal invite link sent to the customer's phone/email, or a phone number verified by SMS code.
 */

const SECRET = () => process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";
const b64url = (b: Buffer) => b.toString("base64url");
const INVITE_DAYS = 60;

/** Personal "create your account" token for one customer (signed, expires in 60 days). */
export function createPortalInvite(customerId: string): string {
  const payload = b64url(Buffer.from(JSON.stringify({ c: customerId, e: Date.now() + INVITE_DAYS * 864e5 })));
  const sig = b64url(createHmac("sha256", SECRET()).update(`portal-invite:${payload}`).digest()).slice(0, 32);
  return `${payload}.${sig}`;
}

export function verifyPortalInvite(token: string | null | undefined): string | null {
  if (!token || !SECRET()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = b64url(createHmac("sha256", SECRET()).update(`portal-invite:${payload}`).digest()).slice(0, 32);
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { c, e } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { c: string; e: number };
    return typeof c === "string" && e > Date.now() ? c : null;
  } catch { return null; }
}

export function portalInviteUrl(customerId: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");
  return `${base}/auth/register?invite=${createPortalInvite(customerId)}`;
}

/**
 * Links a customer to a client account (only if the customer is not linked to another account)
 * and attaches the customer's existing appointments to it. Returns true when linked.
 */
export async function linkCustomerToUser(customerId: string, userId: string): Promise<boolean> {
  const customer = await db.customer.findUnique({ where: { id: customerId }, select: { id: true, userId: true, phone: true } });
  if (!customer) return false;
  if (customer.userId && customer.userId !== userId) return false;
  const already = await db.customer.findFirst({ where: { userId, NOT: { id: customerId } }, select: { id: true } });
  if (already) return false; // one customer record per account
  await db.$transaction([
    db.customer.update({ where: { id: customerId }, data: { userId } }),
    db.appointment.updateMany({ where: { customerId, userId: null }, data: { userId } }),
  ]);
  const user = await db.user.findUnique({ where: { id: userId }, select: { phone: true } });
  if (!user?.phone) await db.user.update({ where: { id: userId }, data: { phone: customer.phone } }).catch(() => {});
  return true;
}

/** After an SMS-code login: link the customer whose phone was just verified. */
export async function linkCustomerByVerifiedPhone(userId: string, phone: string) {
  const customer = await db.customer.findUnique({ where: { phone: normalizePhone(phone) }, select: { id: true, userId: true } });
  if (customer && !customer.userId) await linkCustomerToUser(customer.id, userId).catch(console.error);
}

export async function getLinkedCustomer(userId: string) {
  return db.customer.findFirst({ where: { userId }, select: { id: true, phone: true, email: true, firstName: true, lastName: true } });
}

/**
 * Attaches to the client account every appointment of its customer record that is not attached yet
 * (jobs booked later by the office, a technician or the AI receptionist). Called by the client layouts,
 * so every existing page that lists "my appointments / my invoices" by userId sees them.
 */
export async function syncCustomerAppointments(userId: string) {
  await db.appointment.updateMany({ where: { userId: null, customer: { userId } }, data: { userId } }).catch(console.error);
}

/** Technician/office invoices (Estimate rows) that belong to the signed-in client. */
export async function myEstimateInvoicesWhere(userId: string, email: string | null | undefined): Promise<Prisma.EstimateWhereInput> {
  const customer = await getLinkedCustomer(userId);
  const or: Prisma.EstimateWhereInput[] = [];
  if (email) or.push({ clientEmail: email });
  if (customer) {
    or.push({ clientPhone: customer.phone }, { clientPhone: { endsWith: customer.phone.replace(/\D/g, "").slice(-10) } });
    const appts = await db.appointment.findMany({ where: { customerId: customer.id }, select: { id: true } });
    if (appts.length) or.push({ appointmentId: { in: appts.map((a) => a.id) } });
  }
  return { isInvoice: true, OR: or.length ? or : [{ id: "__none__" }] };
}
