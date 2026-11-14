import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateTwilioRequest } from "@/lib/twilio-validate";
import { alertOwner } from "@/lib/inbound-sms-alert";

export const dynamic = "force-dynamic";

/** recordingStatusCallback target for the voicemail <Record> verb in voice/incoming. */
export async function POST(req: NextRequest) {
  const invalid = await validateTwilioRequest(req);
  if (invalid) return invalid;

  const formData = await req.formData();
  const recordingSid = String(formData.get("RecordingSid") ?? "");
  const recordingUrl = String(formData.get("RecordingUrl") ?? "");
  const duration = formData.get("RecordingDuration");
  const callSid = String(formData.get("CallSid") ?? "");

  if (!recordingSid || !recordingUrl) {
    return new NextResponse("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
  }

  const call = await db.call.findUnique({ where: { twilioCallSid: callSid } });

  await db.voicemail.create({
    data: {
      callId: call?.id,
      twilioRecordingSid: recordingSid,
      fromNumber: call?.fromNumber ?? "",
      toNumber: call?.toNumber ?? "",
      url: `${recordingUrl}.mp3`,
      durationSeconds: duration ? Number(duration) : null,
      customerId: call?.customerId,
    },
  }).catch(() => {});

  if (call) {
    await db.call.update({ where: { id: call.id }, data: { status: "VOICEMAIL", endedAt: new Date() } }).catch(() => {});
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");
  await alertOwner(
    `DADA HOUSE - new voicemail${call?.fromNumber ? ` from ${call.fromNumber}` : ""}${duration ? ` (${duration}s)` : ""}. Listen: ${appUrl}/calls`,
    call?.fromNumber ? [call.fromNumber] : []
  );

  return new NextResponse("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
}
