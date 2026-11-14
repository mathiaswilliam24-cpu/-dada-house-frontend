import { db } from "@/lib/db";
import { getOpenAI } from "@/lib/openai";
import { UTApi } from "uploadthing/server";

/**
 * After a dispatcher call ends: copy the Twilio recording to UploadThing
 * (Twilio media needs account auth to play), save it as the call's
 * CallRecording, transcribe it with OpenAI, and store a speaker-labelled
 * transcript + short summary in aiTranscript / aiSummary for Call History.
 * Never throws.
 */
export async function processCallRecording(opts: {
  callId: string;
  recordingSid: string;
  recordingUrl: string;
  durationSeconds: number | null;
}) {
  try {
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const res = await fetch(`${opts.recordingUrl}.mp3`, { headers: { Authorization: `Basic ${auth}` } });
    if (!res.ok) throw new Error(`Recording download failed: ${res.status}`);
    const audio = new File([await res.arrayBuffer()], `call-${opts.recordingSid}.mp3`, { type: "audio/mpeg" });

    const up = await new UTApi().uploadFiles(audio);
    const url = up.error ? `${opts.recordingUrl}.mp3` : (up.data.ufsUrl ?? up.data.url);

    await db.callRecording.upsert({
      where: { callId: opts.callId },
      update: { twilioRecordingSid: opts.recordingSid, url, durationSeconds: opts.durationSeconds },
      create: { callId: opts.callId, twilioRecordingSid: opts.recordingSid, url, durationSeconds: opts.durationSeconds },
    });

    // Too short to contain a real conversation.
    if ((opts.durationSeconds ?? 0) < 3 || !process.env.OPENAI_API_KEY) return;

    const openai = getOpenAI();
    const raw = await openai.audio.transcriptions.create({ file: audio, model: "whisper-1" });
    const text = raw.text?.trim();
    if (!text) return;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You format phone-call transcripts for DADA HOUSE, a Houston home-services company (HVAC, plumbing, remodeling). " +
            "The call is between a CUSTOMER and a DADA HOUSE dispatcher. Use ONLY what is in the transcript — never invent names, prices, dates or details. " +
            'Return JSON: {"transcript": the conversation split into lines prefixed "Customer:" or "DADA HOUSE:", keeping the original wording and language, ' +
            '"summary": 2-4 sentences in English: what the customer needs, address/time/appointment details actually mentioned, and any follow-up promised}.',
        },
        { role: "user", content: text },
      ],
    });

    let transcript = text;
    let summary: string | null = null;
    try {
      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      if (typeof parsed.transcript === "string" && parsed.transcript.trim()) transcript = parsed.transcript.trim();
      if (typeof parsed.summary === "string" && parsed.summary.trim()) summary = parsed.summary.trim();
    } catch {}

    await db.call.update({ where: { id: opts.callId }, data: { aiTranscript: transcript, aiSummary: summary } });
  } catch (err) {
    console.error("Call recording processing failed", opts.callId, err);
  }
}
