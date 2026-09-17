import { NextRequest, NextResponse, after } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { guessServiceType } from "@/lib/service-diagnostic-fields";
import { sendDiagnosticCustomerReport } from "@/lib/diagnostic-report-email";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = [
  "serviceType", "customerReportedIssue", "arrivalTime", "diagnosticStartTime", "diagnosticCompletionTime",
  "equipmentInspected", "systemOperatingOnArrival", "visibleDamage", "waterLeakPresent", "unusualNoise",
  "burningSmell", "immediateSafetyConcern", "safetyConcernDescription",
  "sectionData",
  "problemFound", "rootCause", "evidenceSupportingDiagnosis", "affectedComponents", "recommendedRepair", "additionalRecommendations",
  "partsRequired",
  "repairUrgency", "canCustomerContinueUsing", "cannotContinueExplanation",
  "finalDiagnosis", "recommendedCorrectiveWork", "estimatedRepairType", "systemStatusWhenLeaving",
];

const DATE_FIELDS = new Set(["arrivalTime", "diagnosticStartTime", "diagnosticCompletionTime"]);

function pickAllowed(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) {
      const value = body[key];
      data[key] = DATE_FIELDS.has(key) && value ? new Date(value as string) : value;
    }
  }
  return data;
}

async function findAppointment(id: string, auth: { id: string; role: string }) {
  const staffRoles = ["ADMIN", "SUPER_ADMIN"];
  return db.appointment.findFirst({
    where: { id, technicianId: staffRoles.includes(auth.role) ? undefined : auth.id },
    select: { id: true, service: true, techStatus: true },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const diagnostic = await db.serviceDiagnostic.findUnique({ where: { appointmentId: id } });
  if (diagnostic) return NextResponse.json({ diagnostic });

  const appointment = await findAppointment(id, auth);
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    diagnostic: null,
    defaults: { serviceType: guessServiceType(appointment.service) },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const appointment = await findAppointment(id, auth);
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data = pickAllowed(body);

  const diagnostic = await db.serviceDiagnostic.upsert({
    where: { appointmentId: id },
    create: {
      appointmentId: id,
      technicianId: auth.id,
      serviceType: guessServiceType(appointment.service),
      ...data,
    },
    update: data,
  });

  if (appointment.techStatus === "ARRIVED") {
    await db.appointment.update({ where: { id }, data: { techStatus: "DIAGNOSING" } });
  }

  return NextResponse.json({ diagnostic });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  if (body.action !== "complete") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const appointment = await findAppointment(id, auth);
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const diagnostic = await db.serviceDiagnostic.findUnique({ where: { appointmentId: id } });
  if (!diagnostic) return NextResponse.json({ error: "Save the diagnostic before completing it." }, { status: 400 });

  // Same behavior as the other Service Forms: no quality gate, no supervisor
  // review — saving/completing sends the customer report right away.
  const updated = await db.serviceDiagnostic.update({
    where: { appointmentId: id },
    data: { completedAt: new Date(), status: "APPROVED" },
  });

  after(() => sendDiagnosticCustomerReport(updated.id, auth.id).catch((err) => console.error("Failed to generate/send diagnostic customer report:", err)));

  return NextResponse.json({ diagnostic: updated });
}
