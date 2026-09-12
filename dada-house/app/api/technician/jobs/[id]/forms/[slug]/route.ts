import { NextRequest, NextResponse, after } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendTrackedEmail } from "@/lib/customer-email";
import { renderCleanCheckReportPdf } from "@/lib/pdf/clean-check-report";

export const dynamic = "force-dynamic";

// Forms whose submission should auto-generate a PDF report emailed to the
// customer — starts with the Clean & Check inspection; add more slugs here
// as the super admin builds out other inspection-style forms.
const AUTO_REPORT_SLUGS = new Set(["clean-and-check-inspection"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; slug: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id, slug } = await params;
  const template = await db.formTemplate.findUnique({ where: { slug } });
  if (!template || !template.isActive) return NextResponse.json({ template: null, submission: null });

  const submission = await db.formSubmission.findUnique({
    where: { templateId_appointmentId: { templateId: template.id, appointmentId: id } },
  });

  return NextResponse.json({ template, submission });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; slug: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id, slug } = await params;
  const template = await db.formTemplate.findUnique({ where: { slug } });
  if (!template) return NextResponse.json({ error: "Form not found" }, { status: 404 });

  const { values } = await req.json();

  const submission = await db.formSubmission.upsert({
    where: { templateId_appointmentId: { templateId: template.id, appointmentId: id } },
    create: { templateId: template.id, appointmentId: id, technicianId: auth.id, values: values ?? {} },
    update: { values: values ?? {}, technicianId: auth.id },
  });

  if (AUTO_REPORT_SLUGS.has(slug)) {
    const job = await db.appointment.findUnique({
      where: { id },
      select: { name: true, phone: true, email: true, address: true, city: true, zipCode: true, appointmentNumber: true, customerId: true },
    });

    if (job?.email) {
      after(async () => {
        try {
          const fields = (template.fields as Array<{ id: string; label: string; type: string }>) ?? [];
          const pdfBuffer = await renderCleanCheckReportPdf({
            reportNumber: `${job.appointmentNumber}-${template.slug.toUpperCase()}`,
            formName: template.name,
            submittedAt: submission.submittedAt,
            technicianName: auth.name ?? null,
            customer: { name: job.name, phone: job.phone, email: job.email, address: job.address, city: job.city, zipCode: job.zipCode },
            fields,
            submission: { values: submission.values as Record<string, unknown>, submittedAt: submission.submittedAt },
          });

          await sendTrackedEmail({
            to: job.email,
            subject: `${template.name} Report — ${job.appointmentNumber} · DADA HOUSE`,
            html: `<p>Hi ${job.name},</p><p>Attached is your ${template.name} service report from today's visit, including the photos your technician took.</p><p>Thank you for choosing DADA HOUSE.</p>`,
            customerId: job.customerId,
            sentById: auth.id,
            attachmentBuffers: [{ filename: `${template.name.replace(/[^a-z0-9]+/gi, "-")}-Report.pdf`, content: pdfBuffer }],
          });
        } catch (err) {
          console.error("Failed to generate/send Clean & Check report PDF:", err);
        }
      });
    }
  }

  return NextResponse.json({ submission });
}
