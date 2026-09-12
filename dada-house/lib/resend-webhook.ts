import crypto from "crypto";

/**
 * Resend signs webhooks the Svix way: HMAC-SHA256 over `${id}.${timestamp}.${rawBody}`,
 * keyed by the base64 payload after the `whsec_` prefix. svix-signature can carry several
 * space-separated `v1,<sig>` values (key rotation) — any match is valid. Deliveries older
 * than 5 minutes are rejected to limit replay risk.
 */
export function verifyResendWebhook(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null }
): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;

  const timestampSeconds = Number(headers.timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Date.now() / 1000 - timestampSeconds) > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", key).update(signedContent).digest("base64");

  return headers.signature
    .split(" ")
    .map((part) => part.split(",")[1])
    .filter(Boolean)
    .some((candidate) => {
      try {
        return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
      } catch {
        return false;
      }
    });
}
