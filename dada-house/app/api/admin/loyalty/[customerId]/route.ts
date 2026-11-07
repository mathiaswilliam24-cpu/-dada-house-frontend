import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getAccountWithHistory, adjustPoints, redeemPoints, pointsToDollars } from "@/lib/loyalty";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Resolve User ID or appt:phone → Customer.id
async function resolveCustomerId(raw: string): Promise<string | null> {
  if (raw.startsWith("appt:")) {
    const phone = raw.slice(5);
    const c = await db.customer.findFirst({ where: { phone }, select: { id: true } });
    return c?.id ?? null;
  }
  if (raw.startsWith("+")) {
    const c = await db.customer.findFirst({ where: { phone: raw }, select: { id: true } });
    return c?.id ?? null;
  }
  // Could be a User ID → find Customer linked to that user
  const byUser = await db.customer.findFirst({ where: { userId: raw }, select: { id: true } });
  if (byUser) return byUser.id;
  // Or already a Customer ID
  const direct = await db.customer.findUnique({ where: { id: raw }, select: { id: true } });
  return direct?.id ?? null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { customerId: raw } = await params;
  const customerId = await resolveCustomerId(raw);
  if (!customerId) {
    return NextResponse.json({ account: null, balance: 0, dollarValue: "0.00", transactions: [] });
  }

  const account = await getAccountWithHistory(customerId);
  if (!account) {
    return NextResponse.json({ account: null, balance: 0, dollarValue: "0.00", transactions: [] });
  }

  return NextResponse.json({
    account: {
      id: account.id,
      balance: account.balance,
      dollarValue: pointsToDollars(account.balance).toFixed(2),
      totalEarned: account.totalEarned,
      totalSpent: account.totalSpent,
    },
    transactions: account.transactions,
  });
}

const adjustSchema = z.object({
  action: z.enum(["adjust", "redeem"]),
  points: z.number().int().positive(),
  invoiceId: z.string().optional(),
  description: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { customerId: raw } = await params;
  const customerId = await resolveCustomerId(raw);
  if (!customerId) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const body = await req.json();
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { action, points, invoiceId, description } = parsed.data;

  try {
    if (action === "adjust") {
      await adjustPoints(customerId, points, description);
      return NextResponse.json({ success: true });
    }

    if (action === "redeem") {
      if (!invoiceId) {
        return NextResponse.json({ error: "invoiceId required for redeem" }, { status: 400 });
      }

      const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

      const discount = pointsToDollars(points);
      if (discount > invoice.amount - invoice.loyaltyDiscount) {
        return NextResponse.json({ error: "Points value exceeds invoice amount" }, { status: 400 });
      }

      await Promise.all([
        redeemPoints(customerId, points, invoiceId, description),
        db.invoice.update({
          where: { id: invoiceId },
          data: {
            loyaltyDiscount: { increment: discount },
            loyaltyPointsUsed: { increment: points },
          },
        }),
      ]);

      return NextResponse.json({ success: true, discountApplied: discount });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
