import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const techId = auth.id;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [allJobs, monthJobs, weekJobs, timeLogs, reviews] = await Promise.all([
    db.appointment.findMany({
      where: { technicianId: techId },
      include: { invoice: { select: { amount: true } }, parts: { select: { totalCost: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.appointment.findMany({
      where: { technicianId: techId, updatedAt: { gte: monthStart, lte: monthEnd }, techStatus: "COMPLETED" },
      include: { invoice: { select: { amount: true } } },
    }),
    db.appointment.findMany({
      where: { technicianId: techId, updatedAt: { gte: weekStart, lte: weekEnd }, techStatus: "COMPLETED" },
    }),
    db.jobTimeLog.findMany({
      where: { technicianId: techId, totalMinutes: { not: null } },
    }),
    db.review.findMany({
      where: { approved: true },
      select: { rating: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const totalCompleted = allJobs.filter((j) => j.techStatus === "COMPLETED").length;
  const monthRevenue = monthJobs.reduce((s, j) => s + ((j as any).invoice?.amount ?? j.totalAmount ?? 0), 0);
  const weekCompleted = weekJobs.length;

  const avgJobTime =
    timeLogs.length > 0
      ? Math.round(timeLogs.reduce((s, t) => s + (t.totalMinutes ?? 0), 0) / timeLogs.length)
      : 0;

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const serviceBreakdown: Record<string, number> = {};
  allJobs.forEach((j) => {
    serviceBreakdown[j.service] = (serviceBreakdown[j.service] ?? 0) + 1;
  });

  return NextResponse.json({
    summary: {
      totalCompleted,
      monthCompleted: monthJobs.length,
      weekCompleted,
      monthRevenue,
      avgJobTimeMinutes: avgJobTime,
      avgRating: Math.round(avgRating * 10) / 10,
    },
    serviceBreakdown,
    recentJobs: allJobs.slice(0, 10).map((j) => ({
      id: j.id,
      appointmentNumber: j.appointmentNumber,
      service: j.service,
      name: j.name,
      techStatus: j.techStatus,
      completedAt: j.approvedAt,
      revenue: (j as any).invoice?.amount ?? j.totalAmount ?? 0,
    })),
  });
}
