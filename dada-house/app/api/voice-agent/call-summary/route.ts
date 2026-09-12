import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findOrCreateCustomerByPhone, normalizePhone } from "@/lib/customers";

export const dynamic = "force-dynamic";

/**
 * Called by the DADA HOUSE AI voice agent (Vapi, via dada-house-voice-agent)
 * right after a call ends, so the dispatcher can see what "Emma" discussed —
 * even for calls that never resulted in a booking.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const apiKey = authHeader.replace(/^Bearer\s+/i, "");
  if (!process.env.DADA_HOUSE_API_KEY || apiKey !== process.env.DADA_HOUSE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { vapiCallId, phone, startedAt, endedAt, summary, transcript, endedReason, recordingUrl } = body;

  if (!phone) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);
  const customer = await findOrCreateCustomerByPhone(normalizedPhone);

  const callStartedAt = startedAt ? new Date(startedAt) : new Date();
  const callEndedAt = endedAt ? new Date(endedAt) : new Date();
  const durationSeconds = Math.max(0, Math.round((callEndedAt.getTime() - callStartedAt.getTime()) / 1000));

  // The call already exists as a Call row (created when our own /api/twilio/voice/incoming
  // handed off to Vapi) unless the AI somehow handled it without ever going through our
  // system first. Match by phone + a loose time window around when Vapi says the call started.
  const windowStart = new Date(callStartedAt.getTime() - 15 * 60 * 1000);
  const windowEnd = new Date(callStartedAt.getTime() + 15 * 60 * 1000);

  const existingCall = await db.call.findFirst({
    where: {
      fromNumber: normalizedPhone,
      disposition: "TRANSFERRED_TO_VAPI",
      vapiCallId: null,
      startedAt: { gte: windowStart, lte: windowEnd },
    },
    orderBy: { startedAt: "desc" },
  });

  // If the AI booked an appointment during this call, it was already synced (and
  // customer-linked) via /api/voice-agent/appointments — find it so the dispatcher
  // can jump straight from the call summary to the job.
  const linkedAppointment = await db.appointment.findFirst({
    where: {
      customerId: customer.id,
      source: "voice_agent",
      createdAt: { gte: callStartedAt, lte: new Date(callEndedAt.getTime() + 5 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });

  const call = existingCall
    ? await db.call.update({
        where: { id: existingCall.id },
        data: {
          status: "COMPLETED",
          endedAt: callEndedAt,
          durationSeconds,
          vapiCallId: vapiCallId ?? undefined,
          aiSummary: summary ?? undefined,
          aiTranscript: transcript ?? undefined,
          aiRecordingUrl: recordingUrl ?? undefined,
          aiEndedReason: endedReason ?? undefined,
          appointmentId: linkedAppointment?.id ?? undefined,
        },
      })
    : await db.call.create({
        data: {
          twilioCallSid: vapiCallId ? `vapi_${vapiCallId}` : `vapi_${Date.now()}_${normalizedPhone}`,
          direction: "INBOUND",
          fromNumber: normalizedPhone,
          toNumber: process.env.CALL_CENTER_PHONE_NUMBER ?? "",
          status: "COMPLETED",
          disposition: "TRANSFERRED_TO_VAPI",
          customerId: customer.id,
          startedAt: callStartedAt,
          endedAt: callEndedAt,
          durationSeconds,
          vapiCallId: vapiCallId ?? undefined,
          aiSummary: summary ?? undefined,
          aiTranscript: transcript ?? undefined,
          aiRecordingUrl: recordingUrl ?? undefined,
          aiEndedReason: endedReason ?? undefined,
          appointmentId: linkedAppointment?.id ?? undefined,
        },
      });

  return NextResponse.json({ id: call.id }, { status: 200 });
}
