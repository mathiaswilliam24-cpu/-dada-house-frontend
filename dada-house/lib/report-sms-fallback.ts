import crypto from "crypto";
import { createShortLink } from "@/lib/short-links";
import { sendOutboundSms, DoNotContactError } from "@/lib/messaging";

/** Random, non-expiring token identifying one report for the public PDF-view
 *  route (`/api/reports/[token]`) — same convention as Invoice/Estimate
 *  paymentToken, just generated once per report rather than per record. */
export function generateReportToken(): string {
  return crypto.randomBytes(20).toString("hex");
}

/** Texts a customer a link to view their service report PDF, for jobs with
 *  no email on file (the only delivery channel that was silently skipped
 *  before this existed). Returns false (without throwing) if the number has
 *  opted out of texts — callers shouldn't treat that as a hard failure. */
export async function sendReportLinkSms({
  phone,
  sentById,
  customerName,
  reportLabel,
  reportToken,
}: {
  phone: string;
  sentById: string;
  customerName: string;
  reportLabel: string;
  reportToken: string;
}): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dada-house.com";
  const shortUrl = await createShortLink(`${baseUrl}/api/reports/${reportToken}`);
  const text = `Hi ${customerName}, your ${reportLabel} from DADA HOUSE is ready to view: ${shortUrl}`;

  try {
    await sendOutboundSms(phone, text, { sentById });
    return true;
  } catch (err) {
    if (err instanceof DoNotContactError) return false;
    throw err;
  }
}
