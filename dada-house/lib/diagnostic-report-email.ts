import { db } from "@/lib/db";
import { sendTrackedEmail } from "@/lib/customer-email";
import { buildEstimateSection } from "@/lib/email-templates";
import { renderDiagnosticReportPdf } from "@/lib/pdf/diagnostic-report";
import { SERVICE_TYPES, DIAGNOSTIC_PHOTO_CATEGORIES, type ServiceType } from "@/lib/service-diagnostic-fields";
import { generateReportToken, sendReportLinkSms } from "@/lib/report-sms-fallback";

/**
 * Generates the diagnostic PDF and emails it to the customer (folding in a
 * "Recommended Work" estimate section when one already exists with priced
 * items). Called both when a technician completes a Service Diagnostic Form
 * directly and from the admin supervisor-review "approve" action.
 */
export async function sendDiagnosticCustomerReport(diagnosticId: string, sentById: string) {
  const diagnostic = await db.serviceDiagnostic.findUnique({ where: { id: diagnosticId }, include: { appointment: true } });
  if (!diagnostic) return;

  const appt = diagnostic.appointment;
  if (!appt.email && !appt.phone) return;

  let reportToken = diagnostic.reportToken;
  if (!reportToken) {
    reportToken = generateReportToken();
    await db.serviceDiagnostic.update({ where: { id: diagnosticId }, data: { reportToken } });
  }

  if (appt.email) {
    const photos = await db.jobPhoto.findMany({
      where: { appointmentId: appt.id, category: { in: Object.values(DIAGNOSTIC_PHOTO_CATEGORIES) } },
      orderBy: { createdAt: "asc" },
    });
    const technician = diagnostic.technicianId
      ? await db.user.findUnique({ where: { id: diagnostic.technicianId }, select: { name: true } })
      : null;

    const serviceTypeLabel = SERVICE_TYPES.find((s) => s.value === (diagnostic.serviceType as ServiceType))?.label ?? diagnostic.serviceType;

    const pdfBuffer = await renderDiagnosticReportPdf({
      reportNumber: `${appt.appointmentNumber}-DIAG`,
      submittedAt: diagnostic.completedAt ?? diagnostic.createdAt,
      technicianName: technician?.name ?? null,
      customer: { name: appt.name, phone: appt.phone, address: appt.address, city: appt.city, zipCode: appt.zipCode },
      serviceTypeLabel,
      customerReportedIssue: diagnostic.customerReportedIssue,
      equipmentInspected: diagnostic.equipmentInspected,
      problemFound: diagnostic.problemFound,
      rootCause: diagnostic.rootCause,
      evidenceSupportingDiagnosis: diagnostic.evidenceSupportingDiagnosis,
      affectedComponents: diagnostic.affectedComponents,
      recommendedRepair: diagnostic.recommendedRepair,
      additionalRecommendations: diagnostic.additionalRecommendations,
      repairUrgency: diagnostic.repairUrgency,
      canCustomerContinueUsing: diagnostic.canCustomerContinueUsing,
      finalDiagnosis: diagnostic.finalDiagnosis,
      recommendedCorrectiveWork: diagnostic.recommendedCorrectiveWork,
      systemStatusWhenLeaving: diagnostic.systemStatusWhenLeaving,
      photos: photos.map((p) => ({ url: p.url, caption: p.caption ?? "" })),
    });

    const estimate = await db.estimate.findFirst({ where: { appointmentId: appt.id, isInvoice: true }, orderBy: { createdAt: "desc" } });
    let estimateSection = "";
    if (estimate) {
      const lineItems = (estimate.lineItems as Array<{ desc: string; rate: number; qty: number; amount: number }>) ?? [];
      if (lineItems.length > 0) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dada-house.com";
        estimateSection = buildEstimateSection(estimate, lineItems, `${baseUrl}/pay/${estimate.paymentToken}`);
        await db.estimate.update({ where: { id: estimate.id }, data: { sentAt: new Date(), status: "OPEN" } });
      }
    }

    await sendTrackedEmail({
      to: appt.email,
      subject: `Your Service Diagnostic Report — ${appt.appointmentNumber} · DADA HOUSE`,
      html: `<p>Hi ${appt.name},</p><p>Attached is the diagnostic report from your technician's visit.</p><p>Questions? Call us at (844) 928-0875 or reply to this email.</p>${estimateSection}`,
      customerId: appt.customerId,
      sentById,
      attachmentBuffers: [{ filename: `Diagnostic-Report-${appt.appointmentNumber}.pdf`, content: pdfBuffer }],
    });
  } else if (appt.phone) {
    // No email on file — text a link to the same report instead of
    // silently skipping delivery altogether.
    await sendReportLinkSms({
      phone: appt.phone,
      sentById,
      customerName: appt.name,
      reportLabel: "diagnostic report",
      reportToken,
    });
  }

  await db.serviceDiagnostic.update({ where: { id: diagnosticId }, data: { customerReportSentAt: new Date() } });
}
