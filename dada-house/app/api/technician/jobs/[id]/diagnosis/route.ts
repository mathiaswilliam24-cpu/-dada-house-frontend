import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { diagnosisSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const diagnosis = await db.diagnosisForm.findUnique({ where: { appointmentId: id } });
  return NextResponse.json({ diagnosis });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const result = diagnosisSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const appointment = await db.appointment.findFirst({
    where: { id, technicianId: auth.role === "ADMIN" ? undefined : auth.id },
  });
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const diagnosis = await db.diagnosisForm.upsert({
    where: { appointmentId: id },
    create: {
      appointmentId: id,
      technicianId: auth.id,
      ...result.data,
    },
    update: { ...result.data },
  });

  // Auto-advance status to DIAGNOSING if still at ARRIVED
  if (appointment.techStatus === "ARRIVED") {
    await db.appointment.update({ where: { id }, data: { techStatus: "DIAGNOSING" } });
  }

  return NextResponse.json({ diagnosis });
}
