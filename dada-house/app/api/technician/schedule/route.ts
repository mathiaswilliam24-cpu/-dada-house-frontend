import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { ctParts, ctInstant } from "@/lib/dispatch-time";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const techId = auth.id;
  const now = new Date();
  // North Carolina calendar day (the server runs in UTC).
  const todayYmd = ctParts(now).ymd;
  const todayStart = ctInstant(todayYmd, 0);
  const todayEnd = new Date(ctInstant(todayYmd, 1440).getTime() - 1);

  const rawJobs = await db.appointment.findMany({
    where: { OR: [{ technicianId: techId }, { assignments: { some: { technicianId: techId } } }] },
    orderBy: [{ scheduledStart: "asc" }, { preferredDate: "asc" }],
    include: {
      assignments: { where: { technicianId: techId }, select: { role: true } },
      invoice: { select: { amount: true, status: true } },
      diagnosisForm: { select: { id: true, customerApproved: true } },
      timeLog: { select: { arrivedAt: true, completedAt: true, totalMinutes: true } },
      parts: { select: { totalCost: true } },
    },
  });
  // The board slot (scheduledStart) is the source of truth for the day when present.
  const allJobs = rawJobs.map((j) => ({
    ...j,
    preferredDate: j.scheduledStart ?? j.preferredDate,
    crewRole: j.technicianId === techId ? null : j.assignments[0]?.role ?? "HELPER",
  }));

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
