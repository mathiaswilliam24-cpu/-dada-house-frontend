import { db } from "@/lib/db";
import { sendTrackedEmail } from "@/lib/customer-email";
import { renderSystemStartupReportPdf } from "@/lib/pdf/system-startup-report";
import {
  STARTUP_PHOTO_CATEGORIES, equipmentFieldsFor, EQUIPMENT_TYPE_LABEL,
  type EquipmentEntry, type FinalTestKey,
} from "@/lib/system-startup-fields";
import { generateReportToken, sendReportLinkSms } from "@/lib/report-sms-fallback";

function summarizeEquipment(equipment: EquipmentEntry[]): string {
  return equipment
    .map((e) => {
      const fields = equipmentFieldsFor(e.equipmentType);
      const parts = fields
        .map((f) => (e.values[f.id] ? `${f.label}: ${e.values[f.id]}` : null))
        .filter(Boolean);
      return `${EQUIPMENT_TYPE_LABEL[e.equipmentType]} — ${parts.join(", ") || "no details entered"}`;
    })
    .join("\n");
}

/** Generates the System Startup PDF and emails it to the customer once the
 *  technician completes the post-approval Customer Handover step. */
export async function sendSystemStartupReport(systemStartupId: string, sentById: string) {
  const startup = await db.systemStartup.findUnique({ where: { id: systemStartupId }, include: { appointment: true } });
  if (!startup) return;

  const appt = startup.appointment;
  if (!appt.email && !appt.phone) return;

  let reportToken = startup.reportToken;
  if (!reportToken) {
    reportToken = generateReportToken();
    await db.systemStartup.update({ where: { id: systemStartupId }, data: { reportToken } });
  }

  if (appt.email) {
    const photos = await db.jobPhoto.findMany({
      where: { appointmentId: appt.id, category: { in: Object.values(STARTUP_PHOTO_CATEGORIES) } },
      orderBy: { createdAt: "asc" },
    });
    const technician = startup.technicianId
      ? await db.user.findUnique({ where: { id: startup.technicianId }, select: { name: true } })
      : null;

    const pdfBuffer = await renderSystemStartupReportPdf({
      reportNumber: `${appt.appointmentNumber}-STARTUP`,
      submittedAt: startup.completedAt ?? startup.createdAt,
      technicianName: technician?.name ?? null,
      customer: { name: appt.name, phone: appt.phone, address: appt.address, city: appt.city, zipCode: appt.zipCode },
      systemType: startup.systemType,
      installationType: startup.installationType,
      equipmentSummary: summarizeEquipment((startup.equipment as unknown as EquipmentEntry[]) ?? []),
      finalTestResults: (startup.finalTestResults as Partial<Record<FinalTestKey, string>>) ?? {},
      finalStartupResult: startup.finalStartupResult,
      failExplanation: startup.failExplanation,
      technicianSignatureUrl: startup.technicianSignatureUrl,
      customerSignatureUrl: startup.customerSignatureUrl,
      photos: photos.map((p) => ({ url: p.url, caption: p.caption ?? "" })),
    });

    await sendTrackedEmail({
      to: appt.email,
      subject: `Your System Startup & Commissioning Report — ${appt.appointmentNumber} · DADA HOUSE`,
      html: `<p>Hi ${appt.name},</p><p>Thank you for choosing DADA HOUSE for your new system installation. Attached is your official Startup & Commissioning Report, confirming your system was installed and tested to manufacturer specifications.</p><p>Questions? Call us at (844) 928-0875 or reply to this email.</p>`,
      customerId: appt.customerId,
      sentById,
      attachmentBuffers: [{ filename: `System-Startup-Report-${appt.appointmentNumber}.pdf`, content: pdfBuffer }],
    });
  } else if (appt.phone) {
    // No email on file — text a link to the same report instead of
    // silently skipping delivery altogether.
    await sendReportLinkSms({
      phone: appt.phone,
      sentById,
      customerName: appt.name,
      reportLabel: "System Startup & Commissioning report",
      reportToken,
    });
  }

  await db.systemStartup.update({ where: { id: systemStartupId }, data: { customerReportSentAt: new Date() } });
}
