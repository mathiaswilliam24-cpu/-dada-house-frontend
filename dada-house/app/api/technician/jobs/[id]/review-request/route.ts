import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";
import { resend, FROM_EMAIL } from "@/lib/resend";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const appointment = await db.appointment.findFirst({
    where: { id },
    select: { name: true, phone: true, email: true, service: true },
  });
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reviewUrl = "https://dada-house.com/reviews";
  const message = `Hi ${appointment.name}! Thank you for choosing DADA HOUSE for your ${appointment.service} service. We'd love your feedback — leave a review at ${reviewUrl}`;

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
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1B3FA8;">Thank You, ${appointment.name}!</h2>
          <p>We hope you're happy with your recent <strong>${appointment.service}</strong> service.</p>
          <p>Your feedback means the world to us and helps other Houston homeowners find quality service.</p>
          <a href="${reviewUrl}" style="display: inline-block; background: #1B3FA8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            Leave a Review
          </a>
          <p style="color: #666; font-size: 14px;">Thank you for choosing DADA HOUSE!</p>
        </div>
      `,
    }).then(() => { results.email = "sent"; })
      .catch(() => { results.email = "failed"; });
  }

  return NextResponse.json({ ok: true, results });
}
