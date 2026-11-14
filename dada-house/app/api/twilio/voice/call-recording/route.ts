import { NextRequest, NextResponse, after } from "next/server";
import { validateTwilioRequest } from "@/lib/twilio-validate";
import { processCallRecording } from "@/lib/call-transcription";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** recordingStatusCallback for the recorded inbound <Dial> in voice/incoming. */
export async function POST(req: NextRequest) {
  const invalid = await validateTwilioRequest(req);
  if (invalid) return invalid;

  const formData = await req.formData();
  const callId = new URL(req.url).searchParams.get("callId");
  const recordingSid = String(formData.get("RecordingSid") ?? "");
  const recordingUrl = String(formData.get("RecordingUrl") ?? "");
  const status = String(formData.get("RecordingStatus") ?? "");
  const duration = formData.get("RecordingDuration");

  if (callId && recordingSid && recordingUrl && status === "completed") {
    // Download + transcription take a while — reply to Twilio first.
    after(() =>
      processCallRecording({
        callId,
        recordingSid,
        recordingUrl,
        durationSeconds: duration ? Number(duration) : null,
      })
    );
  }

  return new NextResponse("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
}
