import { db } from "@/lib/db";
import crypto from "crypto";

const CHARS = "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/l/i — avoids ambiguity when read aloud

function randomCode(length = 7): string {
  let code = "";
  for (const byte of crypto.randomBytes(length)) {
    code += CHARS[byte % CHARS.length];
  }
  return code;
}

/** Creates a short redirect link for a long URL (e.g. an invoice/estimate
 *  link with a security token) so it reads cleanly in an SMS. */
export async function createShortLink(targetUrl: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      await db.shortLink.create({ data: { code, targetUrl } });
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dada-house.com";
      return `${baseUrl}/r/${code}`;
    } catch {
      // Unique constraint collision — extremely unlikely, just retry.
    }
  }
  return targetUrl; // fall back to the full URL rather than fail the send
}
