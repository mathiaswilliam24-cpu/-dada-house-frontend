import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), 11 - i);
    return {
      start: startOfMonth(date),
      end: endOfMonth(date),
      label: date.toLocaleString("en-US", { month: "short", year: "numeric" }),
    };
  });

  const data = await Promise.all(
    months.map(async ({ start, end, label }) => {
      const [invoices, orders] = await Promise.all([
        db.invoice.aggregate({
          where: { status: "PAID", paidAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        db.order.aggregate({
          where: { status: { in: ["PROCESSING", "ASSIGNED", "EN_ROUTE", "ARRIVED", "INSTALLED"] }, paidAt: { gte: start, lte: end } },
          _sum: { total: true },
        }),
      ]);
      return {
        month: label,
        invoiceRevenue: invoices._sum.amount ?? 0,
        orderRevenue: orders._sum.total ?? 0,
        total: (invoices._sum.amount ?? 0) + (orders._sum.total ?? 0),
      };
    })
  );

  return NextResponse.json({ data });
}
