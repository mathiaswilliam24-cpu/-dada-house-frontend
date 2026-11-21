import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateTwilioRequest } from "@/lib/twilio-validate";
import { sendMissedCallSms } from "@/lib/messaging";
import { CallStatus } from "@/lib/generated/prisma/enums";
import { alertOwner } from "@/lib/inbound-sms-alert";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, CallStatus> = {
  ringing: "RINGING",
  "in-progress": "IN_PROGRESS",
  completed: "COMPLETED",
  busy: "BUSY",
  failed: "FAILED",
  "no-answer": "NO_ANSWER",
  canceled: "CANCELED",
};

/**
 * Configure as the Twilio number's "Call status changes" webhook, and as
 * the `action` URL on the outgoing-call <Dial> in voice/outgoing/route.ts.
 */
export async function POST(req: NextRequest) {
  const invalid = await validateTwilioRequest(req);
  if (invalid) return invalid;

  const formData = await req.formData();
  const callSid = String(formData.get("CallSid") ?? "");
  const rawStatus = String(formData.get("CallStatus") ?? formData.get("DialCallStatus") ?? "").toLowerCase();
  const duration = formData.get("CallDuration") ?? formData.get("DialCallDuration");

  const status = STATUS_MAP[rawStatus];
  if (!callSid || !status) return new NextResponse("<Response></Response>", { headers: { "Content-Type": "text/xml" } });

  const call = await db.call.findUnique({ where: { twilioCallSid: callSid } });
  if (!call) return new NextResponse("<Response></Response>", { headers: { "Content-Type": "text/xml" } });

  const isTerminal = ["COMPLETED", "BUSY", "FAILED", "NO_ANSWER", "CANCELED"].includes(status);

  await db.call.update({
    where: { id: call.id },
    data: {
      status,
      ...(status === "IN_PROGRESS" && !call.answeredAt && { answeredAt: new Date() }),
      ...(isTerminal && {
        endedAt: new Date(),
        durationSeconds: duration ? Number(duration) : call.durationSeconds,
      }),
    },
  });

  // Inbound call that ended without a conversation with a person (nobody accepted, the caller hung up
  // while ringing, a dispatcher accepted after the caller was gone, or it went to voicemail):
  // text the caller. Calls handed to the AI receptionist (Vapi) were answered — no text.
  if (call.direction === "INBOUND" && isTerminal) {
    const talkedToSomeone = call.status === "COMPLETED" && !!call.answeredAt;
    const aiAnswered = call.disposition === "TRANSFERRED_TO_VAPI";
    if (!talkedToSomeone && !aiAnswered) {
      await sendMissedCallSms(call.fromNumber, call.customerId).catch((err) => console.error("Missed-call SMS failed", err));
      // NO_ANSWER was set by the overflow step, which already alerted the owner.
      if (call.status !== "NO_ANSWER") {
        const base = (process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");
        await alertOwner(`DADA HOUSE - missed call from ${call.fromNumber} (caller hung up before anyone answered). The caller was texted. Call back: ${base}/calls`, [call.fromNumber]).catch(() => {});
      }
    }
  }

  return new NextResponse("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
}
