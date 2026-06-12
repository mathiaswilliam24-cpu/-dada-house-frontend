import { NextRequest, NextResponse, after } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { sendSMS } from "@/lib/twilio";
import { statusUpdateHtml } from "@/lib/email-templates";

const updateSchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
  notes: z.string().optional(),
  technicianId: z.string().nullable().optional(),
  eta: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const appt = await db.appointment.findUnique({
    where: { id },
    include: { invoice: true, notifications: true },
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(appt);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const existing = await db.appointment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.appointment.update({
    where: { id },
    data: {
      ...(parsed.data.status && { status: parsed.data.status }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      ...("technicianId" in parsed.data && { technicianId: parsed.data.technicianId }),
      ...(parsed.data.eta && { eta: new Date(parsed.data.eta) }),
    },
    include: { invoice: true },
  });

  if (parsed.data.status && parsed.data.status !== existing.status) {
    after(async () => {
      await Promise.allSettled([
        resend.emails
          .send({
            from: FROM_EMAIL,
            to: updated.email,
            subject: `DADA HOUSE — Appointment #${updated.appointmentNumber} Update`,
            html: statusUpdateHtml({
              appointmentNumber: updated.appointmentNumber,
              name: updated.name,
              status: updated.status,
              notes: updated.notes ?? undefined,
            }),
          })
          .catch(console.error),

        updated.phone
          ? sendSMS(
              updated.phone,
              `DADA HOUSE: Your appointment #${updated.appointmentNumber} status: ${updated.status.replace("_", " ")}. ${updated.notes ? updated.notes : ""}`
            ).catch(console.error)
          : Promise.resolve(),
      ]);
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await db.appointment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
