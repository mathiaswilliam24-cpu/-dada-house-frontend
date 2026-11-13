import { sendSMS } from "@/lib/twilio";
import { resend, FROM_EMAIL } from "@/lib/resend";

/**
 * Owner/staff alert for every inbound customer SMS, independent of browser
 * push (which only reaches devices that opted in — often none).
 *
 *   INBOUND_SMS_ALERT_PHONES  comma-separated E.164 numbers to text (falls back to ADMIN_PHONE)
 *   INBOUND_SMS_ALERT_EMAILS  comma-separated emails to notify (optional)
 *
 * Never throws — a failed alert must not break the Twilio webhook.
 */
function list(value: string | undefined) {
  return (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

function toE164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return `+${digits}`;
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

export async function alertOwnerOfInboundSms(opts: { from: string; senderName?: string; body: string }) {
  const businessNumber = toE164(process.env.TWILIO_PHONE_NUMBER ?? "");
  const sender = toE164(opts.from);
  const who = opts.senderName ? `${opts.senderName} (${sender})` : sender;
  const preview = opts.body.length > 300 ? `${opts.body.slice(0, 297)}...` : opts.body;
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");

  const phones = list(process.env.INBOUND_SMS_ALERT_PHONES || process.env.ADMIN_PHONE)
    .map(toE164)
    // Never text the business line itself (would loop back into this webhook) or the sender.
    .filter((p) => p !== businessNumber && p !== sender);
  const emails = list(process.env.INBOUND_SMS_ALERT_EMAILS);

  const smsText = `DADA HOUSE - new text from ${who}:\n"${preview}"\nReply: ${baseUrl}/messages`;

  await Promise.all([
    ...phones.map((to) =>
      sendSMS(to, smsText).catch((err) => console.error(`Inbound SMS alert to ${to} failed`, err))
    ),
    ...(emails.length
      ? [
          resend.emails
            .send({
              from: FROM_EMAIL,
              to: emails,
              subject: `New customer text from ${who}`,
              text: `${who} texted DADA HOUSE:\n\n${opts.body}\n\nReply here: ${baseUrl}/messages`,
            })
            .catch((err) => console.error("Inbound SMS email alert failed", err)),
        ]
      : []),
  ]);
}
