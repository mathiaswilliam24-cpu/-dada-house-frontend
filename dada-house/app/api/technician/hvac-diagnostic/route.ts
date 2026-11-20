import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { HVAC_ADMIN_ROLES } from "@/lib/hvac/server";

export const dynamic = "force-dynamic";

/** My diagnostic sessions (drafts to resume + history) and my jobs to start one from. */
export async function GET(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;
  const admin = HVAC_ADMIN_ROLES.includes(auth.role);

  const sessions = await db.hvacDiagnosticSession.findMany({
    where: admin ? {} : { technicianId: auth.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true, status: true, step: true, complaint: true, mode: true, equipment: true, startedAt: true, updatedAt: true, completedAt: true, technicianName: true,
      appointment: { select: { id: true, appointmentNumber: true, name: true, address: true, city: true } },
    },
  });

  const now = Date.now();
  const jobs = await db.appointment.findMany({
    where: {
      status: { notIn: ["CANCELLED"] },
      OR: [{ technicianId: auth.id }, { assignments: { some: { technicianId: auth.id } } }],
      AND: [{ OR: [
        { scheduledStart: { gte: new Date(now - 3 * 86400000), lte: new Date(now + 3 * 86400000) } },
        { scheduledStart: null, updatedAt: { gte: new Date(now - 7 * 86400000) } },
      ] }],
    },
    orderBy: { scheduledStart: "asc" },
    take: 50,
    select: { id: true, appointmentNumber: true, name: true, address: true, city: true, service: true, scheduledStart: true, status: true },
  });

  return NextResponse.json({ sessions, jobs });
}

const createSchema = z.object({ appointmentId: z.string().min(1) });

/** Start (or resume) a diagnostic for a job. */
export async function POST(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose a job." }, { status: 400 });

  const job = await db.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
    select: { id: true, technicianId: true, customerId: true, description: true, assignments: { select: { technicianId: true } } },
  });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  const mine = job.technicianId === auth.id || job.assignments.some((a) => a.technicianId === auth.id);
  if (!mine && !HVAC_ADMIN_ROLES.includes(auth.role)) return NextResponse.json({ error: "This job is not assigned to you." }, { status: 403 });

  const draft = await db.hvacDiagnosticSession.findFirst({
    where: { appointmentId: job.id, technicianId: auth.id, status: { not: "COMPLETED" } },
    orderBy: { updatedAt: "desc" }, select: { id: true },
  });
  if (draft) return NextResponse.json({ id: draft.id, resumed: true });

  const s = await db.hvacDiagnosticSession.create({
    data: { appointmentId: job.id, customerId: job.customerId, technicianId: auth.id, technicianName: auth.name ?? null, notes: null },
    select: { id: true },
  });
  return NextResponse.json({ id: s.id, resumed: false }, { status: 201 });
}
