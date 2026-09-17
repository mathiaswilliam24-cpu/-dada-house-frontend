import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { generateReportToken } from "@/lib/report-sms-fallback";

export const dynamic = "force-dynamic";

type ReportRow = {
  id: string;
  label: string;
  appointmentNumber: string;
  service: string;
  date: string;
  channel: "email" | "sms" | "not sent yet";
  url: string;
};

// Staff-facing CC: whatever channel a report actually went out on (email or
// the SMS-link fallback), admins/dispatchers can always pull the same PDF
// here via the same durable, non-expiring token — no dependency on Resend
// still having the attachment (see app/api/email-messages/[id]/attachments).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const rawId = decodeURIComponent(id);
  // Callers pass a Customer.id (call-center /customers/[id]), a User.id
  // (admin /admin/customers/[id] for a registered account), or — for a
  // walk-in/phone client with no account — a synthetic "appt:<phone|email|name>"
  // id (see app/api/admin/customers/[id]/route.ts, same convention reused here).
  const appointments = rawId.startsWith("appt:")
    ? await db.appointment.findMany({
        where: { userId: null, OR: [{ phone: rawId.slice(5) }, { email: rawId.slice(5) }, { name: rawId.slice(5) }] },
        select: { id: true, appointmentNumber: true, service: true, email: true, phone: true },
      })
    : await db.appointment.findMany({
        where: { OR: [{ customerId: rawId }, { userId: rawId }] },
        select: { id: true, appointmentNumber: true, service: true, email: true, phone: true },
      });
  const apptById = new Map(appointments.map((a) => [a.id, a]));
  const apptIds = appointments.map((a) => a.id);
  if (apptIds.length === 0) return NextResponse.json({ reports: [] });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com";
  const reports: ReportRow[] = [];

  const submissions = await db.formSubmission.findMany({
    where: { appointmentId: { in: apptIds } },
    include: { template: { select: { name: true } } },
  });
  for (const s of submissions) {
    let token = s.reportToken;
    if (!token) {
      token = generateReportToken();
      await db.formSubmission.update({ where: { id: s.id }, data: { reportToken: token } });
    }
    const appt = apptById.get(s.appointmentId)!;
    reports.push({
      id: s.id,
      label: s.template.name,
      appointmentNumber: appt.appointmentNumber,
      service: appt.service,
      date: s.submittedAt.toISOString(),
      // FormSubmission doesn't persist a sent flag — inferred from which
      // contact info was on file at send time, same logic the send route uses.
      channel: appt.email ? "email" : appt.phone ? "sms" : "not sent yet",
      url: `${baseUrl}/api/reports/${token}`,
    });
  }

  const diagnostics = await db.serviceDiagnostic.findMany({ where: { appointmentId: { in: apptIds } } });
  for (const d of diagnostics) {
    let token = d.reportToken;
    if (!token) {
      token = generateReportToken();
      await db.serviceDiagnostic.update({ where: { id: d.id }, data: { reportToken: token } });
    }
    const appt = apptById.get(d.appointmentId)!;
    reports.push({
      id: d.id,
      label: "Service Diagnostic Report",
      appointmentNumber: appt.appointmentNumber,
      service: appt.service,
      date: (d.completedAt ?? d.createdAt).toISOString(),
      channel: !d.customerReportSentAt ? "not sent yet" : appt.email ? "email" : "sms",
      url: `${baseUrl}/api/reports/${token}`,
    });
  }

  const startups = await db.systemStartup.findMany({ where: { appointmentId: { in: apptIds } } });
  for (const su of startups) {
    let token = su.reportToken;
    if (!token) {
      token = generateReportToken();
      await db.systemStartup.update({ where: { id: su.id }, data: { reportToken: token } });
    }
    const appt = apptById.get(su.appointmentId)!;
    reports.push({
      id: su.id,
      label: "System Startup & Commissioning Report",
      appointmentNumber: appt.appointmentNumber,
      service: appt.service,
      date: (su.completedAt ?? su.createdAt).toISOString(),
      channel: !su.customerReportSentAt ? "not sent yet" : appt.email ? "email" : "sms",
      url: `${baseUrl}/api/reports/${token}`,
    });
  }

  reports.sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json({ reports });
}
