import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;

  const { appointmentId, technicianId, eta } = await req.json();
  if (!appointmentId || !technicianId) {
    return NextResponse.json({ error: "appointmentId and technicianId are required" }, { status: 400 });
  }

  const appointment = await db.appointment.update({
    where: { id: appointmentId },
    data: {
      technicianId,
      dispatcherId: auth.id,
      eta: eta ? new Date(eta) : null,
    },
  });

  const tech = await db.user.findUnique({ where: { id: technicianId }, select: { phone: true, name: true } });
  if (tech?.phone) {
    sendSMS(
      tech.phone,
      `DADA HOUSE: You've been assigned job #${appointment.appointmentNumber}. Service: ${appointment.service} at ${appointment.address}. Date: ${appointment.preferredDate?.toLocaleDateString() ?? "TBD"}.`
    ).catch(console.error);
  }

  // Auto-add client to technician's client list (skip duplicates by email)
  if (appointment.email) {
    const existing = await db.technicianClient.findFirst({
      where: { technicianId, email: appointment.email },
    });
    if (!existing) {
      await db.technicianClient.create({
        data: {
          technicianId,
          name: appointment.name,
          email: appointment.email,
          phone: appointment.phone,
          address: appointment.address,
          city: appointment.city,
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ appointment });
}
