import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { notes, photos, partsUsed, laborHours } = body;

  const appointment = await db.appointment.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const log = await db.maintenanceLog.create({
    data: {
      appointmentId: id,
      userId: appointment.userId ?? auth.id,
      technicianId: auth.id,
      notes: notes ?? null,
      photos: photos ?? [],
      partsUsed: partsUsed ?? null,
      laborHours: laborHours ?? null,
    },
  });

  return NextResponse.json({ log });
}
