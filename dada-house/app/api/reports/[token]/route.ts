import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderServiceFormReportPdf } from "@/lib/pdf/service-form-report";
import { renderDiagnosticReportPdf } from "@/lib/pdf/diagnostic-report";
import { renderSystemStartupReportPdf } from "@/lib/pdf/system-startup-report";
import { SERVICE_TYPES, DIAGNOSTIC_PHOTO_CATEGORIES, type ServiceType } from "@/lib/service-diagnostic-fields";
import {
  STARTUP_PHOTO_CATEGORIES, equipmentFieldsFor, EQUIPMENT_TYPE_LABEL,
  type EquipmentEntry, type FinalTestKey,
} from "@/lib/system-startup-fields";
import { renderVentCleaningReportPdf } from "@/lib/pdf/vent-cleaning-report";
import { renderDuctCleaningReportPdf } from "@/lib/pdf/duct-cleaning-report";
import type { VentEntry, RegisterEntry, ComponentState } from "@/lib/duct-cleaning-fields";

export const dynamic = "force-dynamic";

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

// Public, token-gated, non-expiring PDF view — the link texted to customers
// with no email on file. Regenerates the PDF on demand from the same DB
// state the email attachment was built from, rather than persisting PDFs
// anywhere (see app/api/email-messages/[id]/attachments/route.ts for why:
// generated report PDFs were never stored, only ever transient email
// attachments — this route gives non-email customers an equivalent, durable
// way to reach their report).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) return new NextResponse("Not found.", { status: 404 });

  const submission = await db.formSubmission.findUnique({
    where: { reportToken: token },
    include: { template: true, appointment: true },
  });
  if (submission) {
    const appt = submission.appointment;
    const fields = (submission.template.fields as Array<{ id: string; label: string; type: string }>) ?? [];
    const values = submission.values as Record<string, unknown>;
    const technicianComments = typeof values.__technicianComments === "string" ? values.__technicianComments : "";
    const technician = submission.technicianId
      ? await db.user.findUnique({ where: { id: submission.technicianId }, select: { name: true } })
      : null;
    const pdfBuffer = await renderServiceFormReportPdf({
      reportNumber: `${appt.appointmentNumber}-${submission.template.slug.toUpperCase()}`,
      formName: submission.template.name,
      submittedAt: submission.submittedAt,
      technicianName: technician?.name ?? null,
      technicianComments,
      customer: { name: appt.name, phone: appt.phone, email: appt.email, address: appt.address, city: appt.city, zipCode: appt.zipCode },
      fields,
      submission: { values, submittedAt: submission.submittedAt },
    });
    return pdfResponse(pdfBuffer, `${submission.template.name.replace(/[^a-z0-9]+/gi, "-")}-Report.pdf`);
  }

  const diagnostic = await db.serviceDiagnostic.findUnique({
    where: { reportToken: token },
    include: { appointment: true },
  });
  if (diagnostic) {
    const appt = diagnostic.appointment;
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
    return pdfResponse(pdfBuffer, `Diagnostic-Report-${appt.appointmentNumber}.pdf`);
  }

  const startup = await db.systemStartup.findUnique({
    where: { reportToken: token },
    include: { appointment: true },
  });
  if (startup) {
    const appt = startup.appointment;
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
    return pdfResponse(pdfBuffer, `System-Startup-Report-${appt.appointmentNumber}.pdf`);
  }

  const ventCleaning = await db.ventCleaning.findUnique({
    where: { reportToken: token },
    include: { appointment: true },
  });
  if (ventCleaning) {
    const appt = ventCleaning.appointment;
    const technician = ventCleaning.technicianId
      ? await db.user.findUnique({ where: { id: ventCleaning.technicianId }, select: { name: true } })
      : null;
    const pdfBuffer = await renderVentCleaningReportPdf({
      reportNumber: `${appt.appointmentNumber}-VENT`,
      submittedAt: ventCleaning.completedAt ?? ventCleaning.createdAt,
      technicianName: technician?.name ?? null,
      customer: { name: appt.name, phone: appt.phone, address: appt.address, city: appt.city, zipCode: appt.zipCode },
      propertyType: ventCleaning.propertyType,
      totalVentsAuthorized: ventCleaning.totalVentsAuthorized,
      supplyVentsAuthorized: ventCleaning.supplyVentsAuthorized,
      returnVentsAuthorized: ventCleaning.returnVentsAuthorized,
      overallCondition: (ventCleaning.overallCondition as string[]) ?? [],
      workPerformed: (ventCleaning.workPerformed as string[]) ?? [],
      additionalFindings: (ventCleaning.additionalFindings as string[]) ?? [],
      recommendedAdditionalService: ventCleaning.recommendedAdditionalService,
      vents: (ventCleaning.vents as unknown as VentEntry[]) ?? [],
      totalVentsCleaned: ventCleaning.totalVentsCleaned,
      completionStatus: ventCleaning.completionStatus,
      technicianNotes: ventCleaning.technicianNotes,
      technicianSignatureUrl: ventCleaning.technicianSignatureUrl,
      customerSignatureUrl: ventCleaning.customerSignatureUrl,
    });
    return pdfResponse(pdfBuffer, `Vent-Cleaning-Report-${appt.appointmentNumber}.pdf`);
  }

  const ductCleaning = await db.ductCleaning.findUnique({
    where: { reportToken: token },
    include: { appointment: true },
  });
  if (ductCleaning) {
    const appt = ductCleaning.appointment;
    const technician = ductCleaning.technicianId
      ? await db.user.findUnique({ where: { id: ductCleaning.technicianId }, select: { name: true } })
      : null;
    const pdfBuffer = await renderDuctCleaningReportPdf({
      reportNumber: `${appt.appointmentNumber}-DUCT`,
      submittedAt: ductCleaning.completedAt ?? ductCleaning.createdAt,
      technicianName: technician?.name ?? null,
      customer: { name: appt.name, phone: appt.phone, address: appt.address, city: appt.city, zipCode: appt.zipCode },
      propertyType: ductCleaning.propertyType,
      systemsCount: ductCleaning.systemsCount,
      totalSupplyRegisters: ductCleaning.totalSupplyRegisters,
      totalReturnRegisters: ductCleaning.totalReturnRegisters,
      ductMaterial: ductCleaning.ductMaterial,
      contaminationObserved: (ductCleaning.contaminationObserved as string[]) ?? [],
      systemProblemsFound: (ductCleaning.systemProblemsFound as string[]) ?? [],
      technicianFindings: ductCleaning.technicianFindings,
      cleaningProcedure: (ductCleaning.cleaningProcedure as string[]) ?? [],
      registers: (ductCleaning.registers as unknown as RegisterEntry[]) ?? [],
      componentCleaning: (ductCleaning.componentCleaning as unknown as Record<string, ComponentState>) ?? {},
      additionalIssueFound: ductCleaning.additionalIssueFound,
      issuesFound: (ductCleaning.issuesFound as string[]) ?? [],
      additionalRepairRecommended: ductCleaning.additionalRepairRecommended,
      separateEstimateRequired: ductCleaning.separateEstimateRequired,
      systemConditionAfter: ductCleaning.systemConditionAfter,
      beforePhotos: (ductCleaning.beforePhotos as unknown as { category: string; url: string }[]) ?? [],
      afterPhotos: (ductCleaning.afterPhotos as unknown as { category: string; url: string }[]) ?? [],
      technicianNotes: ductCleaning.technicianNotes,
      technicianSignatureUrl: ductCleaning.technicianSignatureUrl,
      customerSignatureUrl: ductCleaning.customerSignatureUrl,
    });
    return pdfResponse(pdfBuffer, `Duct-Cleaning-Report-${appt.appointmentNumber}.pdf`);
  }

  return new NextResponse("This report link is invalid or has expired.", { status: 404 });
}

function pdfResponse(buffer: Buffer, filename: string) {
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
