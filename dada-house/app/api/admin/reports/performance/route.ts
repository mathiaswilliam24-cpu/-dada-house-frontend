import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const technicians = await db.user.findMany({
    where: { role: "TECHNICIAN" },
    select: {
      id: true,
      name: true,
      image: true,
      technicianAppointments: {
        select: { status: true },
      },
    },
  });

  const logs = await db.maintenanceLog.groupBy({
    by: ["technicianId"],
    _avg: { laborHours: true },
    _count: { id: true },
  });

  const logMap = new Map(logs.map((l) => [l.technicianId, l]));

  const data = technicians.map((t) => {
    const total = t.technicianAppointments.length;
    const completed = t.technicianAppointments.filter((a) => a.status === "COMPLETED").length;
    const log = logMap.get(t.id);
    return {
      id: t.id,
      name: t.name,
      image: t.image,
      totalJobs: total,
      completedJobs: completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgLaborHours: log?._avg.laborHours ?? 0,
    };
  });

  return NextResponse.json({ data });
}
