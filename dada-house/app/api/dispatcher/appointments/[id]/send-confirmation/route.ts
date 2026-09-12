import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendAppointmentConfirmationEmail } from "@/lib/appointment-notifications";

export const dynamic = "force-dynamic";

/** Manual re-send of the confirmation email (auto-sent already at creation — this is for a resend). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const appointment = await db.appointment.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  if (appointment.status === "CONFIRMED") return NextResponse.json({ error: "Already confirmed" }, { status: 400 });

  const result = await sendAppointmentConfirmationEmail(id);
  if (!result) return NextResponse.json({ error: "Customer has no email on file" }, { status: 400 });

  return NextResponse.json({ success: true, confirmUrl: result.confirmUrl });
}
