import { NextRequest, NextResponse } from "next/server";
import { requireSupervisor } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireSupervisor(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const [startups, awaitingReview] = await Promise.all([
    db.systemStartup.findMany({
      where: status && status !== "ALL" ? { status: status as never } : {},
      orderBy: { updatedAt: "desc" },
      include: { appointment: { select: { appointmentNumber: true, name: true, service: true } } },
    }),
    db.systemStartup.count({ where: { status: "AWAITING_SUPERVISOR_REVIEW" } }),
  ]);

  const technicianIds = [...new Set(startups.map((s) => s.technicianId).filter(Boolean))] as string[];
  const technicians = await db.user.findMany({ where: { id: { in: technicianIds } }, select: { id: true, name: true } });
  const techMap = new Map(technicians.map((t) => [t.id, t.name]));

  return NextResponse.json({
    startups: startups.map((s) => ({
      id: s.id,
      appointmentId: s.appointmentId,
      appointmentNumber: s.appointment.appointmentNumber,
      customerName: s.appointment.name,
      service: s.appointment.service,
      technicianName: s.technicianId ? techMap.get(s.technicianId) ?? null : null,
      status: s.status,
      finalStartupResult: s.finalStartupResult,
      completedAt: s.completedAt,
      updatedAt: s.updatedAt,
    })),
    counts: { awaitingReview },
  });
}
