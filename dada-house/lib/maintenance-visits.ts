import { db } from "@/lib/db";
import { ctParts, ctInstant, getDispatchConfig, logJobEvent, nextCallNumber } from "@/lib/dispatch";

/**
 * Maintenance memberships include 2 tune-ups per contract year: spring (AC) and fall
 * (heating). This module turns each covered contract into concrete visit records with a
 * window and due date, and keeps them in sync with the jobs created for them.
 * All dates are North Carolina (America/New_York) time.
 */

export const COVERED_STATUSES = ["ACTIVE", "PAID", "PAST_DUE"] as const;

export const SEASONS = {
  SPRING_AC: { label: "Spring AC tune-up", from: [3, 1], to: [5, 31] },
  FALL_HEATING: { label: "Fall heating tune-up", from: [9, 1], to: [11, 30] },
} as const;
export type Season = keyof typeof SEASONS;

const MIN_WINDOW_DAYS = 21; // a season with less time left than this rolls to the next one

const ymd = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const addYears = (d: Date, n: number) => {
  const p = ctParts(d).ymd.split("-").map(Number);
  return ctInstant(ymd(p[0] + n, p[1], Math.min(p[2], 28)), 0);
};

export function contractStart(c: { membershipStartDate: Date | null; agreementStartDate: Date | null; paidAt: Date | null; createdAt: Date }) {
  return c.membershipStartDate ?? c.agreementStartDate ?? c.paidAt ?? c.createdAt;
}

/** Start of the contract year that contains `now`. */
export function currentPeriodStart(start: Date, now = new Date()) {
  let ps = ctInstant(ctParts(start).ymd, 0);
  while (addYears(ps, 1) <= now) ps = addYears(ps, 1);
  return ps;
}

/** The two seasonal visit windows of a contract year. */
export function visitWindows(periodStart: Date) {
  const periodEnd = addYears(periodStart, 1);
  const y0 = Number(ctParts(periodStart).ymd.slice(0, 4));
  const candidates: { season: Season; start: Date; end: Date }[] = [];
  for (const y of [y0, y0 + 1]) {
    for (const season of ["SPRING_AC", "FALL_HEATING"] as Season[]) {
      const s = SEASONS[season];
      candidates.push({ season, start: ctInstant(ymd(y, s.from[0], s.from[1]), 0), end: ctInstant(ymd(y, s.to[0], s.to[1]), 1439) });
    }
  }
  return candidates
    // Clip each season to the contract year; drop what's too short to schedule.
    .map((w) => ({ ...w, start: w.start < periodStart ? periodStart : w.start, end: w.end >= periodEnd ? new Date(periodEnd.getTime() - 60000) : w.end }))
    .filter((w) => (w.end.getTime() - w.start.getTime()) / 86400000 >= MIN_WINDOW_DAYS)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 2);
}

export type VisitState = "OVERDUE" | "DUE_NOW" | "UPCOMING" | "SCHEDULED" | "COMPLETED" | "SKIPPED";

export function visitState(v: { status: string; windowStart: Date; windowEnd: Date }, now = new Date()): VisitState {
  if (v.status === "COMPLETED") return "COMPLETED";
  if (v.status === "SKIPPED") return "SKIPPED";
  if (v.status === "SCHEDULED") return "SCHEDULED";
  if (now > v.windowEnd) return "OVERDUE";
  if (now >= v.windowStart) return "DUE_NOW";
  return "UPCOMING";
}

/**
 * Creates this contract year's visits for every covered contract (idempotent) and syncs
 * visit status from linked jobs: completed job → visit completed; canceled job → visit
 * back to due.
 */
export async function syncMaintenanceVisits() {
  const now = new Date();
  const contracts = await db.maintenanceContract.findMany({
    where: { status: { in: [...COVERED_STATUSES] } },
    select: { id: true, customerId: true, membershipStartDate: true, agreementStartDate: true, paidAt: true, createdAt: true },
  });

  const rows = contracts.flatMap((c) => {
    const ps = currentPeriodStart(contractStart(c), now);
    return visitWindows(ps).map((w, i) => ({
      contractId: c.id, customerId: c.customerId, periodStart: ps, visitNumber: i + 1,
      season: w.season, windowStart: w.start, windowEnd: w.end,
    }));
  });
  if (rows.length) await db.maintenanceVisit.createMany({ data: rows, skipDuplicates: true });

  const linked = await db.maintenanceVisit.findMany({
    where: { appointmentId: { not: null }, status: { in: ["DUE", "SCHEDULED"] } },
    select: { id: true, status: true, appointment: { select: { status: true, techStatus: true, updatedAt: true } } },
  });
  for (const v of linked) {
    const a = v.appointment;
    if (!a) continue;
    if (a.status === "COMPLETED" || a.techStatus === "COMPLETED") {
      await db.maintenanceVisit.update({ where: { id: v.id }, data: { status: "COMPLETED", completedAt: a.updatedAt } });
    } else if (a.status === "CANCELLED" || a.techStatus === "CANCELED") {
      await db.maintenanceVisit.update({ where: { id: v.id }, data: { status: "DUE", appointmentId: null } });
    } else if (v.status !== "SCHEDULED") {
      await db.maintenanceVisit.update({ where: { id: v.id }, data: { status: "SCHEDULED" } });
    }
  }
  // A job deleted outright leaves the visit SCHEDULED with no job.
  await db.maintenanceVisit.updateMany({ where: { status: "SCHEDULED", appointmentId: null }, data: { status: "DUE" } });
}

