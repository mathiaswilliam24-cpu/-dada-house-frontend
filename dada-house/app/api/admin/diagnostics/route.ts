import { NextRequest, NextResponse } from "next/server";
import { requireSupervisor } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireSupervisor(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const [diagnostics, awaitingReview] = await Promise.all([
    db.serviceDiagnostic.findMany({
      where: status && status !== "ALL" ? { status: status as never } : {},
      orderBy: { updatedAt: "desc" },
      include: {
        appointment: { select: { appointmentNumber: true, name: true, service: true } },
      },
    }),
    db.serviceDiagnostic.count({ where: { status: "AWAITING_SUPERVISOR_REVIEW" } }),
  ]);

  const technicianIds = [...new Set(diagnostics.map((d) => d.technicianId).filter(Boolean))] as string[];
  const technicians = await db.user.findMany({ where: { id: { in: technicianIds } }, select: { id: true, name: true } });
  const techMap = new Map(technicians.map((t) => [t.id, t.name]));

  return NextResponse.json({
    diagnostics: diagnostics.map((d) => ({
      id: d.id,
      appointmentId: d.appointmentId,
      appointmentNumber: d.appointment.appointmentNumber,
      customerName: d.appointment.name,
      service: d.appointment.service,
      technicianName: d.technicianId ? techMap.get(d.technicianId) ?? null : null,
      status: d.status,
      repairUrgency: d.repairUrgency,
      completedAt: d.completedAt,
      updatedAt: d.updatedAt,
    })),
    counts: { awaitingReview },
  });
}
