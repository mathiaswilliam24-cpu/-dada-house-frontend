import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { getDispatchConfig, saveDispatchConfig, DEFAULT_CONFIG, JOB_TYPES, JOB_TYPE_KEYS, PAY_ROLES, type JobType } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const day = z.object({ start: time, end: time }).refine((d) => d.end > d.start, "Closing time must be after opening time").nullable();
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const schema = z.object({
  boardStart: time,
  boardEnd: time,
  businessHours: z.object(Object.fromEntries(DAYS.map((d) => [d, day])) as Record<(typeof DAYS)[number], typeof day>),
  defaultMinutes: z.object(Object.fromEntries(JOB_TYPE_KEYS.map((k) => [k, z.number().int().min(15).max(1440)])) as Record<JobType, z.ZodNumber>),
  travelBufferMinutes: z.number().int().min(0).max(120),
  arrivalWindowHours: z.number().min(0.5).max(8),
}).superRefine((c, ctx) => {
  if (c.boardEnd <= c.boardStart) ctx.addIssue({ code: "custom", message: "Board end must be after board start", path: ["boardEnd"] });
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({
    config: await getDispatchConfig(),
    defaults: DEFAULT_CONFIG,
    jobTypes: Object.fromEntries(JOB_TYPE_KEYS.map((k) => [k, { label: JOB_TYPES[k].label, color: JOB_TYPES[k].color }])),
    canEdit: PAY_ROLES.includes(auth.role),
  });
}

/** Saves dispatch settings (managers only). Fields not shown in the UI are kept as they were. */
export async function PUT(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  if (!PAY_ROLES.includes(auth.role)) return NextResponse.json({ error: "Only managers can change dispatch settings." }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 400 });

  const current = await getDispatchConfig();
  const next = { ...current, ...parsed.data };
  await saveDispatchConfig(next);
  return NextResponse.json({ ok: true, config: next });
}
