import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, addWeeks } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const techId = auth.id;
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const allJobs = await db.appointment.findMany({
    where: { technicianId: techId },
    orderBy: { preferredDate: "asc" },
    include: {
      invoice: { select: { amount: true, status: true } },
      diagnosisForm: { select: { id: true, customerApproved: true } },
      timeLog: { select: { arrivedAt: true, completedAt: true, totalMinutes: true } },
      parts: { select: { totalCost: true } },
    },
  });

  const today = allJobs.filter(
    (j) =>
      j.preferredDate &&
      j.preferredDate >= todayStart &&
      j.preferredDate <= todayEnd &&
      j.techStatus !== "COMPLETED" &&
      j.techStatus !== "CANCELED"
  );

  const emergency = allJobs.filter(
    (j) =>
      j.isEmergency &&
      j.techStatus !== "COMPLETED" &&
      j.techStatus !== "CANCELED"
  );

  const upcoming = allJobs.filter(
    (j) =>
      j.preferredDate &&
      j.preferredDate > todayEnd &&
      j.techStatus !== "COMPLETED" &&
      j.techStatus !== "CANCELED"
  );

  const pending = allJobs.filter(
    (j) =>
      (!j.techStatus || j.techStatus === "ASSIGNED") &&
      j.status !== "CANCELLED"
  );

  const completedToday = allJobs.filter(
    (j) =>
      j.techStatus === "COMPLETED" &&
      j.updatedAt >= todayStart &&
      j.updatedAt <= todayEnd
  );

  const dailyRevenue = completedToday.reduce((sum, j) => {
    const inv = (j as any).invoice;
    return sum + (inv?.amount ?? j.totalAmount ?? 0);
  }, 0);

  // weekly schedule (current + next week)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
  const weekJobs = allJobs.filter(
    (j) => j.preferredDate && j.preferredDate >= weekStart && j.preferredDate <= weekEnd
  );

  return NextResponse.json({
    today,
    emergency,
    upcoming,
    pending,
    completedToday,
    weekJobs,
    stats: {
      todayCount: today.length,
      emergencyCount: emergency.length,
      completedCount: completedToday.length,
      pendingCount: pending.length,
      dailyRevenue,
    },
  });
}
