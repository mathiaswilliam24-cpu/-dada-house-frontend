import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { voiceAgentAppointmentSchema } from "@/lib/validations";
import { generateAppointmentNumber } from "@/lib/utils";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { sendSMS } from "@/lib/twilio";
import { sendOutboundSms } from "@/lib/messaging";
import { appointmentConfirmationHtml, adminAppointmentAlertHtml } from "@/lib/email-templates";
import { findOrCreateCustomerByPhone } from "@/lib/customers";
import crypto from "crypto";

// Maps the Vapi voice agent's `service_type` enum to the labels used
// throughout the website (booking form, admin filters, etc.)
const SERVICE_MAP: Record<string, string> = {
  Plumbing: "Plumbing",
  AC: "Air Conditioning",
  "Air Conditioning": "Air Conditioning",
  Heating: "Heating",
  Remodeling: "Remodeling",
  "Home Inspection": "Home Inspection",
  General: "General",
};

// Called by the DADA HOUSE AI voice agent (Vapi) right after it books an
// appointment, so the booking shows up on the admin/dispatcher dashboard.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const apiKey = authHeader.replace(/^Bearer\s+/i, "");
  if (!process.env.DADA_HOUSE_API_KEY || apiKey !== process.env.DADA_HOUSE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const parsed = voiceAgentAppointmentSchema.safeParse({
      ...body,
      service: SERVICE_MAP[body.service] ?? body.service,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { calendarSynced, diagnosticFee, ...data } = parsed.data;
    const isDiagnostic = typeof diagnosticFee === "number" && diagnosticFee > 0;

    const appointmentNumber = generateAppointmentNumber();
    const customer = await findOrCreateCustomerByPhone(data.phone, {
      firstName: data.name,
      email: data.email,
    });

    const appointment = await db.appointment.create({
      data: {
        appointmentNumber,
        ...data,
        preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
        status: isDiagnostic ? "PENDING" : (calendarSynced ? "CONFIRMED" : "PENDING"),
        source: "voice_agent",
        customerId: customer.id,
        ...(isDiagnostic ? { diagnosticFee, diagnosticFeeStatus: "PENDING" } : {}),
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mydadahouse.com";

    if (isDiagnostic) {
      // Create payment invoice for diagnostic fee
      const paymentToken = crypto.randomBytes(6).toString("hex");
      await db.invoice.create({
        data: {
          appointmentId: appointment.id,
          amount: diagnosticFee!,
          status: "SENT",
          paymentToken,
          notes: `Diagnostic fee — appointment #${appointmentNumber}`,
          lineItems: {
            items: [{ description: `Diagnostic Fee — ${data.service}`, rate: diagnosticFee!, qty: 1 }],
            taxEnabled: false,
            taxRate: 0,
          },
        },
      });

      const payUrl = `${baseUrl}/pay/${paymentToken}`;
      const date = appointment.preferredDate
        ? new Date(appointment.preferredDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "a date TBD";
      const timeStr = appointment.preferredTime ? ` at ${appointment.preferredTime}` : "";

      after(async () => {
        await Promise.allSettled([
          // SMS to client with payment link
          sendOutboundSms(
            data.phone,
            `DADA HOUSE: Hi ${data.name}, your ${data.service} appointment #${appointmentNumber} on ${date}${timeStr} at ${data.address} is PENDING. Please pay the $${diagnosticFee} diagnostic fee to confirm — due at least 8 hrs before your appointment. Pay here: ${payUrl}`
          ).catch(console.error),

          // Email to client with payment link
          data.email
            ? resend.emails.send({
                from: FROM_EMAIL,
                to: data.email,
                subject: `Action Required: Pay Diagnostic Fee — Appointment #${appointmentNumber}`,
                html: buildDiagnosticEmail({ appointmentNumber, name: data.name, service: data.service, address: data.address, city: data.city, date, timeStr, fee: diagnosticFee!, payUrl }),
              }).catch(console.error)
            : Promise.resolve(),

          // Admin alert
          process.env.ADMIN_PHONE
            ? sendSMS(
                process.env.ADMIN_PHONE,
                `DADA HOUSE DIAGNOSTIC (Voice Agent) #${appointmentNumber}\nService: ${data.service}\nClient: ${data.name}\nPhone: ${data.phone}\nFee: $${diagnosticFee}\nAddress: ${data.address}${data.preferredDate ? `\nDate: ${data.preferredDate}${data.preferredTime ? ` at ${data.preferredTime}` : ""}` : ""}`
              ).catch(console.error)
            : Promise.resolve(),
        ]);
      });

      return NextResponse.json(
        { id: appointment.id, appointmentNumber: appointment.appointmentNumber, status: appointment.status, diagnosticPaymentUrl: payUrl },
        { status: 201 }
      );
    }

    // Standard flow — no diagnostic fee
    const emailData = {
      appointmentNumber,
      name: data.name,
      service: data.service,
      address: data.address,
      city: data.city,
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      description: data.description,
    };

    after(async () => {
      await Promise.allSettled([
        data.email
          ? resend.emails
              .send({
                from: FROM_EMAIL,
                to: data.email,
                subject: `DADA HOUSE — Appointment #${appointmentNumber} Confirmed`,
                html: appointmentConfirmationHtml(emailData),
              })
              .catch(console.error)
          : Promise.resolve(),

        sendSMS(
          data.phone,
          `DADA HOUSE: Hi ${data.name}, your appointment #${appointmentNumber} for ${data.service} is confirmed${data.preferredDate ? ` for ${data.preferredDate}${data.preferredTime ? ` at ${data.preferredTime}` : ""}` : ""}. Questions? Call (844) 928-0875.`
        ).catch(console.error),

        process.env.ADMIN_PHONE
          ? sendSMS(
              process.env.ADMIN_PHONE,
              `DADA HOUSE NEW BOOKING (Voice Agent) #${appointmentNumber}\nService: ${data.service}\nClient: ${data.name}\nPhone: ${data.phone}\nAddress: ${data.address}, ${data.city}${data.preferredDate ? `\nDate: ${data.preferredDate}${data.preferredTime ? ` at ${data.preferredTime}` : ""}` : ""}`
            ).catch(console.error)
          : Promise.resolve(),

        (process.env.VOICE_AGENT_ALERT_EMAIL || process.env.APPOINTMENT_ALERT_EMAIL)
          ? resend.emails
              .send({
                from: FROM_EMAIL,
                to: (process.env.VOICE_AGENT_ALERT_EMAIL || process.env.APPOINTMENT_ALERT_EMAIL)!,
                subject: `[VOICE AGENT BOOKING] #${appointmentNumber} — ${data.service} — ${data.name}`,
                html: adminAppointmentAlertHtml({ ...emailData, phone: data.phone }),
              })
              .catch(console.error)
          : Promise.resolve(),
      ]);
    });

    return NextResponse.json(
      { id: appointment.id, appointmentNumber: appointment.appointmentNumber, status: appointment.status },
      { status: 201 }
    );
  } catch (err) {
    console.error("Voice agent appointment creation error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function buildDiagnosticEmail({ appointmentNumber, name, service, address, city, date, timeStr, fee, payUrl }: {
  appointmentNumber: string; name: string; service: string; address: string; city: string;
  date: string; timeStr: string; fee: number; payUrl: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:#1B3FA8;padding:28px 32px;text-align:center;">
        <p style="margin:0;color:#F7921A;font-size:22px;font-weight:900;letter-spacing:1px;">DADA HOUSE</p>
        <p style="margin:4px 0 0;color:#ffffff;font-size:13px;opacity:0.8;">Appointment Pending Confirmation</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;color:#555;font-size:14px;line-height:1.6;">Hi ${name},</p>
        <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.6;">
          Your <strong>${service}</strong> appointment <strong>#${appointmentNumber}</strong> on <strong>${date}${timeStr}</strong>
          at <strong>${address}, ${city}</strong> is <span style="color:#F7921A;font-weight:700;">PENDING CONFIRMATION</span>.
        </p>
        <div style="background:#fff8f0;border:2px solid #F7921A;border-radius:12px;padding:20px;margin-bottom:20px;text-align:center;">
          <p style="margin:0 0 4px;color:#666;font-size:13px;font-weight:600;">Diagnostic Fee Required</p>
          <p style="margin:0;color:#F7921A;font-size:40px;font-weight:900;">$${fee}</p>
        </div>
        <p style="margin:0 0 20px;color:#dc2626;font-size:13px;font-weight:600;text-align:center;line-height:1.5;">
          ⚠️ Payment must be received at least 8 hours before your scheduled appointment time.<br>
          Without payment, the appointment will not be confirmed.
        </p>
        <p style="margin:0 0 24px;color:#555;font-size:13px;line-height:1.6;">
          Once your payment is received, your appointment will be confirmed and a technician will be dispatched to your location.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="${payUrl}" style="display:inline-block;background:#F7921A;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:12px;">
              Pay $${fee} Now →
            </a>
          </td></tr>
        </table>
        <p style="margin:20px 0 0;color:#999;font-size:12px;text-align:center;">Questions? Call us at (844) 928-0875</p>
      </td></tr>
      <tr><td style="background:#f4f6fb;padding:16px 32px;text-align:center;">
        <p style="margin:0;color:#999;font-size:12px;">DADA HOUSE LLC · TX · NC · MD · (346) 649-9353</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
