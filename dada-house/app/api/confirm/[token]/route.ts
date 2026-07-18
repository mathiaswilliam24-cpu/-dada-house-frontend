import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const appointment = await db.appointment.findFirst({
    where: { confirmationToken: token },
    select: { id: true, status: true, name: true, appointmentNumber: true, service: true, preferredDate: true, preferredTime: true },
  });

  if (!appointment) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  if (appointment.status !== "CONFIRMED") {
    await db.appointment.update({
      where: { id: appointment.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
  }

  return NextResponse.json({ success: true, appointment });
}
