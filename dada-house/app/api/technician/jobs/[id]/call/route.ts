import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getTwilioClient } from "@/lib/twilio";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const staffRoles = ["ADMIN", "SUPER_ADMIN"];
  const job = await db.appointment.findFirst({
    where: { id, technicianId: staffRoles.includes(auth.role) ? undefined : auth.id },
    select: { phone: true, customerId: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!job.phone) return NextResponse.json({ error: "No customer phone number on file for this job." }, { status: 400 });

  const technician = await db.user.findUnique({ where: { id: auth.id }, select: { phone: true } });
  if (!technician?.phone) {
    return NextResponse.json({ error: "Add your phone number in Profile to enable in-app calling." }, { status: 400 });
  }

  const callerId = process.env.CALL_CENTER_PHONE_NUMBER;
  const baseUrl = process.env.TWILIO_WEBHOOK_BASE_URL;
  if (!callerId || !baseUrl) {
    return NextResponse.json({ error: "Calling isn't configured yet." }, { status: 503 });
  }

  const client = getTwilioClient();
  const bridgeUrl = `${baseUrl.replace(/\/$/, "")}/api/twilio/voice/technician-bridge?customerPhone=${encodeURIComponent(job.phone)}&jobId=${encodeURIComponent(id)}&technicianId=${encodeURIComponent(auth.id)}`;
  const statusUrl = `${baseUrl.replace(/\/$/, "")}/api/twilio/voice/status`;

  const call = await client.calls.create({
    to: technician.phone,
    from: callerId,
    url: bridgeUrl,
    statusCallback: statusUrl,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
  });

  await db.call.create({
    data: {
      twilioCallSid: call.sid,
      direction: "OUTBOUND",
      fromNumber: callerId,
      toNumber: job.phone,
      status: "RINGING",
      customerId: job.customerId,
      agentId: auth.id,
      appointmentId: id,
    },
  }).catch((err) => console.error("Failed to log technician-bridge call:", err));

  return NextResponse.json({ success: true });
}
