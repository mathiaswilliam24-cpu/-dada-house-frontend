import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { generateAppointmentNumber } from "@/lib/utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const conversation = await db.aIConversation.findUnique({ where: { sessionId: id } });
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  if (conversation.ticketCreated) {
    return NextResponse.json({ error: "Ticket already created" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: auth.id } });
  const appointment = await db.appointment.create({
    data: {
      appointmentNumber: generateAppointmentNumber(),
      userId: auth.id,
      service: conversation.serviceType ?? "General",
      name: user?.name ?? "Customer",
      phone: user?.phone ?? "",
      email: user?.email ?? "",
      address: "To be confirmed",
      description: `Created from AI conversation. Urgency: ${conversation.urgency ?? "unknown"}`,
      status: "PENDING",
    },
  });

  await db.aIConversation.update({
    where: { sessionId: id },
    data: { ticketCreated: true, appointmentId: appointment.id },
  });

  return NextResponse.json({ appointment });
}
