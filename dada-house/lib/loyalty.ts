import { db } from "@/lib/db";

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
