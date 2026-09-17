import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/customers";

export const dynamic = "force-dynamic";

/**
 * Aggregates this customer's history across DADA HOUSE's data — not just this
 * one job. Correlated by phone number, since it's the one identifier shared
 * across Appointment/Customer/Estimate regardless of which system created
 * each record.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const job = await db.appointment.findFirst({
    where: { id, technicianId: auth.role === "ADMIN" ? undefined : auth.id },
    select: { phone: true, userId: true, name: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const phone = normalizePhone(job.phone);

  const customerAppointments = await db.appointment.findMany({
    where: { phone },
    select: { id: true, photos: true },
  });
  const appointmentIds = customerAppointments.map((a) => a.id);
  const bookingPhotoCount = customerAppointments.reduce((s, a) => s + (a.photos?.length ?? 0), 0);

  const [
    previousEstimates,
    previousAdminInvoices,
    previousTechInvoices,
    jobPhotoCount,
    notesCount,
    diagnosisFormCount,
    serviceDiagnosticCount,
    checklistCount,
    customerCounts,
    servicePlans,
  ] = await Promise.all([
    db.estimate.count({ where: { clientPhone: phone, isInvoice: false } }),
    db.invoice.count({ where: { appointment: { phone } } }),
    db.estimate.count({ where: { clientPhone: phone, isInvoice: true } }),
    db.jobPhoto.count({ where: { appointmentId: { in: appointmentIds } } }),
    db.maintenanceLog.count({ where: { appointmentId: { in: appointmentIds }, notes: { not: null } } }),
    db.diagnosisForm.count({ where: { appointmentId: { in: appointmentIds } } }),
    db.serviceDiagnostic.count({ where: { appointmentId: { in: appointmentIds } } }),
    db.serviceChecklist.count({ where: { appointmentId: { in: appointmentIds } } }),
    db.customer.findUnique({ where: { phone }, select: { _count: { select: { maintenanceContracts: true, equipment: true, projects: true } } } }),
    job.userId ? db.customerServicePlan.count({ where: { userId: job.userId } }) : Promise.resolve(0),
  ]);

  return NextResponse.json({
    history: {
      previousEstimates,
      recurringServices: (customerCounts?._count.maintenanceContracts ?? 0) + servicePlans,
      previousInvoices: previousAdminInvoices + previousTechInvoices,
      photosAndVideos: jobPhotoCount + bookingPhotoCount,
      notes: notesCount,
      previousForms: diagnosisFormCount + serviceDiagnosticCount + checklistCount,
      existingEquipment: customerCounts?._count.equipment ?? 0,
      projects: customerCounts?._count.projects ?? 0,
    },
  });
}
