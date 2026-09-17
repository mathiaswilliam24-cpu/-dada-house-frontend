import { NextRequest, NextResponse, after } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getMissingVentCleaningFields, type VentEntry } from "@/lib/duct-cleaning-fields";
import { sendVentCleaningReport } from "@/lib/vent-cleaning-report-email";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = [
  "propertyType", "totalVentsAuthorized", "supplyVentsAuthorized", "returnVentsAuthorized",
  "overallCondition", "overallConditionOther", "beforePhotos",
  "vents",
  "workPerformed", "additionalFindings", "additionalFindingsOther", "recommendedAdditionalService",
  "totalVentsCleaned", "completionStatus", "technicianNotes",
  "technicianSignatureUrl", "customerSignatureUrl",
];

function pickAllowed(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) data[key] = body[key];
  }
  return data;
}

async function findAppointment(id: string, auth: { id: string; role: string }) {
  const staffRoles = ["ADMIN", "SUPER_ADMIN"];
  return db.appointment.findFirst({
    where: { id, technicianId: staffRoles.includes(auth.role) ? undefined : auth.id },
    select: { id: true },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const record = await db.ventCleaning.findUnique({ where: { appointmentId: id } });
  return NextResponse.json({ record });
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

  const record = await db.ventCleaning.upsert({
    where: { appointmentId: id },
    create: { appointmentId: id, technicianId: auth.id, ...data },
    update: data,
  });

  return NextResponse.json({ record });
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

  const record = await db.ventCleaning.findUnique({ where: { appointmentId: id } });
  if (!record) return NextResponse.json({ error: "Save the form before completing it." }, { status: 400 });

  const missing = getMissingVentCleaningFields({
    vents: (record.vents as unknown as VentEntry[]) ?? [],
    beforePhotos: (record.beforePhotos as string[]) ?? [],
    completionStatus: record.completionStatus,
  });
  if (missing.length > 0) {
    return NextResponse.json({ error: "Form incomplete", missing }, { status: 400 });
  }

  const updated = await db.ventCleaning.update({
    where: { appointmentId: id },
    data: { completedAt: new Date() },
  });

  after(() => sendVentCleaningReport(updated.id, auth.id).catch(console.error));

  return NextResponse.json({ record: updated });
}
