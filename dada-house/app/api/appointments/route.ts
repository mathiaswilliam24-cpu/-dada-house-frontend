import { NextRequest, NextResponse, after } from "next/server";
import { requireAuth, getAuthToken } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { appointmentSchema } from "@/lib/validations";
import { generateAppointmentNumber } from "@/lib/utils";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { sendSMS } from "@/lib/twilio";
import { appointmentConfirmationHtml, adminAppointmentAlertHtml } from "@/lib/email-templates";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const appointments = await db.appointment.findMany({
    where: { userId: auth.id },
    include: { invoice: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip,
  });

  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken(req);
    const body = await req.json();

    const parsed = appointmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const appointmentNumber = generateAppointmentNumber();

    const appointment = await db.appointment.create({
      data: {
        appointmentNumber,
        userId: token?.id ?? null,
        ...parsed.data,
        preferredDate: parsed.data.preferredDate ? new Date(parsed.data.preferredDate) : null,
      },
    });

    const emailData = {
      appointmentNumber,
      name: parsed.data.name,
      service: parsed.data.service,
      subservice: parsed.data.subservice,
      address: parsed.data.address,
      city: parsed.data.city,
      preferredDate: parsed.data.preferredDate,
      preferredTime: parsed.data.preferredTime,
      description: parsed.data.description,
      phone: parsed.data.phone,
    };

    after(async () => {
      await Promise.allSettled([
        resend.emails
          .send({
            from: FROM_EMAIL,
            to: parsed.data.email,
            subject: `DADA HOUSE — Appointment #${appointmentNumber} Received`,
            html: appointmentConfirmationHtml(emailData),
          })
          .catch(console.error),

        sendSMS(
          parsed.data.phone,
          `DADA HOUSE: Hi ${parsed.data.name}, your appointment #${appointmentNumber} for ${parsed.data.service} has been received!${parsed.data.preferredDate ? ` Requested: ${parsed.data.preferredDate}${parsed.data.preferredTime ? ` at ${parsed.data.preferredTime}` : ""}` : ""} Our team will contact you shortly to confirm. Questions? Call (346) 649-9353.`
        ).catch(console.error),

        process.env.ADMIN_PHONE
          ? sendSMS(
              process.env.ADMIN_PHONE,
              `DADA HOUSE NEW BOOKING #${appointmentNumber}\nService: ${parsed.data.service}\nClient: ${parsed.data.name}\nPhone: ${parsed.data.phone}\nAddress: ${parsed.data.address}, ${parsed.data.city}${parsed.data.preferredDate ? `\nDate: ${parsed.data.preferredDate}${parsed.data.preferredTime ? ` at ${parsed.data.preferredTime}` : ""}` : ""}`
            ).catch(console.error)
          : Promise.resolve(),

        process.env.APPOINTMENT_ALERT_EMAIL
          ? resend.emails
              .send({
                from: FROM_EMAIL,
                to: process.env.APPOINTMENT_ALERT_EMAIL,
                subject: `[NEW BOOKING] #${appointmentNumber} — ${parsed.data.service} — ${parsed.data.name}`,
                html: adminAppointmentAlertHtml(emailData),
              })
              .catch(console.error)
          : Promise.resolve(),
      ]);
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (err) {
    console.error("Appointment creation error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
