import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getLinkedCustomer, myEstimateInvoicesWhere } from "@/lib/portal-access";
import { pointsToDollars } from "@/lib/loyalty";
import { loadBill } from "@/lib/bill-amounts";

export const dynamic = "force-dynamic";

/** The signed-in client's reward points: balance, history and the unpaid bills he can apply them to. */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const customer = await getLinkedCustomer(auth.id);
  if (!customer) return NextResponse.json({ linked: false, balance: 0, value: 0, transactions: [], bills: [] });

  const account = await db.loyaltyAccount.findUnique({
    where: { customerId: customer.id },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
  });

  const [estimates, invoices] = await Promise.all([
    db.estimate.findMany({ where: { AND: [await myEstimateInvoicesWhere(auth.id, auth.email), { paidAt: null, sentAt: { not: null } }] }, select: { id: true }, take: 20 }),
    db.invoice.findMany({ where: { appointment: { userId: auth.id }, paidAt: null, status: { not: "PAID" }, paymentToken: { not: null } }, select: { id: true }, take: 20 }),
  ]);
  const bills = (await Promise.all([
    ...estimates.map((e) => loadBill("estimate", e.id)),
    ...invoices.map((i) => loadBill("invoice", i.id)),
  ])).filter((b): b is NonNullable<typeof b> => !!b && !b.paid && b.due > 0)
    .map((b) => ({ kind: b.kind, id: b.id, number: b.number, due: b.due, loyaltyDiscount: b.loyaltyDiscount }));

  const balance = account?.balance ?? 0;
  return NextResponse.json({
    linked: true, balance, value: pointsToDollars(balance), totalEarned: account?.totalEarned ?? 0, totalSpent: account?.totalSpent ?? 0,
    transactions: (account?.transactions ?? []).map((t) => ({ id: t.id, type: t.type, points: t.points, description: t.description, createdAt: t.createdAt })),
    bills,
  });
}
