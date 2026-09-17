import { NextRequest, NextResponse, after } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendTrackedEmail } from "@/lib/customer-email";
import { renderServiceFormReportPdf } from "@/lib/pdf/service-form-report";
import { buildEstimateSection } from "@/lib/email-templates";
import { generateReportToken, sendReportLinkSms } from "@/lib/report-sms-fallback";

export const dynamic = "force-dynamic";

// Forms whose submission should auto-generate a PDF report emailed to the
// customer. Add a new slug here whenever the super admin builds out another
// inspection-style Service Form.
// "residential-diagnostic" isn't listed here — it now renders the dedicated
// ServiceDiagnosticForm (its own model/route), not a generic FormTemplate.
const AUTO_REPORT_SLUGS = new Set([
  "clean-and-check-inspection",
  "system-startup",
  "follow-up",
  "retail-lead",
  "miscellaneous",
  "parts-replacement",
  "drain-line-cleaning",
  "ac-quick-diagnostic",
]);

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

  return NextResponse.json({ template, submission, autoReport: AUTO_REPORT_SLUGS.has(slug) });
}

// Autosave — fired on a debounce from the client after every field/photo
// change, independent of the final "Save Form" submit. Without this, a
// technician who fills in fields and takes photos out in the field loses
// everything (including already-uploaded photos, since only their URL
// reference lived in unsaved React state) the moment the phone screen locks
// or the OS kills the tab mid-job, e.g. right after the camera app hands
// control back. Cheap fire-and-forget upsert, no side effects, no gating.
export async function PATCH(
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

  return NextResponse.json({ submission });
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

  const { values, estimateId } = await req.json();

  const technicianComments = typeof values?.__technicianComments === "string" ? values.__technicianComments.trim() : "";
  if (AUTO_REPORT_SLUGS.has(slug) && !technicianComments) {
    return NextResponse.json({ error: "Please add your comments (problems observed and recommendations) before saving." }, { status: 400 });
  }

  // An estimate is optional — if one already exists for this job with priced
  // items, it's folded into the same report email as a bonus, but the report
  // itself never waits on one being created first.
  let estimate: Awaited<ReturnType<typeof db.estimate.findFirst>> = null;
  if (AUTO_REPORT_SLUGS.has(slug) && estimateId) {
    estimate = await db.estimate.findFirst({ where: { id: estimateId, appointmentId: id, isInvoice: true } });
  }

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

    const confirmedEstimate = estimate;
    if (job) {
      after(async () => {
        try {
          let reportToken = submission.reportToken;
          if (!reportToken) {
            reportToken = generateReportToken();
            await db.formSubmission.update({ where: { id: submission.id }, data: { reportToken } });
          }

          if (job.email) {
            const fields = (template.fields as Array<{ id: string; label: string; type: string }>) ?? [];
            const pdfBuffer = await renderServiceFormReportPdf({
              reportNumber: `${job.appointmentNumber}-${template.slug.toUpperCase()}`,
              formName: template.name,
              submittedAt: submission.submittedAt,
              technicianName: auth.name ?? null,
              technicianComments,
              customer: { name: job.name, phone: job.phone, email: job.email, address: job.address, city: job.city, zipCode: job.zipCode },
              fields,
              submission: { values: submission.values as Record<string, unknown>, submittedAt: submission.submittedAt },
            });

            let estimateSection = "";
            const estimateLineItems = (confirmedEstimate?.lineItems as Array<{ desc: string; rate: number; qty: number; amount: number }>) ?? [];
            if (confirmedEstimate && estimateLineItems.length > 0) {
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dada-house.com";
              const paymentUrl = `${baseUrl}/pay/${confirmedEstimate.paymentToken}`;
              estimateSection = buildEstimateSection(confirmedEstimate, estimateLineItems, paymentUrl);
            }

            await sendTrackedEmail({
              to: job.email,
              subject: `${template.name} Report — ${job.appointmentNumber} · DADA HOUSE`,
              html: `<p>Hi ${job.name},</p><p>Attached is your ${template.name} service report from today's visit, including the photos your technician took.</p>${
                technicianComments
                  ? `<div style="margin:16px 0;padding:14px 18px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;"><p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Technician Notes</p><p style="margin:0;white-space:pre-wrap;">${technicianComments}</p></div>`
                  : ""
              }<p>Thank you for choosing DADA HOUSE.</p>${estimateSection}`,
              customerId: job.customerId,
              sentById: auth.id,
              attachmentBuffers: [{ filename: `${template.name.replace(/[^a-z0-9]+/gi, "-")}-Report.pdf`, content: pdfBuffer }],
            });

            if (confirmedEstimate && estimateLineItems.length > 0) {
              await db.estimate.update({ where: { id: confirmedEstimate.id }, data: { sentAt: new Date(), status: "OPEN" } });
            }
          } else if (job.phone) {
            // No email on file — text a link to the same report instead of
            // silently skipping delivery altogether.
            await sendReportLinkSms({
              phone: job.phone,
              sentById: auth.id,
              customerName: job.name,
              reportLabel: `${template.name} report`,
              reportToken,
            });
          }
        } catch (err) {
          console.error("Failed to generate/send service form report:", err);
        }
      });
    }
  }

  return NextResponse.json({ submission });
}
