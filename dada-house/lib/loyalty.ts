import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

// 1 point per $1 paid. 100 points = $1 of discount.
export const POINTS_PER_DOLLAR = 1;
export const POINTS_VALUE_CENTS = 1; // 1 point = $0.01

export function dollarToPoints(amount: number): number {
  return Math.floor(amount * POINTS_PER_DOLLAR);
}

export function pointsToDollars(points: number): number {
  return (points * POINTS_VALUE_CENTS) / 100;
}

export async function getOrCreateAccount(customerId: string) {
  return db.loyaltyAccount.upsert({
    where: { customerId },
    create: { customerId },
    update: {},
  });
}

export async function earnPoints(
  customerId: string,
  points: number,
  invoiceId: string,
  description: string
) {
  if (points <= 0) return null;
  const account = await getOrCreateAccount(customerId);
  return db.loyaltyAccount.update({
    where: { id: account.id },
    data: {
      balance: { increment: points },
      totalEarned: { increment: points },
      transactions: {
        create: { type: "EARN", points, description, invoiceId },
      },
    },
  });
}

export async function redeemPoints(
  customerId: string,
  points: number,
  invoiceId: string,
  description: string
) {
  const account = await getOrCreateAccount(customerId);
  if (account.balance < points) {
    throw new Error(`Insufficient points (balance: ${account.balance}, requested: ${points})`);
  }
  return db.loyaltyAccount.update({
    where: { id: account.id },
    data: {
      balance: { decrement: points },
      totalSpent: { increment: points },
      transactions: {
        create: { type: "REDEEM", points: -points, description, invoiceId },
      },
    },
  });
}

export async function adjustPoints(
  customerId: string,
  points: number,
  description: string
) {
  const account = await getOrCreateAccount(customerId);
  if (account.balance + points < 0) {
    throw new Error("Adjustment would result in negative balance");
  }
  return db.loyaltyAccount.update({
    where: { id: account.id },
    data: {
      balance: { increment: points },
      totalEarned: points > 0 ? { increment: points } : undefined,
      totalSpent: points < 0 ? { increment: -points } : undefined,
      transactions: {
        create: { type: "ADJUSTMENT", points, description },
      },
    },
  });
}

export async function getAccountWithHistory(customerId: string) {
  return db.loyaltyAccount.findUnique({
    where: { customerId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

// ── Points on every payment, used by the customer online ────────────────────
// Rule (user-confirmed 2026-11-22): every payment earns points (invoices paid online or in person,
// maintenance plan payments and renewals); the customer applies them himself to an unpaid invoice.

/** Lock + check so the same payment never earns twice (webhook retries, two routes for one payment). */
async function alreadyEarned(tx: Prisma.TransactionClient, reference: string, invoiceId?: string | null) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${reference}))`;
  const hit = await tx.loyaltyTransaction.findFirst({
    where: { type: "EARN", OR: [{ reference }, ...(invoiceId ? [{ invoiceId }] : [])] },
    select: { id: true },
  });
  return !!hit;
}

/** Earns points for one payment (dollars actually paid for the service — card fees excluded). Idempotent. */
export async function earnPointsForPayment(opts: { customerId: string; amount: number; reference: string; description: string; invoiceId?: string | null }) {
  const points = dollarToPoints(opts.amount);
  if (points <= 0) return null;
  return db.$transaction(async (tx) => {
    if (await alreadyEarned(tx, opts.reference, opts.invoiceId)) return null;
    const account = await tx.loyaltyAccount.upsert({ where: { customerId: opts.customerId }, create: { customerId: opts.customerId }, update: {} });
    await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        balance: { increment: points },
        totalEarned: { increment: points },
        transactions: { create: { type: "EARN", points, description: opts.description, invoiceId: opts.invoiceId ?? null, reference: opts.reference } },
      },
    });
    return points;
  });
}

/** Stripe refuses card charges under $0.50 — the rest of a bill after points must be $0 or at least this. */
export const MIN_CARD_CHARGE = 0.5;

export type BillRef = { kind: "estimate" | "invoice"; id: string };

/**
 * The customer applies points to one of his unpaid bills. Returns the discount applied and what is left to pay.
 * If the points cover the whole bill, it is marked paid ("LOYALTY_POINTS").
 */
export async function redeemPointsOnBill(customerId: string, bill: BillRef, amountDue: number, requestedPoints: number) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`redeem:${customerId}`}))`;
    const account = await tx.loyaltyAccount.findUnique({ where: { customerId } });
    const balance = account?.balance ?? 0;
    const maxPointsForBill = Math.ceil(Math.round(amountDue * 100)); // 1 point = 1 cent
    let points = Math.min(Math.floor(requestedPoints), balance, maxPointsForBill);
    if (points <= 0 || !account) throw new Error("You don't have points to apply.");
    let discount = Math.min(pointsToDollars(points), amountDue);
    let remaining = Math.round((amountDue - discount) * 100) / 100;
    if (remaining > 0 && remaining < MIN_CARD_CHARGE) {
      // Leave at least $0.50 to pay by card (Stripe minimum).
      discount = Math.round((amountDue - MIN_CARD_CHARGE) * 100) / 100;
      points = Math.round(discount * 100);
      remaining = MIN_CARD_CHARGE;
      if (points <= 0) throw new Error("This bill is too small to use points on.");
    }
    const paidInFull = remaining <= 0;
    await tx.loyaltyAccount.update({
      where: { id: account.id },
      data: {
        balance: { decrement: points },
        totalSpent: { increment: points },
        transactions: { create: { type: "REDEEM", points: -points, description: `Applied to ${bill.kind === "estimate" ? "invoice" : "invoice"} by the customer`, invoiceId: bill.id } },
      },
    });
    const data = {
      loyaltyDiscount: { increment: discount }, loyaltyPointsUsed: { increment: points },
      ...(paidInFull ? { paidAt: new Date(), paymentMethod: "LOYALTY_POINTS" } : {}),
    };
    if (bill.kind === "estimate") await tx.estimate.update({ where: { id: bill.id }, data: { ...data, ...(paidInFull ? { status: "CLOSED" } : {}) } });
    else await tx.invoice.update({ where: { id: bill.id }, data: { ...data, ...(paidInFull ? { status: "PAID" } : {}) } });
    return { points, discount, remaining: Math.max(0, remaining), paidInFull };
  });
}
