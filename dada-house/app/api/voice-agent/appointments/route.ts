import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { voiceAgentAppointmentSchema } from "@/lib/validations";
import { generateAppointmentNumber } from "@/lib/utils";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { sendSMS } from "@/lib/twilio";
import { appointmentConfirmationHtml, adminAppointmentAlertHtml } from "@/lib/email-templates";

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

    const { calendarSynced, ...data } = parsed.data;

    const appointmentNumber = generateAppointmentNumber();

    const appointment = await db.appointment.create({
      data: {
        appointmentNumber,
        ...data,
        preferredDate: data.preferredDate ? new Date(data.preferredDate) : null,
        status: calendarSynced ? "CONFIRMED" : "PENDING",
        source: "voice_agent",
      },
    });

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
          `DADA HOUSE: Hi ${data.name}, your appointment #${appointmentNumber} for ${data.service} is confirmed${data.preferredDate ? ` for ${data.preferredDate}${data.preferredTime ? ` at ${data.preferredTime}` : ""}` : ""}. Questions? Call (346) 649-9353.`
        ).catch(console.error),

        process.env.ADMIN_PHONE
          ? sendSMS(
              process.env.ADMIN_PHONE,
              `DADA HOUSE NEW BOOKING (Voice Agent) #${appointmentNumber}\nService: ${data.service}\nClient: ${data.name}\nPhone: ${data.phone}\nAddress: ${data.address}, ${data.city}${data.preferredDate ? `\nDate: ${data.preferredDate}${data.preferredTime ? ` at ${data.preferredTime}` : ""}` : ""}`
            ).catch(console.error)
          : Promise.resolve(),

        process.env.APPOINTMENT_ALERT_EMAIL
          ? resend.emails
              .send({
                from: FROM_EMAIL,
                to: process.env.APPOINTMENT_ALERT_EMAIL,
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
