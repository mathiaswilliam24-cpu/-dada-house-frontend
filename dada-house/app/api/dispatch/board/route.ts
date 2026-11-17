import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  getDispatchConfig, getBoardTechnicians, techHoursFor, boardStatus, ctParts, ctInstant,
  inferJobType, JOB_TYPES, type JobType,
} from "@/lib/dispatch";

export const dynamic = "force-dynamic";

const jobSelect = {
  id: true, appointmentNumber: true, name: true, phone: true, email: true, address: true, city: true, zipCode: true,
  service: true, subservice: true, description: true, jobType: true, jobCategory: true, customerType: true,
  priority: true, isEmergency: true, status: true, techStatus: true, technicianId: true, confirmedAt: true,
  scheduledStart: true, scheduledEnd: true, estimatedMinutes: true, arrivalWindow: true,
  preferredDate: true, preferredTime: true, source: true, createdAt: true, customerId: true, diagnosticFee: true,
  assignments: { select: { technicianId: true, role: true } },
} as const;

/** Dispatch Board data for a day (or a 7-day week) in Houston time. */
export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;

  const sp = new URL(req.url).searchParams;
  const today = ctParts(new Date()).ymd;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("date") ?? "") ? sp.get("date")! : today;
  const days = sp.get("days") === "7" ? 7 : 1;
  const from = ctInstant(date, 0);
  const to = new Date(from.getTime() + days * 86400000 + 3 * 3600000); // DST-safe end, trimmed below
  const dayList = Array.from({ length: days }, (_, i) => ctParts(new Date(from.getTime() + i * 86400000 + 12 * 3600000)).ymd);
  const rangeEnd = ctInstant(dayList[dayList.length - 1], 1440);

  const cfg = await getDispatchConfig();
  const techs = await getBoardTechnicians();

  const [scheduled, unscheduled, clock, live, activeContracts] = await Promise.all([
    db.appointment.findMany({
      where: { scheduledStart: { gte: from, lt: rangeEnd < to ? rangeEnd : to } },
      select: jobSelect,
      orderBy: { scheduledStart: "asc" },
    }),
    // Open work that still needs a technician or a time slot.
    db.appointment.findMany({
      where: {
        status: { notIn: ["COMPLETED", "CANCELLED"] },
        OR: [{ technicianId: null }, { scheduledStart: null }],
      },
      select: jobSelect,
      orderBy: [{ isEmergency: "desc" }, { preferredDate: "asc" }, { createdAt: "asc" }],
      take: 300,
    }),
    db.technicianClockEntry.findMany({
      where: { userId: { in: techs.map((t) => t.id) }, timestamp: { gte: ctInstant(today, 0) } },
      orderBy: { timestamp: "desc" },
      distinct: ["userId"],
    }),
    db.technicianLocation.findMany({
      where: { userId: { in: techs.map((t) => t.id) }, timestamp: { gte: new Date(Date.now() - 30 * 60000) } },
      orderBy: { timestamp: "desc" },
      distinct: ["userId"],
    }),
    db.maintenanceContract.findMany({ where: { status: { in: ["ACTIVE", "PAID"] } }, select: { customerId: true } }),
  ]);
  const members = new Set(activeContracts.map((c) => c.customerId));

  const shape = (j: (typeof scheduled)[number]) => {
    const jobType = (j.jobType as JobType) || inferJobType(j.service);
    return {
      ...j,
      jobType,
      jobTypeLabel: JOB_TYPES[jobType].label,
      color: JOB_TYPES[jobType].color,
      inferredType: !j.jobType,
      boardStatus: boardStatus(j),
      member: !!j.customerId && members.has(j.customerId),
      crew: j.assignments.filter((a) => a.technicianId !== j.technicianId),
    };
  };

  const jobs = scheduled.map(shape);
  const now = Date.now();
  const technicians = techs.map((t) => {
    const p = t.technicianProfile;
    const c = clock.find((e) => e.userId === t.id);
    const mine = jobs.filter((j) => j.technicianId === t.id || j.assignments.some((a) => a.technicianId === t.id));
    const active = mine.find((j) => j.boardStatus === "ON_THE_WAY" || j.boardStatus === "IN_PROGRESS");
    const onDuty = c?.type === "IN";
    let status = "OFF_DUTY";
    if (active?.boardStatus === "ON_THE_WAY") status = "DRIVING";
    else if (active) status = "ON_JOB";
    else if (onDuty) status = mine.some((j) => j.scheduledStart && new Date(j.scheduledStart).getTime() <= now && new Date(j.scheduledEnd!).getTime() > now && j.boardStatus !== "COMPLETED") ? "ASSIGNED" : "AVAILABLE";
    return {
      id: t.id, name: t.name ?? "Technician", phone: t.phone, image: p?.photo ?? t.image,
      color: p?.boardColor ?? null, role: p?.techRole ?? null, skills: [...(p?.skills ?? []), ...(p?.specialties ?? [])],
      emergencyAvailable: !!p?.emergencyAvailable,
      hours: Object.fromEntries(dayList.map((d) => [d, techHoursFor(t, cfg, ctParts(ctInstant(d, 720)).dayKey)])),
      status, clockedInAt: onDuty ? c!.timestamp : null,
      location: live.find((l) => l.userId === t.id) ?? null,
      bookedMinutes: mine.filter((j) => j.boardStatus !== "CANCELED").reduce((s, j) => s + (new Date(j.scheduledEnd!).getTime() - new Date(j.scheduledStart!).getTime()) / 60000, 0),
    };
  });

  const todays = jobs.filter((j) => ctParts(new Date(j.scheduledStart!)).ymd === date);
  const kpis = {
    scheduled: todays.filter((j) => j.boardStatus !== "CANCELED").length,
    completed: todays.filter((j) => j.boardStatus === "COMPLETED").length,
    inProgress: todays.filter((j) => j.boardStatus === "IN_PROGRESS" || j.boardStatus === "ON_THE_WAY").length,
    unassigned: unscheduled.length,
    emergency: [...todays, ...unscheduled.map(shape)].filter((j) => j.isEmergency && j.boardStatus !== "COMPLETED" && j.boardStatus !== "CANCELED").length,
    canceled: todays.filter((j) => j.boardStatus === "CANCELED").length,
    techsAvailable: technicians.filter((t) => t.status === "AVAILABLE").length,
    techsOnJob: technicians.filter((t) => t.status === "ON_JOB" || t.status === "DRIVING" || t.status === "ASSIGNED").length,
    techsOff: technicians.filter((t) => t.status === "OFF_DUTY").length,
  };

  return NextResponse.json({
    date, days: dayList, today,
    config: { boardStart: cfg.boardStart, boardEnd: cfg.boardEnd, defaultMinutes: cfg.defaultMinutes, autoDispatch: cfg.autoDispatch },
    jobTypes: Object.fromEntries(Object.entries(JOB_TYPES).map(([k, v]) => [k, { label: v.label, color: v.color, minutes: cfg.defaultMinutes[k as JobType], categories: v.categories }])),
    technicians, jobs, unassigned: unscheduled.map(shape), kpis,
  });
}
