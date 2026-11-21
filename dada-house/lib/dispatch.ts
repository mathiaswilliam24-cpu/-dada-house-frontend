import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { JOB_TYPES, JOB_TYPE_KEYS, inferJobType, type JobType } from "@/lib/dispatch-catalog";
import { ctParts, hm, fmtTimeCT, arrivalWindowFor } from "@/lib/dispatch-time";

export * from "@/lib/dispatch-catalog";
export * from "@/lib/dispatch-time";

/**
 * DADA HOUSE Service Operations — dispatch core.
 * Jobs are Appointments; the board slot is scheduledStart/scheduledEnd (UTC instants),
 * mirrored into preferredDate/preferredTime so existing notifications and the
 * technician app keep working. All business times are America/New_York.
 */

// ─── Settings (Setting table, key "dispatch.config") ───────────────────────

export type DayHours = { start: string; end: string } | null;
export type WeekHours = Record<"sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat", DayHours>;

export type DispatchConfig = {
  boardStart: string; // first hour shown on the board
  boardEnd: string;
  businessHours: WeekHours;
  defaultMinutes: Record<JobType, number>;
  travelBufferMinutes: number;
  autoDispatch: "OFF" | "APPROVAL_REQUIRED" | "AUTO";
  arrivalWindowHours: number;
};

export const DEFAULT_WEEK: WeekHours = {
  sun: null,
  mon: { start: "08:00", end: "18:00" }, tue: { start: "08:00", end: "18:00" }, wed: { start: "08:00", end: "18:00" },
  thu: { start: "08:00", end: "18:00" }, fri: { start: "08:00", end: "18:00" }, sat: { start: "09:00", end: "15:00" },
};

export const DEFAULT_CONFIG: DispatchConfig = {
  boardStart: "07:00",
  boardEnd: "20:00",
  businessHours: DEFAULT_WEEK,
  defaultMinutes: Object.fromEntries(JOB_TYPE_KEYS.map((k) => [k, JOB_TYPES[k].minutes])) as Record<JobType, number>,
  travelBufferMinutes: 15,
  autoDispatch: "APPROVAL_REQUIRED",
  arrivalWindowHours: 2,
};

