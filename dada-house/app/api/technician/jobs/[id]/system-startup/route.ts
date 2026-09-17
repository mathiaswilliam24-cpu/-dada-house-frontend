import { NextRequest, NextResponse, after } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";
import { getMissingStartupFields, STARTUP_PHOTO_CATEGORIES, type SystemStartupLike } from "@/lib/system-startup-fields";

export const dynamic = "force-dynamic";

const LOCKED_STATUSES = new Set(["AWAITING_SUPERVISOR_REVIEW", "APPROVED"]);

const ALLOWED_FIELDS = [
  "additionalTechnicians", "systemType", "installationType", "permitNumber", "startupDateTime",
  "equipment", "installationChecklist", "refrigerantCircuit", "vacuumEvacuation",
  "electricalReadings", "airflowPerformance", "drainTest", "heatingStartup", "thermostatControls",
  "finalTestResults", "finalStartupResult", "failExplanation",
  "technicianCertified", "technicianSignatureUrl",
];

const DATE_FIELDS = new Set(["startupDateTime"]);

function pickAllowed(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) {
      const value = body[key];
      data[key] = DATE_FIELDS.has(key) && value ? new Date(value as string) : value;
    }
  }
  if (data.technicianCertified) data.technicianCertifiedAt = new Date();
  return data;
}

async function findAppointment(id: string, auth: { id: string; role: string }) {
  const staffRoles = ["ADMIN", "SUPER_ADMIN"];
  return db.appointment.findFirst({
    where: { id, technicianId: staffRoles.includes(auth.role) ? undefined : auth.id },
    select: { id: true, techStatus: true },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const startup = await db.systemStartup.findUnique({ where: { appointmentId: id } });
  return NextResponse.json({ startup });
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

  const existing = await db.systemStartup.findUnique({ where: { appointmentId: id }, select: { status: true } });
  if (existing && LOCKED_STATUSES.has(existing.status)) {
    return NextResponse.json({ error: "This startup form is awaiting/has passed supervisor review and can't be edited." }, { status: 409 });
  }

  const body = await req.json();
  const data = pickAllowed(body);

  const startup = await db.systemStartup.upsert({
    where: { appointmentId: id },
    create: { appointmentId: id, technicianId: auth.id, ...data },
    update: data,
  });

  if (appointment.techStatus === "ARRIVED") {
    await db.appointment.update({ where: { id }, data: { techStatus: "DIAGNOSING" } });
  }

  return NextResponse.json({ startup });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  if (body.action !== "submit") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const appointment = await findAppointment(id, auth);
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const startup = await db.systemStartup.findUnique({ where: { appointmentId: id } });
  if (!startup) return NextResponse.json({ error: "Save the form before submitting it." }, { status: 400 });
  if (LOCKED_STATUSES.has(startup.status)) {
    return NextResponse.json({ error: "This startup form has already been submitted." }, { status: 409 });
  }

  const photos = await db.jobPhoto.findMany({
    where: { appointmentId: id, category: { in: Object.values(STARTUP_PHOTO_CATEGORIES) } },
    select: { category: true },
  });
  const photoCategories = new Set(photos.map((p) => p.category));

  const missing = getMissingStartupFields(startup as unknown as SystemStartupLike, photoCategories);
  if (missing.length > 0) {
    return NextResponse.json({ error: "Startup form incomplete", missing }, { status: 400 });
  }

  const updated = await db.systemStartup.update({
    where: { appointmentId: id },
    data: { completedAt: new Date(), status: "AWAITING_SUPERVISOR_REVIEW", supervisorComment: null, reviewedById: null, reviewedAt: null },
  });

  if (process.env.ADMIN_PHONE) {
    const appt = await db.appointment.findUnique({ where: { id }, select: { appointmentNumber: true, name: true } });
    after(() =>
      sendSMS(
        process.env.ADMIN_PHONE!,
        `DADA HOUSE: System Startup submitted for review — job #${appt?.appointmentNumber} (${appt?.name}). Review at /admin/system-startups/${updated.id}`
      ).catch(console.error)
    );
  }

  return NextResponse.json({ startup: updated });
}
