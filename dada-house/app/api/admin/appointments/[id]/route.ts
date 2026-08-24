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
  notes: z.string().nullable().optional(),
  photos: z.array(z.string()).optional(),
  technicianId: z.string().nullable().optional(),
  eta: z.string().nullable().optional(),
  // Editable fields
  service:       z.string().optional(),
  subservice:    z.string().nullable().optional(),
  preferredDate: z.string().nullable().optional(),
  preferredTime: z.string().nullable().optional(),
  address:       z.string().optional(),
  city:          z.string().optional(),
  description:   z.string().nullable().optional(),
  name:          z.string().optional(),
  phone:         z.string().optional(),
  email:         z.string().optional(),
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

  const d = parsed.data;
  const updated = await db.appointment.update({
    where: { id },
    data: {
      ...(d.status          && { status: d.status }),
      ...(d.notes           !== undefined && { notes: d.notes }),
      ...(d.photos          !== undefined && { photos: d.photos }),
      ...("technicianId" in d && { technicianId: d.technicianId }),
      ...(d.eta             && { eta: new Date(d.eta) }),
      ...(d.service         && { service: d.service }),
      ...("subservice"  in d && { subservice: d.subservice }),
      ...("preferredDate" in d && { preferredDate: d.preferredDate ? new Date(d.preferredDate) : null }),
      ...("preferredTime" in d && { preferredTime: d.preferredTime }),
      ...(d.address         && { address: d.address }),
      ...(d.city            && { city: d.city }),
      ...("description" in d && { description: d.description }),
      ...(d.name            && { name: d.name }),
      ...(d.phone           !== undefined && { phone: d.phone }),
      ...(d.email           !== undefined && { email: d.email }),
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