export async function getDispatchConfig(): Promise<DispatchConfig> {
  const row = await db.setting.findUnique({ where: { key: "dispatch.config" } });
  if (!row) return DEFAULT_CONFIG;
  try {
    const saved = JSON.parse(row.value) as Partial<DispatchConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...saved,
      businessHours: { ...DEFAULT_CONFIG.businessHours, ...(saved.businessHours ?? {}) },
      defaultMinutes: { ...DEFAULT_CONFIG.defaultMinutes, ...(saved.defaultMinutes ?? {}) },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveDispatchConfig(cfg: DispatchConfig) {
  const value = JSON.stringify(cfg);
  await db.setting.upsert({ where: { key: "dispatch.config" }, update: { value }, create: { key: "dispatch.config", value } });
}

// ─── Call numbers ──────────────────────────────────────────────────────────

/** Sequential, collision-free call number: DH-2026-000001 (counter per year, atomic upsert). */
export async function nextCallNumber(client: Prisma.TransactionClient | typeof db = db) {
  const year = ctParts(new Date()).ymd.slice(0, 4);
  const key = `call-${year}`;
  const rows = await client.$queryRaw<{ value: number }[]>`
    INSERT INTO "Counter" ("key", "value") VALUES (${key}, 1)
    ON CONFLICT ("key") DO UPDATE SET "value" = "Counter"."value" + 1
    RETURNING "value"`;
  return `DH-${year}-${String(rows[0].value).padStart(6, "0")}`;
}

// ─── Audit ─────────────────────────────────────────────────────────────────

export async function logJobEvent(
  e: { appointmentId: string; type: string; message: string; fromValue?: string | null; toValue?: string | null; userId?: string | null; userName?: string | null; metadata?: Prisma.InputJsonValue },
  client: Prisma.TransactionClient | typeof db = db
) {
  return client.jobEvent.create({ data: e }).catch((err: unknown) => console.error("job event log failed", err));
}

// ─── Board status (derived, never stored twice) ────────────────────────────

export type BoardStatus = "UNASSIGNED" | "SCHEDULED" | "CONFIRMED" | "ON_THE_WAY" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "HOLD";

export function boardStatus(a: { status: string; techStatus: string | null; technicianId: string | null; confirmedAt?: Date | string | null }): BoardStatus {
  if (a.status === "CANCELLED" || a.techStatus === "CANCELED") return "CANCELED";
  if (a.status === "COMPLETED" || a.techStatus === "COMPLETED") return "COMPLETED";
  if (a.techStatus === "NEED_RESCHEDULE") return "HOLD";
  if (!a.technicianId) return "UNASSIGNED";
  if (a.techStatus === "EN_ROUTE") return "ON_THE_WAY";
  if (a.status === "IN_PROGRESS" || ["ARRIVED", "DIAGNOSING", "WAITING_FOR_APPROVAL", "WORKING"].includes(a.techStatus ?? "")) return "IN_PROGRESS";
  if (a.confirmedAt || a.status === "CONFIRMED" || a.techStatus === "ACCEPTED") return "CONFIRMED";
  return "SCHEDULED";
}

// ─── Technicians ───────────────────────────────────────────────────────────

export async function getBoardTechnicians() {
  const users = await db.user.findMany({
    where: { role: "TECHNICIAN" },
    select: {
      id: true, name: true, phone: true, email: true, image: true,
      technicianProfile: true,
    },
    orderBy: { name: "asc" },
  });
  return users.filter((u) => u.technicianProfile?.isActive !== false);
}

export type BoardTech = Awaited<ReturnType<typeof getBoardTechnicians>>[number];

export function techSkills(t: BoardTech) {
  const p = t.technicianProfile;
  return [...(p?.skills ?? []), ...(p?.specialties ?? [])].map((s) => s.toLowerCase());
}

export function techHoursFor(t: BoardTech | null, cfg: DispatchConfig, dayKey: keyof WeekHours): DayHours {
  const wh = t?.technicianProfile?.workingHours as Partial<WeekHours> | null | undefined;
  if (wh && dayKey in wh) return wh[dayKey] ?? null;
  return cfg.businessHours[dayKey];
}

// ─── Conflicts ─────────────────────────────────────────────────────────────

export type Conflict = { kind: "OVERLAP" | "OUTSIDE_HOURS" | "DAY_OFF" | "INACTIVE"; message: string; appointmentId?: string };

/** Jobs a technician holds (primary or crew) overlapping [start, end). */
export async function overlappingJobs(technicianId: string, start: Date, end: Date, excludeId?: string, client: Prisma.TransactionClient | typeof db = db) {
  return client.appointment.findMany({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      status: { not: "CANCELLED" },
      scheduledStart: { lt: end },
      scheduledEnd: { gt: start },
      OR: [{ technicianId }, { assignments: { some: { technicianId } } }],
    },
    select: { id: true, appointmentNumber: true, name: true, scheduledStart: true, scheduledEnd: true },
  });
}

export async function findConflicts(
  tech: BoardTech, start: Date, end: Date, excludeId: string | undefined, cfg: DispatchConfig,
  client: Prisma.TransactionClient | typeof db = db
): Promise<Conflict[]> {
  const out: Conflict[] = [];
  const name = tech.name ?? "Technician";
  for (const j of await overlappingJobs(tech.id, start, end, excludeId, client)) {
    out.push({
      kind: "OVERLAP", appointmentId: j.id,
      message: `${name} already has #${j.appointmentNumber} (${j.name}) ${fmtTimeCT(j.scheduledStart!)}–${fmtTimeCT(j.scheduledEnd!)}`,
    });
  }
  const s = ctParts(start), e = ctParts(new Date(end.getTime() - 1));
  const hours = techHoursFor(tech, cfg, s.dayKey);
  if (!hours) out.push({ kind: "DAY_OFF", message: `${name} does not work on ${s.dayKey.toUpperCase()}` });
  else if (s.minutes < hm(hours.start) || e.ymd !== s.ymd || e.minutes + 1 > hm(hours.end)) {
    out.push({ kind: "OUTSIDE_HOURS", message: `Outside ${name}'s working hours (${hours.start}–${hours.end})` });
  }
  return out;
}

// ─── Scheduling (atomic) ───────────────────────────────────────────────────

export class ConflictError extends Error {
  constructor(public conflicts: Conflict[]) { super("Scheduling conflict"); }
}

export type ScheduleInput = {
  appointmentId: string;
  technicianId: string | null; // null = move back to Unassigned
  start?: Date | null;
  end?: Date | null;
  crew?: { technicianId: string; role: string }[]; // extra technicians (helpers, lead installer…)
  force?: boolean;
  user: { id: string; name?: string | null; role: string };
};

/**
 * Assigns/reschedules a job in one transaction, re-checking conflicts inside it so two
 * dispatchers can't double-book the same technician. Conflicts throw ConflictError
 * unless `force` (logged as FORCED).
 */
export async function scheduleJob(input: ScheduleInput) {
  const cfg = await getDispatchConfig();
  const techs = await getBoardTechnicians();
  const byId = new Map(techs.map((t) => [t.id, t]));

  return db.$transaction(async (tx) => {
    // Row lock on the job so concurrent edits of the same job serialize.
    await tx.$queryRaw`SELECT id FROM "Appointment" WHERE id = ${input.appointmentId} FOR UPDATE`;
    const job = await tx.appointment.findUniqueOrThrow({ where: { id: input.appointmentId }, include: { assignments: true } });
    if (job.status === "CANCELLED") throw new Error("This job is canceled. Reopen it before scheduling.");
    if (job.status === "COMPLETED") throw new Error("This job is already completed.");

    const start = input.start ?? job.scheduledStart;
    const minutes = job.estimatedMinutes ?? cfg.defaultMinutes[(job.jobType as JobType) ?? inferJobType(job.service)] ?? 60;
    const end = input.end ?? (start ? new Date(start.getTime() + minutes * 60000) : null);
    if (start && end && end <= start) throw new Error("End time must be after start time.");

    const crew = (input.crew ?? []).filter((c) => c.technicianId && c.technicianId !== input.technicianId);
    const everyone = [input.technicianId, ...crew.map((c) => c.technicianId)].filter((x): x is string => !!x);

    // Lock each technician's schedule (advisory, per tech) then re-check overlaps.
    const conflicts: Conflict[] = [];
    if (start && end) {
      for (const techId of [...new Set(everyone)].sort()) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"tech:" + techId}))`;
        const tech = byId.get(techId);
        if (!tech) { conflicts.push({ kind: "INACTIVE", message: "Technician not found or inactive" }); continue; }
        conflicts.push(...(await findConflicts(tech, start, end, job.id, cfg, tx)));
      }
    }
    if (conflicts.length && !input.force) throw new ConflictError(conflicts);

    const prevTech = job.technicianId;
    const updated = await tx.appointment.update({
      where: { id: job.id },
      data: {
        technicianId: input.technicianId,
        dispatcherId: input.user.id,
        scheduledStart: start,
        scheduledEnd: end,
        estimatedMinutes: start && end ? Math.round((end.getTime() - start.getTime()) / 60000) : job.estimatedMinutes,
        ...(start ? {
          preferredDate: start,
          preferredTime: fmtTimeCT(start),
          arrivalWindow: job.arrivalWindow && job.scheduledStart?.getTime() === start.getTime() ? job.arrivalWindow : arrivalWindowFor(start, cfg.arrivalWindowHours),
          eta: start,
        } : {}),
        // A newly assigned technician must accept again.
        // A job on hold (customer not home / needs reschedule) that gets a new time goes back to Assigned.
        ...(input.technicianId && (input.technicianId !== prevTech || (job.techStatus === "NEED_RESCHEDULE" && input.start)) ? { techStatus: "ASSIGNED" as const } : {}),
        ...(!input.technicianId ? { techStatus: null } : {}),
      },
    });

    // Crew = primary + extras.
    await tx.jobAssignment.deleteMany({ where: { appointmentId: job.id } });
    if (input.technicianId) {
      await tx.jobAssignment.createMany({
        data: [
          { appointmentId: job.id, technicianId: input.technicianId, role: "PRIMARY", createdById: input.user.id },
          ...crew.map((c) => ({ appointmentId: job.id, technicianId: c.technicianId, role: c.role || "HELPER", createdById: input.user.id })),
        ],
        skipDuplicates: true,
      });
    }

    const who = (id: string | null) => (id ? byId.get(id)?.name ?? "technician" : "Unassigned");
    const when = start ? `${ctParts(start).ymd} ${fmtTimeCT(start)}–${fmtTimeCT(end!)}` : "no time";
    const base = { appointmentId: job.id, userId: input.user.id, userName: input.user.name ?? null };
    if (prevTech !== input.technicianId) {
      await logJobEvent({ ...base, type: input.technicianId ? "ASSIGNED" : "UNASSIGNED", message: input.technicianId ? `Assigned to ${who(input.technicianId)}` : `Unassigned from ${who(prevTech)}`, fromValue: prevTech, toValue: input.technicianId }, tx);
    }
    if (job.scheduledStart?.getTime() !== start?.getTime() || job.scheduledEnd?.getTime() !== end?.getTime()) {
      await logJobEvent({ ...base, type: "SCHEDULED", message: `Scheduled ${when}`, fromValue: job.scheduledStart?.toISOString() ?? null, toValue: start?.toISOString() ?? null }, tx);
    }
    if (crew.length) {
      await logJobEvent({ ...base, type: "ASSIGNED", message: `Crew: ${crew.map((c) => `${who(c.technicianId)} (${c.role})`).join(", ")}` }, tx);
    }
    if (conflicts.length && input.force) {
      await logJobEvent({ ...base, type: "FORCED", message: `Scheduled despite conflicts: ${conflicts.map((c) => c.message).join("; ")}`, metadata: conflicts as unknown as Prisma.InputJsonValue }, tx);
    }

    return { job: updated, techChanged: prevTech !== input.technicianId, newTechIds: everyone.filter((id) => id !== prevTech && !job.assignments.some((a) => a.technicianId === id)) };
  }, { timeout: 20000 });
}

// ─── Geo ───────────────────────────────────────────────────────────────────

export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Geocodes and caches the job's service address (Google Geocoding). Returns null when unavailable. */
export async function ensureJobCoords(job: { id: string; address: string; city: string; zipCode: string; lat: number | null; lng: number | null }) {
  if (job.lat != null && job.lng != null) return { lat: job.lat, lng: job.lng };
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || !job.address) return null;
  try {
    const q = encodeURIComponent(`${job.address}, ${job.city} ${job.zipCode}`.trim());
    const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${q}&key=${key}`, { signal: AbortSignal.timeout(6000) });
    const d = await r.json();
    const loc = d.results?.[0]?.geometry?.location;
    if (!loc) return null;
    await db.appointment.update({ where: { id: job.id }, data: { lat: loc.lat, lng: loc.lng } });
    return { lat: loc.lat as number, lng: loc.lng as number };
  } catch {
    return null;
  }
}

