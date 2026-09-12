import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const timeLog = await db.jobTimeLog.findUnique({ where: { appointmentId: id } });
  return NextResponse.json({ timeLog });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { arrivedAt, startedAt, completedAt, workPerformed, action } = body;

  if (action === "play" || action === "pause") {
    const existing = await db.jobTimeLog.findUnique({ where: { appointmentId: id } });
    let accumulatedSeconds = existing?.accumulatedSeconds ?? 0;
    let timerStartedAt: Date | null = existing?.timerStartedAt ?? null;

    if (action === "play" && !timerStartedAt) {
      timerStartedAt = new Date();
    } else if (action === "pause" && timerStartedAt) {
      accumulatedSeconds += Math.round((Date.now() - timerStartedAt.getTime()) / 1000);
      timerStartedAt = null;
    }

    const timeLog = await db.jobTimeLog.upsert({
      where: { appointmentId: id },
      create: { appointmentId: id, technicianId: auth.id, timerStartedAt, accumulatedSeconds },
      update: { timerStartedAt, accumulatedSeconds },
    });
    return NextResponse.json({ timeLog });
  }

  const data: Record<string, unknown> = {};
  if (arrivedAt !== undefined) data.arrivedAt = arrivedAt ? new Date(arrivedAt) : null;
  if (startedAt !== undefined) data.startedAt = startedAt ? new Date(startedAt) : null;
  if (completedAt !== undefined) data.completedAt = completedAt ? new Date(completedAt) : null;
  if (workPerformed !== undefined) data.workPerformed = workPerformed;

  // Auto-calculate total minutes
  const existing = await db.jobTimeLog.findUnique({ where: { appointmentId: id } });
  const start = data.startedAt ?? existing?.startedAt;
  const end = data.completedAt ?? existing?.completedAt;
  if (start && end) {
    data.totalMinutes = Math.round((new Date(end as string).getTime() - new Date(start as string).getTime()) / 60000);
  }

  const timeLog = await db.jobTimeLog.upsert({
    where: { appointmentId: id },
    create: { appointmentId: id, technicianId: auth.id, ...data },
    update: data,
  });

  return NextResponse.json({ timeLog });
}
