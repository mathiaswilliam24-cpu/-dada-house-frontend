import twilio from "twilio";

let _client: ReturnType<typeof twilio> | null = null;

export function getTwilioClient() {
  if (!_client) {
    _client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }
  return _client;
}

export const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER!;

/**
 * WhatsApp backup through wadadaAPI (sends from the WhatsApp number linked to the API key's session).
 * SMS_PROVIDER=whatsapp  → skip Twilio entirely (e.g. while the Twilio account is suspended).
 * otherwise              → Twilio first, WhatsApp only if Twilio fails.
 */
function whatsappConfigured() {
  return !!(process.env.WADADA_API_URL && process.env.WADADA_API_KEY);
}

export async function sendWhatsApp(to: string, body: string, mediaUrls?: string[]) {
  const digits = to.replace(/\D/g, "");
  const number = digits.length === 10 ? `+1${digits}` : `+${digits}`;
  const extra = (mediaUrls ?? []).filter((u) => !body.includes(u));
  const text = extra.length ? `${body}\n\n${extra.join("\n")}` : body;
  const res = await fetch(`${process.env.WADADA_API_URL!.replace(/\/$/, "")}/api/send-message`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WADADA_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: number, text }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = String(((await res.json()) as { message?: string }).message ?? ""); } catch { /* ignore */ }
    // 409 = the WhatsApp session is not connected (phone offline / unlinked).
    throw new Error(`WhatsApp (wadadaAPI) error ${res.status} ${detail}`.trim());
  }
  return { sid: undefined as string | undefined, channel: "whatsapp" as const };
}

export async function sendSMS(to: string, body: string, opts?: { statusCallback?: string; mediaUrls?: string[] }) {
  const twilioReady = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  const waOnly = process.env.SMS_PROVIDER === "whatsapp";

  if (waOnly && whatsappConfigured()) return sendWhatsApp(to, body, opts?.mediaUrls);

  if (!twilioReady) {
    if (whatsappConfigured()) return sendWhatsApp(to, body, opts?.mediaUrls);
    console.warn("Twilio not configured — skipping SMS");
    return;
  }
  try {
    const m = await getTwilioClient().messages.create({
      from: TWILIO_FROM, to, body,
      ...(opts?.statusCallback && { statusCallback: opts.statusCallback }),
      ...(opts?.mediaUrls?.length && { mediaUrl: opts.mediaUrls }),
    });
    return { sid: m.sid as string | undefined, channel: "sms" as const };
  } catch (err) {
    if (!whatsappConfigured()) throw err;
    console.warn(`Twilio SMS failed (${(err as Error).message}) — sending by WhatsApp instead`);
    try {
      return await sendWhatsApp(to, body, opts?.mediaUrls);
    } catch (waErr) {
      throw new Error(`SMS failed: ${(err as Error).message} · WhatsApp backup failed: ${(waErr as Error).message}`);
    }
  }
}