/** Creates the maintenance job for a visit (Needs-scheduling queue on the board) and links it. */
export type VisitSlot = { start: Date; end: Date; window: string; minutes: number };
export async function createVisitJob(visitId: string, user: { id: string | null; name?: string | null }, opts: { slot?: VisitSlot; source?: string; notes?: string | null } = {}) {
  const cfg = await getDispatchConfig();
  const visit = await db.maintenanceVisit.findUniqueOrThrow({
    where: { id: visitId },
    include: {
      contract: {
        include: {
          customer: true,
          planType: { select: { name: true } },
          properties: { take: 1, orderBy: { createdAt: "asc" } },
          hvacSystems: { select: { id: true } },
        },
      },
    },
  });
  if (visit.appointmentId) throw new Error("This visit already has a job.");
  if (visit.status === "COMPLETED" || visit.status === "SKIPPED") throw new Error("This visit is already closed.");

  const c = visit.contract;
  const cust = c.customer;
  const prop = c.properties[0];
  const address = prop?.address ?? cust.address ?? "";
  if (!address) throw new Error("No service address on this membership or customer. Add an address first.");
  const systems = Math.max(1, c.hvacSystems.length || c.numberOfSystems || 1);
  const name = [cust.firstName, cust.lastName].filter(Boolean).join(" ") || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Member";
  const season = SEASONS[visit.season as Season];
  const today = ctInstant(ctParts(new Date()).ymd, 12 * 60);

  return db.$transaction(async (tx) => {
    const appointmentNumber = await nextCallNumber(tx);
    const job = await tx.appointment.create({
      data: {
        appointmentNumber,
        service: "HVAC Maintenance",
        subservice: season.label,
        jobType: "MAINTENANCE",
        jobCategory: visit.visitNumber === 1 ? "First Maintenance Visit" : "Second Maintenance Visit",
        name,
        phone: cust.phone,
        email: cust.email ?? c.email ?? "",
        address: prop?.apt ? `${address} ${prop.apt}` : address,
        city: prop?.city ?? cust.city ?? "",
        zipCode: prop?.zipCode ?? cust.zipCode ?? "",
        description: [
          `${c.planType.name} membership${c.membershipNumber ? ` #${c.membershipNumber}` : ""} — visit ${visit.visitNumber} of 2 (${season.label})`,
          `${systems} system${systems > 1 ? "s" : ""} covered`,
          prop?.accessInstructions ? `Access: ${prop.accessInstructions}` : null,
          prop?.gateCode ? `Gate code: ${prop.gateCode}` : null,
          prop?.tenantName ? `Tenant: ${prop.tenantName}${prop.tenantPhone ? ` ${prop.tenantPhone}` : ""}` : null,
          opts.notes ? `Customer notes: ${opts.notes}` : null,
        ].filter(Boolean).join("\n"),
        preferredDate: visit.windowStart > today ? visit.windowStart : today,
        estimatedMinutes: opts.slot?.minutes ?? (cfg.defaultMinutes.MAINTENANCE ?? 60) * systems,
        ...(opts.slot ? {
          preferredDate: opts.slot.start, preferredTime: `${opts.slot.window} (arrival window requested)`,
          scheduledStart: opts.slot.start, scheduledEnd: opts.slot.end, arrivalWindow: opts.slot.window, eta: opts.slot.start,
        } : {}),
        customerType: cust.customerType,
        customerId: cust.id,
        source: opts.source ?? "maintenance",
        leadSource: "Maintenance membership",
        createdById: user.id,
      },
    });
    await tx.maintenanceVisit.update({ where: { id: visit.id }, data: { appointmentId: job.id, status: "SCHEDULED" } });
    await logJobEvent({ appointmentId: job.id, type: "CREATED", message: `Maintenance visit ${visit.visitNumber}/2 job created${opts.slot ? ` — requested ${ctParts(opts.slot.start).ymd}, ${opts.slot.window}; needs a technician (pending dispatch)` : ""}`, userId: user.id, userName: user.name ?? null }, tx);
    return job;
  });
}
