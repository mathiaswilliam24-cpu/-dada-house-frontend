import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateTwilioRequest } from "@/lib/twilio-validate";
import { sendMissedCallSms } from "@/lib/messaging";
import { CallStatus } from "@/lib/generated/prisma/enums";

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

  if (call.direction === "INBOUND" && (status === "NO_ANSWER" || status === "BUSY") && !call.answeredAt) {
    await sendMissedCallSms(call.fromNumber, call.customerId).catch((err) => console.error("Missed-call SMS failed", err));
  }

  return new NextResponse("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
}
