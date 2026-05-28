import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { appointmentId } = await params;

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: { userId: true, technicianId: true },
  });

  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = appointment.userId === auth.id;
  const isAdmin = auth.role === "ADMIN" || auth.role === "DISPATCHER";
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!appointment.technicianId) return NextResponse.json({ location: null });

  const location = await db.technicianLocation.findFirst({
    where: { userId: appointment.technicianId },
    orderBy: { timestamp: "desc" },
  });

  return NextResponse.json({ location });
}
