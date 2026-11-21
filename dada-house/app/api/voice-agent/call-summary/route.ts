import { NextRequest, NextResponse, after } from "next/server";
import { sendSMS } from "@/lib/twilio";
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

  // Same Vapi call reported twice → nothing to do (and no second admin text).
  if (vapiCallId) {
    const dup = await db.call.findFirst({ where: { vapiCallId }, select: { id: true } });
    if (dup) return NextResponse.json({ id: dup.id, duplicate: true }, { status: 200 });
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

  // Report to the supervisor: one text per AI conversation.
  after(() => reportToAdmin({
    phone: normalizedPhone, name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
    durationSeconds, summary, endedReason, appointmentNumber: linkedAppointment?.appointmentNumber ?? null, callId: call.id,
  }).catch((e) => console.error("call report sms", e)));

  return NextResponse.json({ id: call.id }, { status: 200 });
}

const TRANSFER_REASONS = /forward|transfer/i;

/** "Compte rendu" text to the admin after every AI receptionist conversation. */
async function reportToAdmin(r: { phone: string; name: string; durationSeconds: number; summary?: string | null; endedReason?: string | null; appointmentNumber: string | null; callId: string }) {
  const to = (process.env.VOICE_REPORT_PHONES || process.env.ADMIN_PHONE || "").split(",").map((x) => x.trim()).filter(Boolean);
  const business = (process.env.TWILIO_PHONE_NUMBER ?? "").replace(/\D/g, "").slice(-10);
  if (!to.length) return;
  const min = Math.floor(r.durationSeconds / 60), sec = r.durationSeconds % 60;
  const summary = (r.summary ?? "").trim();
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");
  const text = [
    `DADA HOUSE - Compte rendu d'appel (Sarah)`,
    `Client : ${r.name || "inconnu"} ${r.phone}`,
    `Durée : ${min} min ${String(sec).padStart(2, "0")} s${r.endedReason && TRANSFER_REASONS.test(r.endedReason) ? " · transféré au dispatcher" : ""}`,
    r.appointmentNumber ? `Job créé : #${r.appointmentNumber}` : null,
    summary ? `Résumé : ${summary.length > 700 ? `${summary.slice(0, 697)}...` : summary}` : "Résumé : non disponible",
    `${base}/calls`,
  ].filter(Boolean).join("\n");
  for (const n of to) if (n.replace(/\D/g, "").slice(-10) !== business) await sendSMS(n, text).catch((e) => console.error("report sms", e));
}
