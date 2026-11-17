import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { findOrCreateCustomerByPhone } from "@/lib/customers";
import { ctParts } from "@/lib/dispatch";
import { PROJECT_STAGE_KEYS } from "@/lib/projects";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["ADMIN", "SUPER_ADMIN", "MANAGER", "DISPATCHER", "CUSTOMER_SERVICE_REP", "TECHNICIAN"] as const;

/** Installation projects pipeline. ?view=open (default) | closed | all */
export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  const view = new URL(req.url).searchParams.get("view") ?? "open";
  const where = view === "all" ? {} : view === "closed" ? { status: { in: ["COMPLETED", "CANCELED"] } } : { status: { in: ["OPEN", "ON_HOLD"] } };

  const [projects, staff] = await Promise.all([
    db.project.findMany({
      where: { kind: "INSTALLATION", ...where },
      orderBy: [{ updatedAt: "desc" }],
      take: 500,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        appointments: {
          where: { status: { not: "CANCELLED" } },
          select: { id: true, appointmentNumber: true, jobCategory: true, scheduledStart: true, status: true },
          orderBy: { scheduledStart: "asc" },
        },
      },
    }),
    db.user.findMany({ where: { role: { in: [...STAFF_ROLES] } }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
  ]);

  const staffName = new Map(staff.map((s) => [s.id, s.name]));
  const now = new Date();
  return NextResponse.json({
    staff,
    projects: projects.map((p) => {
      const next = p.appointments.find((a) => a.scheduledStart && a.scheduledStart > now && a.status !== "COMPLETED");
      return {
        id: p.id, number: p.projectNumber, name: p.name, stage: p.stage, status: p.status,
        stageUpdatedAt: (p.stageUpdatedAt ?? p.createdAt).toISOString(), updatedAt: p.updatedAt.toISOString(),
        customer: { id: p.customer.id, name: [p.customer.firstName, p.customer.lastName].filter(Boolean).join(" "), phone: p.customer.phone },
        address: [p.address, p.city].filter(Boolean).join(", "),
        equipmentSummary: p.equipmentSummary, contractAmount: p.contractAmount,
        targetDate: p.targetDate?.toISOString() ?? null,
        salesRep: p.salesRepId ? staffName.get(p.salesRepId) ?? null : null,
        leadInstaller: p.leadInstallerId ? staffName.get(p.leadInstallerId) ?? null : null,
        jobs: p.appointments.length,
        nextJob: next ? { id: next.id, number: next.appointmentNumber, category: next.jobCategory, start: next.scheduledStart!.toISOString() } : null,
      };
    }),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(160),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(7).max(30),
    email: z.union([z.literal(""), z.string().email()]).optional(),
    address: z.string().trim().min(3).max(200),
    city: z.string().trim().max(80).optional().default(""),
    zipCode: z.string().trim().max(15).optional().default(""),
  }),
  description: z.string().trim().max(4000).optional(),
  equipmentSummary: z.string().trim().max(500).optional(),
  contractAmount: z.number().min(0).max(1_000_000).nullable().optional(),
  depositAmount: z.number().min(0).max(1_000_000).nullable().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  salesRepId: z.string().nullable().optional(),
  leadInstallerId: z.string().nullable().optional(),
  stage: z.enum(PROJECT_STAGE_KEYS as [string, ...string[]]).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data", path: parsed.error.issues[0]?.path }, { status: 400 });
  const d = parsed.data;

  const [firstName, ...rest] = d.customer.name.split(/\s+/);
  const customer = await findOrCreateCustomerByPhone(d.customer.phone, {
    firstName, lastName: rest.join(" ") || null, email: d.customer.email || null,
    address: d.customer.address, city: d.customer.city || null, zipCode: d.customer.zipCode || null,
  });

  const project = await db.$transaction(async (tx) => {
    const year = ctParts(new Date()).ymd.slice(0, 4);
    const rows = await tx.$queryRaw<{ value: number }[]>`
      INSERT INTO "Counter" ("key", "value") VALUES (${"project-" + year}, 1)
      ON CONFLICT ("key") DO UPDATE SET "value" = "Counter"."value" + 1
      RETURNING "value"`;
    const p = await tx.project.create({
      data: {
        customerId: customer.id,
        projectNumber: `IP-${year}-${String(rows[0].value).padStart(4, "0")}`,
        kind: "INSTALLATION",
        name: d.name,
        description: d.description || null,
        stage: d.stage ?? "LEAD",
        stageUpdatedAt: new Date(),
        address: d.customer.address, city: d.customer.city || null, zipCode: d.customer.zipCode || null,
        equipmentSummary: d.equipmentSummary || null,
        contractAmount: d.contractAmount ?? null,
        depositAmount: d.depositAmount ?? null,
        targetDate: d.targetDate ? new Date(`${d.targetDate}T12:00:00Z`) : null,
        salesRepId: d.salesRepId || null,
        leadInstallerId: d.leadInstallerId || null,
        createdById: auth.id,
      },
    });
    await tx.projectEvent.create({ data: { projectId: p.id, type: "CREATED", message: `Project created (${p.projectNumber})`, toStage: p.stage, userId: auth.id, userName: auth.name ?? null } });
    return p;
  });
  return NextResponse.json({ ok: true, id: project.id, number: project.projectNumber });
}
