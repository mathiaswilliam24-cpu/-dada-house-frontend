import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, pending, completed, thisMonth, invoiceSum, serviceGroups] =
    await Promise.all([
      db.appointment.count(),
      db.appointment.count({ where: { status: "PENDING" } }),
      db.appointment.count({ where: { status: "COMPLETED" } }),
      db.appointment.count({ where: { createdAt: { gte: startOfMonth } } }),
      db.invoice.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
      db.appointment.groupBy({
        by: ["service"],
        _count: { service: true },
        orderBy: { _count: { service: "desc" } },
      }),
    ]);

  const monthlyData = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = await db.appointment.count({
        where: { createdAt: { gte: start, lte: end } },
      });
      return {
        month: start.toLocaleString("en-US", { month: "short" }),
        count,
      };
    })
  );

  return NextResponse.json({
    total,
    pending,
    completed,
    thisMonth,
    revenue: invoiceSum._sum.amount ?? 0,
    monthlyData,
    serviceBreakdown: serviceGroups.map((g) => ({
      service: g.service,
      count: g._count.service,
    })),
  });
}
