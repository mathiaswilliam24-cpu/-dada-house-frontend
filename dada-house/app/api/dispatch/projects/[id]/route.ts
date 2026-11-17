import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getDispatchConfig, logJobEvent, nextCallNumber, JOB_TYPE_KEYS, type JobType } from "@/lib/dispatch";
import { PROJECT_STAGE_KEYS, stageInfo, stageIndex } from "@/lib/projects";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const p = await db.project.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
      events: { orderBy: { createdAt: "desc" }, take: 100 },
      appointments: {
        select: {
          id: true, appointmentNumber: true, jobType: true, jobCategory: true, status: true, techStatus: true,
          scheduledStart: true, scheduledEnd: true, technician: { select: { name: true } },
          assignments: { select: { role: true, technicianId: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!p) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json({
    project: { ...p, customer: { ...p.customer, name: [p.customer.firstName, p.customer.lastName].filter(Boolean).join(" ") } },
  });
}

const patchSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  zipCode: z.string().trim().max(15).nullable().optional(),
  equipmentSummary: z.string().trim().max(500).nullable().optional(),
  contractAmount: z.number().min(0).max(1_000_000).nullable().optional(),
  depositAmount: z.number().min(0).max(1_000_000).nullable().optional(),
  permitNumber: z.string().trim().max(80).nullable().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  salesRepId: z.string().nullable().optional(),
  leadInstallerId: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  const { targetDate, ...rest } = parsed.data;
  await db.project.update({
    where: { id },
    data: { ...rest, ...(targetDate !== undefined ? { targetDate: targetDate ? new Date(`${targetDate}T12:00:00Z`) : null } : {}) },
  });
  await db.projectEvent.create({ data: { projectId: id, type: "UPDATED", message: "Project details updated", userId: auth.id, userName: auth.name ?? null } });
  return NextResponse.json({ ok: true });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("stage"), stage: z.enum(PROJECT_STAGE_KEYS as [string, ...string[]]) }),
  z.object({ action: z.literal("note"), note: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("hold") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(2).max(500) }),
  z.object({
    action: z.literal("create_job"),
    jobType: z.enum(JOB_TYPE_KEYS as [JobType, ...JobType[]]),
    category: z.string().trim().min(2).max(120),
    minutes: z.number().int().min(15).max(1440 * 3).optional(),
    notes: z.string().trim().max(2000).optional(),
  }),
]);

export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const a = parsed.data;
  const p = await db.project.findUnique({ where: { id }, include: { customer: true } });
  if (!p) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const who = { userId: auth.id, userName: auth.name ?? null };

  if (a.action === "stage") {
    if (p.status === "CANCELED") return NextResponse.json({ error: "This project is canceled." }, { status: 400 });
    if (a.stage === p.stage) return NextResponse.json({ ok: true });
    const back = stageIndex(a.stage) < stageIndex(p.stage);
    await db.project.update({
      where: { id },
      data: { stage: a.stage, stageUpdatedAt: new Date(), status: a.stage === "CLOSED" ? "COMPLETED" : p.status === "COMPLETED" ? "OPEN" : p.status },
    });
    await db.projectEvent.create({
      data: { projectId: id, type: "STAGE", fromStage: p.stage, toStage: a.stage, message: `${back ? "Moved back" : "Moved"} to "${stageInfo(a.stage).label}"`, ...who },
    });
  } else if (a.action === "note") {
    await db.projectEvent.create({ data: { projectId: id, type: "NOTE", message: a.note, ...who } });
    await db.project.update({ where: { id }, data: { updatedAt: new Date() } });
  } else if (a.action === "hold" || a.action === "resume") {
    await db.project.update({ where: { id }, data: { status: a.action === "hold" ? "ON_HOLD" : "OPEN" } });
    await db.projectEvent.create({ data: { projectId: id, type: "UPDATED", message: a.action === "hold" ? "Put on hold" : "Resumed", ...who } });
  } else if (a.action === "cancel") {
    await db.project.update({ where: { id }, data: { status: "CANCELED" } });
    await db.projectEvent.create({ data: { projectId: id, type: "UPDATED", message: `Canceled: ${a.reason}`, ...who } });
  } else if (a.action === "create_job") {
    const address = p.address ?? p.customer.address;
    if (!address) return NextResponse.json({ error: "Add the job site address to the project first." }, { status: 400 });
    const cfg = await getDispatchConfig();
    const job = await db.$transaction(async (tx) => {
      const appointmentNumber = await nextCallNumber(tx);
      const j = await tx.appointment.create({
        data: {
          appointmentNumber,
          service: a.jobType === "INSTALLATION" ? "HVAC Installation" : a.category,
          jobType: a.jobType,
          jobCategory: a.category,
          name: [p.customer.firstName, p.customer.lastName].filter(Boolean).join(" "),
          phone: p.customer.phone,
          email: p.customer.email ?? "",
          address,
          city: p.city ?? p.customer.city ?? "",
          zipCode: p.zipCode ?? p.customer.zipCode ?? "",
          description: [`Project ${p.projectNumber}: ${p.name}`, p.equipmentSummary ? `Equipment: ${p.equipmentSummary}` : null, a.notes || null].filter(Boolean).join("\n"),
          estimatedMinutes: a.minutes ?? cfg.defaultMinutes[a.jobType] ?? 60,
          preferredDate: p.targetDate ?? null,
          customerId: p.customerId,
          projectId: p.id,
          customerType: p.customer.customerType,
          source: "project",
          createdById: auth.id,
        },
      });
      await logJobEvent({ appointmentId: j.id, type: "CREATED", message: `Created from project ${p.projectNumber}`, ...who }, tx);
      await tx.projectEvent.create({ data: { projectId: id, type: "JOB", message: `Job #${appointmentNumber} created — ${a.category}`, ...who } });
      return j;
    });
    return NextResponse.json({ ok: true, jobId: job.id, appointmentNumber: job.appointmentNumber });
  }
  return NextResponse.json({ ok: true });
}
