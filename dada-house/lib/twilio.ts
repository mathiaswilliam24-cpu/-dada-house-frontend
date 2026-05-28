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

export async function sendSMS(to: string, body: string) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn("Twilio not configured — skipping SMS");
    return;
  }
  try {
    const client = getTwilioClient();
    await client.messages.create({ from: TWILIO_FROM, to, body });
  } catch (err) {
    console.error("SMS failed:", err);
  }
}