/** Geocodes a free-text address (Google). Null when unavailable. */
export async function geocodeAddress(address: string) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || !address.trim()) return null;
  try {
    const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`, { signal: AbortSignal.timeout(6000) });
    const d = await r.json();
    const hit = d.results?.[0];
    if (!hit?.geometry?.location) return null;
    return { lat: hit.geometry.location.lat as number, lng: hit.geometry.location.lng as number, formatted: (hit.formatted_address as string) ?? address };
  } catch {
    return null;
  }
}

/** Driving minutes via Google Distance Matrix; null if the provider is unavailable. */
export async function drivingMinutes(origins: { lat: number; lng: number }[], dest: { lat: number; lng: number }): Promise<(number | null)[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key || !origins.length) return origins.map(() => null);
  try {
    const o = origins.map((p) => `${p.lat},${p.lng}`).join("|");
    const r = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(o)}&destinations=${dest.lat},${dest.lng}&departure_time=now&key=${key}`, { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    if (d.status !== "OK") return origins.map(() => null);
    return d.rows.map((row: { elements: { status: string; duration_in_traffic?: { value: number }; duration?: { value: number } }[] }) => {
      const el = row.elements[0];
      if (el?.status !== "OK") return null;
      return Math.round(((el.duration_in_traffic ?? el.duration)?.value ?? 0) / 60);
    });
  } catch {
    return origins.map(() => null);
  }
}
