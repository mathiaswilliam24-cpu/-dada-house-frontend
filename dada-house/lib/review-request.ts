import { sendSMS } from "@/lib/twilio";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { buildReviewRequestEmail } from "@/lib/email-templates";

const REVIEW_URL = "https://dada-house.com/reviews";

export async function sendReviewRequest(appointment: {
  name: string;
  phone: string | null;
  email: string | null;
  service: string;
}): Promise<Record<string, string>> {
  const message = `Hi ${appointment.name}! Thank you for choosing DADA HOUSE for your ${appointment.service} service. We'd love your feedback — leave a review at ${REVIEW_URL}`;

  const results: Record<string, string> = {};

  if (appointment.phone) {
    await sendSMS(appointment.phone, message)
      .then(() => { results.sms = "sent"; })
      .catch(() => { results.sms = "failed"; });
  }

  if (appointment.email) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: appointment.email,
      subject: "How was your DADA HOUSE service?",
      html: buildReviewRequestEmail(appointment.name, appointment.service, REVIEW_URL),
    }).then(() => { results.email = "sent"; })
      .catch(() => { results.email = "failed"; });
  }

  return results;
}
