import { db } from "@/lib/db";
import { sendTrackedEmail } from "@/lib/customer-email";
import { renderVentCleaningReportPdf } from "@/lib/pdf/vent-cleaning-report";
import { generateReportToken, sendReportLinkSms } from "@/lib/report-sms-fallback";
import type { VentEntry } from "@/lib/duct-cleaning-fields";

/** Generates the Air Vent & Register Cleaning PDF and delivers it to the
 *  customer — by email when one is on file, otherwise by a texted link to
 *  the same report (see lib/report-sms-fallback.ts). */
export async function sendVentCleaningReport(ventCleaningId: string, sentById: string) {
  const record = await db.ventCleaning.findUnique({ where: { id: ventCleaningId }, include: { appointment: true } });
  if (!record) return;

  const appt = record.appointment;
  if (!appt.email && !appt.phone) return;

  let reportToken = record.reportToken;
  if (!reportToken) {
    reportToken = generateReportToken();
    await db.ventCleaning.update({ where: { id: ventCleaningId }, data: { reportToken } });
  }

  if (appt.email) {
    const technician = record.technicianId
      ? await db.user.findUnique({ where: { id: record.technicianId }, select: { name: true } })
      : null;

    const pdfBuffer = await renderVentCleaningReportPdf({
      reportNumber: `${appt.appointmentNumber}-VENT`,
      submittedAt: record.completedAt ?? record.createdAt,
      technicianName: technician?.name ?? null,
      customer: { name: appt.name, phone: appt.phone, address: appt.address, city: appt.city, zipCode: appt.zipCode },
      propertyType: record.propertyType,
      totalVentsAuthorized: record.totalVentsAuthorized,
      supplyVentsAuthorized: record.supplyVentsAuthorized,
      returnVentsAuthorized: record.returnVentsAuthorized,
      overallCondition: (record.overallCondition as string[]) ?? [],
      workPerformed: (record.workPerformed as string[]) ?? [],
      additionalFindings: (record.additionalFindings as string[]) ?? [],
      recommendedAdditionalService: record.recommendedAdditionalService,
      vents: (record.vents as unknown as VentEntry[]) ?? [],
      totalVentsCleaned: record.totalVentsCleaned,
      completionStatus: record.completionStatus,
      technicianNotes: record.technicianNotes,
      technicianSignatureUrl: record.technicianSignatureUrl,
      customerSignatureUrl: record.customerSignatureUrl,
    });

    await sendTrackedEmail({
      to: appt.email,
      subject: `Your Air Vent & Register Cleaning Report — ${appt.appointmentNumber} · DADA HOUSE`,
      html: `<p>Hi ${appt.name},</p><p>Attached is your Air Vent & Register Cleaning report from today's visit.</p><p>Questions? Call us at (844) 928-0875 or reply to this email.</p>`,
      customerId: appt.customerId,
      sentById,
      attachmentBuffers: [{ filename: `Vent-Cleaning-Report-${appt.appointmentNumber}.pdf`, content: pdfBuffer }],
    });
  } else if (appt.phone) {
    await sendReportLinkSms({
      phone: appt.phone,
      sentById,
      customerName: appt.name,
      reportLabel: "Air Vent & Register Cleaning report",
      reportToken,
    });
  }

  await db.ventCleaning.update({ where: { id: ventCleaningId }, data: { customerReportSentAt: new Date() } });
}
