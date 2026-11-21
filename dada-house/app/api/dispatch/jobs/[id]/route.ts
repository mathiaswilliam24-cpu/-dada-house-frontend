import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  scheduleJob, ConflictError, logJobEvent, boardStatus, inferJobType, JOB_TYPES, JOB_TYPE_KEYS, type JobType,
} from "@/lib/dispatch";
import { notifyAfterSchedule, notifyCanceled } from "@/lib/dispatch-notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FORCE_ROLES = ["ADMIN", "SUPER_ADMIN", "MANAGER", "DISPATCHER"];

/** Full job detail for the board's side panel. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const job = await db.appointment.findUnique({
    where: { id },
    include: {
      assignments: true,
      events: { orderBy: { createdAt: "desc" }, take: 100 },
      customer: {
        include: {
          equipment: { orderBy: { createdAt: "desc" } },
          maintenanceContracts: { where: { status: { in: ["ACTIVE", "PAID", "PAST_DUE"] } }, include: { planType: { select: { name: true } } } },
        },
      },
      timeLog: true,
      payments: { select: { amount: true, method: true, createdAt: true } },
    },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const techIds = [...new Set([job.technicianId, ...job.assignments.map((a) => a.technicianId)].filter(Boolean) as string[])];
  const [users, history, estimates] = await Promise.all([
    db.user.findMany({ where: { id: { in: techIds } }, select: { id: true, name: true, phone: true } }),
    job.customerId
      ? db.appointment.findMany({
          where: { customerId: job.customerId, id: { not: id } },
          select: { id: true, appointmentNumber: true, service: true, jobType: true, status: true, preferredDate: true, scheduledStart: true, technician: { select: { name: true } } },
          orderBy: { createdAt: "desc" }, take: 15,
        })
      : Promise.resolve([]),
    db.estimate.findMany({ where: { appointmentId: id }, select: { id: true, estimateNumber: true, total: true, isInvoice: true, paidAt: true, status: true } }),
  ]);
  const name = (uid: string | null) => users.find((u) => u.id === uid)?.name ?? null;
  const jobType = (job.jobType as JobType) || inferJobType(job.service);

  return NextResponse.json({
    job: {
      ...job,
      jobType, jobTypeLabel: JOB_TYPES[jobType].label, color: JOB_TYPES[jobType].color, inferredType: !job.jobType,
      boardStatus: boardStatus(job),
      technicianName: name(job.technicianId),
      crew: job.assignments.filter((a) => a.technicianId !== job.technicianId).map((a) => ({ ...a, name: name(a.technicianId) })),
    },
    history, estimates,
  });
}

const patchSchema = z.object({
  jobType: z.enum(JOB_TYPE_KEYS as [JobType, ...JobType[]]).optional(),
  jobCategory: z.string().max(120).nullable().optional(),
  customerType: z.enum(["RESIDENTIAL", "COMMERCIAL"]).nullable().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "EMERGENCY"]).optional(),
  isEmergency: z.boolean().optional(),
  estimatedMinutes: z.number().int().min(15).max(60 * 24 * 5).nullable().optional(),
  arrivalWindow: z.string().max(60).nullable().optional(),
  adminNotes: z.string().max(5000).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  billingAddress: z.string().max(300).nullable().optional(),
  customerLanguage: z.enum(["en", "fr", "es"]).optional(), // saved on the Customer record
});

/** Edit call details from the board. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const before = await db.appointment.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { customerLanguage, ...data } = parsed.data;
  if (customerLanguage && before.customerId) {
    const c = await db.customer.findUnique({ where: { id: before.customerId }, select: { preferredLanguage: true } });
    if ((c?.preferredLanguage ?? "en") !== customerLanguage) {
      await db.customer.update({ where: { id: before.customerId }, data: { preferredLanguage: customerLanguage } });
      await logJobEvent({ appointmentId: id, type: "NOTE", userId: auth.id, userName: auth.name ?? null, message: `Customer text language set to ${customerLanguage.toUpperCase()}` });
    }
  }
  // Keep the board slot in sync with a new duration.
  const extra = data.estimatedMinutes && before.scheduledStart
    ? { scheduledEnd: new Date(before.scheduledStart.getTime() + data.estimatedMinutes * 60000) }
    : {};
  const job = await db.appointment.update({ where: { id }, data: { ...data, ...extra } });

  const changed = Object.keys(data).filter((k) => String((before as Record<string, unknown>)[k] ?? "") !== String((data as Record<string, unknown>)[k] ?? ""));
  if (changed.length) {
    await logJobEvent({
      appointmentId: id, type: "NOTE", userId: auth.id, userName: auth.name ?? null,
      message: `Updated ${changed.map((k) => k === "adminNotes" ? "internal notes" : k === "description" ? "problem description" : k).join(", ")}`,
    });
  }
  return NextResponse.json({ job });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("schedule"),
    technicianId: z.string().nullable(),
    start: z.string().datetime().nullable().optional(),
    end: z.string().datetime().nullable().optional(),
    crew: z.array(z.object({ technicianId: z.string(), role: z.string() })).optional(),
    force: z.boolean().optional(),
    notifyCustomer: z.boolean().optional(),
  }),
  z.object({ action: z.literal("cancel"), reason: z.string().min(2).max(500), notifyCustomer: z.boolean().optional() }),
  z.object({ action: z.literal("reopen") }),
  z.object({ action: z.literal("hold"), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("notify") }),
]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const body = parsed.data;
  const user = { id: auth.id, name: auth.name ?? null, role: auth.role };

  const before = await db.appointment.findUnique({ where: { id }, include: { assignments: true } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const prevTechIds = [...new Set([before.technicianId, ...before.assignments.map((a) => a.technicianId)].filter(Boolean) as string[])];

  if (body.action === "schedule") {
    if (body.force && !FORCE_ROLES.includes(auth.role)) return NextResponse.json({ error: "You can't override conflicts." }, { status: 403 });
    try {
      const res = await scheduleJob({
        appointmentId: id,
        technicianId: body.technicianId,
        start: body.start ? new Date(body.start) : body.start === null ? null : undefined,
        end: body.end ? new Date(body.end) : undefined,
        crew: body.crew,
        force: body.force,
        user,
      });
      after(() => notifyAfterSchedule({ appointmentId: id, previousTechIds: prevTechIds, previousStart: before.scheduledStart, notifyCustomer: !!body.notifyCustomer, userId: auth.id }).catch(console.error));
      // Same side effect as the existing assign flow: client joins the technician's client list.
      if (body.technicianId && res.techChanged && before.email) {
        const exists = await db.technicianClient.findFirst({ where: { technicianId: body.technicianId, email: before.email } });
        if (!exists) {
          await db.technicianClient.create({ data: { technicianId: body.technicianId, name: before.name, email: before.email, phone: before.phone, address: before.address, city: before.city } }).catch(() => {});
        }
      }
      return NextResponse.json({ job: res.job });
    } catch (err) {
      if (err instanceof ConflictError) return NextResponse.json({ error: "conflict", conflicts: err.conflicts }, { status: 409 });
      return NextResponse.json({ error: err instanceof Error ? err.message : "Could not schedule" }, { status: 400 });
    }
  }

  if (body.action === "cancel") {
    if (before.status === "COMPLETED") return NextResponse.json({ error: "Completed jobs can't be canceled." }, { status: 400 });
    const job = await db.appointment.update({ where: { id }, data: { status: "CANCELLED", techStatus: before.technicianId ? "CANCELED" : null } });
    await logJobEvent({ appointmentId: id, type: "CANCELED", message: `Canceled: ${body.reason}`, fromValue: before.status, toValue: "CANCELLED", userId: auth.id, userName: auth.name ?? null });
    after(() => notifyCanceled(id, prevTechIds, { by: "staff", userId: auth.id, reason: body.reason }).catch(console.error));
    return NextResponse.json({ job });
  }

  if (body.action === "reopen") {
    if (before.status !== "CANCELLED") return NextResponse.json({ error: "Only canceled jobs can be reopened." }, { status: 400 });
    const job = await db.appointment.update({ where: { id }, data: { status: "PENDING", techStatus: before.technicianId ? "ASSIGNED" : null } });
    await logJobEvent({ appointmentId: id, type: "STATUS", message: "Reopened", fromValue: "CANCELLED", toValue: "PENDING", userId: auth.id, userName: auth.name ?? null });
    return NextResponse.json({ job });
  }

  if (body.action === "hold") {
    // Needs reschedule: off the board, back to the queue, technician kept for reference.
    const job = await db.appointment.update({ where: { id }, data: { scheduledStart: null, scheduledEnd: null, techStatus: before.technicianId ? "NEED_RESCHEDULE" : null } });
    await logJobEvent({ appointmentId: id, type: "STATUS", message: `Moved to reschedule queue${body.reason ? `: ${body.reason}` : ""}`, userId: auth.id, userName: auth.name ?? null });
    after(() => notifyAfterSchedule({ appointmentId: id, previousTechIds: prevTechIds, previousStart: before.scheduledStart, notifyCustomer: false, userId: auth.id }).catch(console.error));
    return NextResponse.json({ job });
  }

  if (body.action === "confirm") {
    const job = await db.appointment.update({ where: { id }, data: { status: before.status === "PENDING" ? "CONFIRMED" : before.status, confirmedAt: before.confirmedAt ?? new Date() } });
    await logJobEvent({ appointmentId: id, type: "STATUS", message: "Customer confirmed the appointment", toValue: "CONFIRMED", userId: auth.id, userName: auth.name ?? null });
    return NextResponse.json({ job });
  }

  if (body.action === "notify") {
    // Text the customer the current schedule (after a board move).
    if (!before.scheduledStart) return NextResponse.json({ error: "This job has no scheduled time." }, { status: 400 });
    await notifyAfterSchedule({ appointmentId: id, previousTechIds: prevTechIds, previousStart: null, notifyCustomer: true, userId: auth.id, techs: false });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
