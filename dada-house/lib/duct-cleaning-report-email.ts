import { db } from "@/lib/db";
import { sendTrackedEmail } from "@/lib/customer-email";
import { renderDuctCleaningReportPdf } from "@/lib/pdf/duct-cleaning-report";
import { generateReportToken, sendReportLinkSms } from "@/lib/report-sms-fallback";
import type { RegisterEntry, ComponentState } from "@/lib/duct-cleaning-fields";

/** Generates the Whole-System Air Duct Cleaning PDF and delivers it to the
 *  customer — by email when one is on file, otherwise by a texted link to
 *  the same report (see lib/report-sms-fallback.ts). */
export async function sendDuctCleaningReport(ductCleaningId: string, sentById: string) {
  const record = await db.ductCleaning.findUnique({ where: { id: ductCleaningId }, include: { appointment: true } });
  if (!record) return;

  const appt = record.appointment;
  if (!appt.email && !appt.phone) return;

  let reportToken = record.reportToken;
  if (!reportToken) {
    reportToken = generateReportToken();
    await db.ductCleaning.update({ where: { id: ductCleaningId }, data: { reportToken } });
  }

  if (appt.email) {
    const technician = record.technicianId
      ? await db.user.findUnique({ where: { id: record.technicianId }, select: { name: true } })
      : null;

    const pdfBuffer = await renderDuctCleaningReportPdf({
      reportNumber: `${appt.appointmentNumber}-DUCT`,
      submittedAt: record.completedAt ?? record.createdAt,
      technicianName: technician?.name ?? null,
      customer: { name: appt.name, phone: appt.phone, address: appt.address, city: appt.city, zipCode: appt.zipCode },
      propertyType: record.propertyType,
      systemsCount: record.systemsCount,
      totalSupplyRegisters: record.totalSupplyRegisters,
      totalReturnRegisters: record.totalReturnRegisters,
      ductMaterial: record.ductMaterial,
      contaminationObserved: (record.contaminationObserved as string[]) ?? [],
      systemProblemsFound: (record.systemProblemsFound as string[]) ?? [],
      technicianFindings: record.technicianFindings,
      cleaningProcedure: (record.cleaningProcedure as string[]) ?? [],
      registers: (record.registers as unknown as RegisterEntry[]) ?? [],
      componentCleaning: (record.componentCleaning as unknown as Record<string, ComponentState>) ?? {},
      additionalIssueFound: record.additionalIssueFound,
      issuesFound: (record.issuesFound as string[]) ?? [],
      additionalRepairRecommended: record.additionalRepairRecommended,
      separateEstimateRequired: record.separateEstimateRequired,
      systemConditionAfter: record.systemConditionAfter,
      beforePhotos: (record.beforePhotos as unknown as { category: string; url: string }[]) ?? [],
      afterPhotos: (record.afterPhotos as unknown as { category: string; url: string }[]) ?? [],
      technicianNotes: record.technicianNotes,
      technicianSignatureUrl: record.technicianSignatureUrl,
      customerSignatureUrl: record.customerSignatureUrl,
    });

    await sendTrackedEmail({
      to: appt.email,
      subject: `Your Air Duct Cleaning Completion Report — ${appt.appointmentNumber} · DADA HOUSE`,
      html: `<p>Hi ${appt.name},</p><p>Attached is your Whole-System Air Duct Cleaning completion report from today's visit.</p><p>Questions? Call us at (844) 928-0875 or reply to this email.</p>`,
      customerId: appt.customerId,
      sentById,
      attachmentBuffers: [{ filename: `Duct-Cleaning-Report-${appt.appointmentNumber}.pdf`, content: pdfBuffer }],
    });
  } else if (appt.phone) {
    await sendReportLinkSms({
      phone: appt.phone,
      sentById,
      customerName: appt.name,
      reportLabel: "Air Duct Cleaning completion report",
      reportToken,
    });
  }

  await db.ductCleaning.update({ where: { id: ductCleaningId }, data: { customerReportSentAt: new Date() } });
}
