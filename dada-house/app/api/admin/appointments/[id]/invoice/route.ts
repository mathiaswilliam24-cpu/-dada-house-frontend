import { NextRequest, NextResponse, after } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { resend, FROM_EMAIL } from "@/lib/resend";

const schema = z.object({
  amount: z.number().positive(),
  pdfUrl: z.string().url().optional().nullable(),
  notes: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "PAID"]).default("SENT"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const appt = await db.appointment.findUnique({ where: { id } });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const invoice = await db.invoice.upsert({
    where: { appointmentId: id },
    create: {
      appointmentId: id,
      amount: parsed.data.amount,
      pdfUrl: parsed.data.pdfUrl ?? null,
      notes: parsed.data.notes ?? null,
      status: parsed.data.status,
    },
    update: {
      amount: parsed.data.amount,
      pdfUrl: parsed.data.pdfUrl ?? null,
      notes: parsed.data.notes ?? null,
      status: parsed.data.status,
    },
  });

  after(() =>
    resend.emails
      .send({
        from: FROM_EMAIL,
        to: appt.email,
        subject: `DADA HOUSE — Invoice for Appointment #${appt.appointmentNumber}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2>Invoice — DADA HOUSE</h2>
            <p>Dear ${appt.name},</p>
            <p>Your invoice for appointment <strong>#${appt.appointmentNumber}</strong> has been ${parsed.data.status === "PAID" ? "marked as paid" : "sent"}.</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;">Service</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${appt.service}</td></tr>
              <tr><td style="padding:8px 0;font-weight:bold;">Total</td><td style="padding:8px 0;font-weight:bold;text-align:right;">$${parsed.data.amount.toFixed(2)}</td></tr>
            </table>
            ${parsed.data.pdfUrl ? `<p><a href="${parsed.data.pdfUrl}" style="color:#F7921A;">Download Invoice PDF</a></p>` : ""}
            <p style="color:#666;font-size:14px;">Questions? Call us at +1 (346) 649-9353</p>
          </div>
        `,
      })
      .catch(console.error)
  );

  return NextResponse.json(invoice, { status: 201 });
}
