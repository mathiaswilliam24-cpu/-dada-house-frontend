import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const appointment = await db.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      appointmentNumber: true,
      service: true,
      address: true,
      city: true,
      techStatus: true,
      technicianId: true,
      technician: { select: { name: true } },
    },
  });

  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let location = null;
  if (appointment.techStatus === "EN_ROUTE" && appointment.technicianId) {
    location = await db.technicianLocation.findFirst({
      where: { userId: appointment.technicianId },
      orderBy: { timestamp: "desc" },
    });
  }

  return NextResponse.json({
    appointmentNumber: appointment.appointmentNumber,
    service: appointment.service,
    address: appointment.address,
    city: appointment.city,
    techStatus: appointment.techStatus,
    technicianName: appointment.technician?.name ?? null,
    location: location ? { lat: location.lat, lng: location.lng, timestamp: location.timestamp.toISOString() } : null,
  });
}
