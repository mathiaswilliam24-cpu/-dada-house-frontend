import { NextRequest, NextResponse, after } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendTechnicianAssignmentNotification } from "@/lib/appointment-notifications";

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

  after(() =>
    sendTechnicianAssignmentNotification(appointmentId).catch((err) =>
      console.error("Technician assignment notification failed", err)
    )
  );

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
