import { db } from "@/lib/db";
import {
  getDispatchConfig, getBoardTechnicians, techHoursFor, boardStatus, ctParts, ctInstant, hm, fmtTimeCT,
} from "@/lib/dispatch";

/**
 * Command Center: live KPIs, operational alerts and technician status, computed from
 * real records only (jobs, clock entries, GPS pings, payments, estimates). Nothing is
 * estimated or invented — an alert exists only when the data shows the problem.
 */

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export type CommandAlert = {
  id: string;
  code: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  appointmentId?: string;
  appointmentNumber?: string;
  technicianId?: string;
  date?: string; // board day (YYYY-MM-DD) to open
  at?: string; // ISO of the triggering time
};

const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const OPEN = { notIn: ["COMPLETED", "CANCELLED"] as ("COMPLETED" | "CANCELLED")[] };
const NOT_STARTED = [null, "ASSIGNED", "ACCEPTED"];
const ON_SITE = ["ARRIVED", "DIAGNOSING", "WAITING_FOR_APPROVAL", "WORKING"];

const mins = (ms: number) => Math.round(ms / 60000);
const ago = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim());

export async function getCommandCenter() {
  const now = new Date();
  const nowCT = ctParts(now);
  const today = nowCT.ymd;
  const dayStart = ctInstant(today, 0);
  const dayEnd = ctInstant(today, 1440);
  const tomorrow = ctParts(new Date(ctInstant(today, 720).getTime() + 86400000)).ymd;
  const tomorrowStart = ctInstant(tomorrow, 0), tomorrowEnd = ctInstant(tomorrow, 1440);

  const cfg = await getDispatchConfig();
  const techs = await getBoardTechnicians();
  const techIds = techs.map((t) => t.id);
  const techName = new Map(techs.map((t) => [t.id, t.name?.trim() || "Technician"]));

  const jobSelect = {
    id: true, appointmentNumber: true, name: true, service: true, jobCategory: true, city: true,
    status: true, techStatus: true, technicianId: true, confirmedAt: true, isEmergency: true, priority: true,
    scheduledStart: true, scheduledEnd: true, preferredDate: true, createdAt: true,
    assignments: { select: { technicianId: true, role: true } },
  } as const;

  const [todayJobs, queue, createdToday, clocks, locations, paymentsToday, tomorrowJobs, staleEstimates, unpaid, events] = await Promise.all([
    db.appointment.findMany({ where: { scheduledStart: { gte: dayStart, lt: dayEnd } }, select: jobSelect, orderBy: { scheduledStart: "asc" } }),
    db.appointment.findMany({
      where: { status: OPEN, OR: [{ technicianId: null }, { scheduledStart: null }] },
      select: jobSelect, orderBy: [{ isEmergency: "desc" }, { preferredDate: "asc" }], take: 300,
    }),
    db.appointment.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
    db.technicianClockEntry.findMany({
      where: { userId: { in: techIds }, timestamp: { gte: dayStart } },
      orderBy: { timestamp: "desc" }, distinct: ["userId"],
    }),
    db.technicianLocation.findMany({
      where: { userId: { in: techIds }, timestamp: { gte: new Date(now.getTime() - 12 * 3600000) } },
      orderBy: { timestamp: "desc" }, distinct: ["userId"], select: { userId: true, timestamp: true },
    }),
    db.jobPayment.findMany({ where: { createdAt: { gte: dayStart, lt: dayEnd } }, select: { amount: true } }),
    db.appointment.findMany({
      where: { scheduledStart: { gte: tomorrowStart, lt: tomorrowEnd }, status: OPEN, confirmedAt: null },
      select: jobSelect,
    }),
    db.estimate.findMany({
      where: { status: "OPEN", createdAt: { lt: new Date(now.getTime() - 3 * 86400000) } },
      select: { id: true, estimateNumber: true, clientName: true, total: true, createdAt: true, appointmentId: true },
      orderBy: { createdAt: "asc" }, take: 50,
    }),
    db.appointment.findMany({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: new Date(now.getTime() - 14 * 86400000) },
        invoice: { is: { status: { not: "PAID" } } },
      },
      select: { id: true, appointmentNumber: true, name: true, updatedAt: true, invoice: { select: { amount: true, status: true } } },
      take: 50,
    }),
    db.jobEvent.findMany({
      orderBy: { createdAt: "desc" }, take: 30,
      select: { id: true, type: true, message: true, userName: true, createdAt: true, appointment: { select: { id: true, appointmentNumber: true, name: true } } },
    }),
  ]);

  const alerts: CommandAlert[] = [];
  const push = (a: CommandAlert) => alerts.push(a);
  const ref = (j: { id: string; appointmentNumber: string }) => ({ appointmentId: j.id, appointmentNumber: j.appointmentNumber });

  // 1. Emergencies without a technician.
  for (const j of queue.filter((j) => j.isEmergency && !j.technicianId)) {
    push({
      id: `emg-${j.id}`, code: "EMERGENCY_UNASSIGNED", severity: "critical", ...ref(j),
      title: `Emergency not assigned — ${j.name}`,
      detail: `${j.jobCategory || j.service}${j.city ? ` · ${j.city}` : ""} · waiting ${ago(mins(now.getTime() - j.createdAt.getTime()))}`,
      at: j.createdAt.toISOString(), date: today,
    });
  }

  // 2. Open requests due today or earlier that have no slot/technician yet.
  //    Recent ones one by one; anything older than 14 days is grouped into one clean-up alert.
  const staleCutoff = ctParts(new Date(now.getTime() - 14 * 86400000)).ymd;
  const dueList = queue.filter((j) => !j.isEmergency && j.preferredDate && ctParts(j.preferredDate).ymd <= today);
  const stale = dueList.filter((j) => ctParts(j.preferredDate!).ymd < staleCutoff);
  if (stale.length) {
    const oldest = stale.reduce((a, b) => (a.preferredDate! < b.preferredDate! ? a : b));
    push({
      id: "stale-requests", code: "STALE_REQUESTS", severity: "medium",
      title: `${stale.length} open request${stale.length === 1 ? "" : "s"} older than 14 days`,
      detail: `Oldest requested ${ctParts(oldest.preferredDate!).ymd}. Schedule them or cancel the ones that are no longer needed (Needs scheduling list on the board).`,
      date: today,
    });
  }
  for (const j of dueList.filter((j) => !stale.includes(j))) {
    const due = ctParts(j.preferredDate!).ymd;
    push({
      id: `due-${j.id}`, code: "UNSCHEDULED_DUE", severity: due < today ? "high" : "medium", ...ref(j),
      title: due < today ? `Overdue request — ${j.name}` : `Requested for today, not scheduled — ${j.name}`,
      detail: `${j.jobCategory || j.service} · requested ${due}${j.technicianId ? ` · ${techName.get(j.technicianId) ?? "tech"} has no time slot` : " · no technician"}`,
      date: today,
    });
  }

  const tracked = new Map<string, { jobs: typeof todayJobs }>();
  for (const id of techIds) tracked.set(id, { jobs: [] });
  for (const j of todayJobs) {
    for (const id of new Set([j.technicianId, ...j.assignments.map((a) => a.technicianId)])) {
      if (id && tracked.has(id)) tracked.get(id)!.jobs.push(j);
    }
  }

  for (const j of todayJobs) {
    if (j.status === "COMPLETED" || j.status === "CANCELLED" || !j.technicianId || !j.scheduledStart) continue;
    const who = techName.get(j.technicianId) ?? "Technician";
    const late = mins(now.getTime() - j.scheduledStart.getTime());
    // 3. Start time passed and the technician hasn't left / arrived.
    if (late >= 15 && NOT_STARTED.includes(j.techStatus)) {
      push({
        id: `late-${j.id}`, code: "LATE_START", severity: late >= 45 ? "high" : "medium", ...ref(j), technicianId: j.technicianId,
        title: `${who} is late for ${j.name}`,
        detail: `Was due at ${fmtTimeCT(j.scheduledStart)} — ${ago(late)} ago, status: ${j.techStatus === "ACCEPTED" ? "accepted, not on the way" : j.techStatus === "ASSIGNED" ? "not accepted" : "no update"}`,
        at: j.scheduledStart.toISOString(), date: today,
      });
      continue;
    }
    // 4. Not accepted yet with the start within 2 hours.
    if (j.techStatus === "ASSIGNED" && late > -120 && late < 15) {
      push({
        id: `acc-${j.id}`, code: "NOT_ACCEPTED", severity: "medium", ...ref(j), technicianId: j.technicianId,
        title: `${who} hasn't accepted ${j.name}`,
        detail: `Starts at ${fmtTimeCT(j.scheduledStart)}`,
        at: j.scheduledStart.toISOString(), date: today,
      });
    }
    // 5. On site past the scheduled end.
    if (j.scheduledEnd && ON_SITE.includes(j.techStatus ?? "")) {
      const over = mins(now.getTime() - j.scheduledEnd.getTime());
      if (over >= 30) {
        push({
          id: `over-${j.id}`, code: "RUNNING_OVER", severity: "medium", ...ref(j), technicianId: j.technicianId,
          title: `${who} is running over at ${j.name}`,
          detail: `Scheduled to finish at ${fmtTimeCT(j.scheduledEnd)} — ${ago(over)} over. Later jobs may be affected.`,
          at: j.scheduledEnd.toISOString(), date: today,
        });
      }
    }
  }

  // 6. Needs reschedule (flagged by the technician).
  for (const j of [...todayJobs, ...queue].filter((j, i, arr) => j.techStatus === "NEED_RESCHEDULE" && arr.findIndex((x) => x.id === j.id) === i)) {
    push({
      id: `hold-${j.id}`, code: "NEEDS_RESCHEDULE", severity: "high", ...ref(j),
      title: `Needs reschedule — ${j.name}`,
      detail: `${j.technicianId ? techName.get(j.technicianId) ?? "Technician" : "Technician"} flagged this job for rescheduling`,
      date: today,
    });
  }

  // 7. Technician has started jobs today but never clocked in.
  const lastClock = new Map(clocks.map((c) => [c.userId, c]));
  for (const t of techs) {
    const first = tracked.get(t.id)!.jobs.filter((j) => j.status !== "CANCELLED" && j.scheduledStart)[0];
    if (!first) continue;
    const late = mins(now.getTime() - first.scheduledStart!.getTime());
    if (late >= 0 && !lastClock.has(t.id)) {
      push({
        id: `clk-${t.id}`, code: "NOT_CLOCKED_IN", severity: "medium", technicianId: t.id,
        title: `${techName.get(t.id)} hasn't clocked in`,
        detail: `First job today was at ${fmtTimeCT(first.scheduledStart!)} (#${first.appointmentNumber})`,
        appointmentId: first.id, appointmentNumber: first.appointmentNumber, date: today,
      });
    }
  }

  // 8. Tomorrow's jobs not confirmed with the customer (after noon only, so there's time to call).
  if (nowCT.minutes >= 12 * 60) {
    for (const j of tomorrowJobs) {
      push({
        id: `cnf-${j.id}`, code: "UNCONFIRMED_TOMORROW", severity: "low", ...ref(j),
        title: `Confirm tomorrow's visit — ${j.name}`,
        detail: `${fmtTimeCT(j.scheduledStart!)}${j.technicianId ? ` with ${techName.get(j.technicianId) ?? "technician"}` : " · no technician yet"}`,
        date: tomorrow,
      });
    }
  }

  // 9. Completed work not paid.
  for (const j of unpaid) {
    push({
      id: `pay-${j.id}`, code: "UNPAID_COMPLETED", severity: "low", ...ref(j),
      title: `Completed but unpaid — ${j.name}`,
      detail: `Invoice ${j.invoice?.status.toLowerCase()} · $${(j.invoice?.amount ?? 0).toFixed(2)} · completed ${ctParts(j.updatedAt).ymd}`,
    });
  }

  // 10. Open estimates older than 3 days.
  for (const e of staleEstimates) {
    push({
      id: `est-${e.id}`, code: "ESTIMATE_FOLLOW_UP", severity: "low", appointmentId: e.appointmentId ?? undefined,
      title: `Follow up estimate #${e.estimateNumber} — ${e.clientName}`,
      detail: `$${e.total.toFixed(2)} · open since ${ctParts(e.createdAt).ymd}`,
    });
  }

  alerts.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || (a.at ?? "").localeCompare(b.at ?? ""));

  // Technician status rows.
  const lastPing = new Map(locations.map((l) => [l.userId, l.timestamp]));
  const technicians = techs.map((t) => {
    const jobs = tracked.get(t.id)!.jobs.filter((j) => j.status !== "CANCELLED");
    const current = jobs.find((j) => j.techStatus === "EN_ROUTE" || ON_SITE.includes(j.techStatus ?? ""));
    const next = jobs.find((j) => j.id !== current?.id && j.status !== "COMPLETED" && j.techStatus !== "COMPLETED" && j.scheduledStart && j.scheduledStart > now);
    const hours = techHoursFor(t, cfg, nowCT.dayKey);
    const clock = lastClock.get(t.id);
    const ping = lastPing.get(t.id);
    const booked = jobs.reduce((s, j) => s + mins(j.scheduledEnd!.getTime() - j.scheduledStart!.getTime()), 0);
    const capacity = hours ? hm(hours.end) - hm(hours.start) : 0;
    let state: "OFF" | "NOT_CLOCKED_IN" | "AVAILABLE" | "EN_ROUTE" | "ON_JOB" | "CLOCKED_OUT" = "AVAILABLE";
    if (clock?.type === "OUT") state = "CLOCKED_OUT";
    else if (current?.techStatus === "EN_ROUTE") state = "EN_ROUTE";
    else if (current) state = "ON_JOB";
    else if (!clock) state = hours ? "NOT_CLOCKED_IN" : "OFF";
    return {
      id: t.id,
      name: t.name?.trim() || "Technician",
      phone: t.phone,
      color: t.technicianProfile?.boardColor ?? null,
      state,
      hours: hours ? `${hours.start}–${hours.end}` : null,
      clockedAt: clock?.timestamp.toISOString() ?? null,
      lastPingMinutes: ping ? mins(now.getTime() - ping.getTime()) : null,
      current: current ? { id: current.id, number: current.appointmentNumber, name: current.name, status: current.techStatus, start: current.scheduledStart?.toISOString() ?? null } : null,
      next: next ? { id: next.id, number: next.appointmentNumber, name: next.name, start: next.scheduledStart!.toISOString() } : null,
      jobsDone: jobs.filter((j) => j.status === "COMPLETED" || j.techStatus === "COMPLETED").length,
      jobsTotal: jobs.length,
      utilization: capacity ? Math.round((booked / capacity) * 100) : null,
    };
  });

  const live = todayJobs.map((j) => boardStatus(j));
  const count = (s: string) => live.filter((x) => x === s).length;
  const capacityToday = technicians.reduce((s, t) => {
    const h = techHoursFor(techs.find((x) => x.id === t.id)!, cfg, nowCT.dayKey);
    return s + (h ? hm(h.end) - hm(h.start) : 0);
  }, 0);
  const bookedToday = todayJobs.filter((j) => j.status !== "CANCELLED" && j.technicianId)
    .reduce((s, j) => s + mins(j.scheduledEnd!.getTime() - j.scheduledStart!.getTime()), 0);

  const kpis = {
    scheduledToday: todayJobs.filter((j) => j.status !== "CANCELLED").length,
    completedToday: count("COMPLETED"),
    inProgress: count("IN_PROGRESS"),
    onTheWay: count("ON_THE_WAY"),
    canceledToday: count("CANCELED"),
    unassigned: queue.length,
    emergenciesOpen: queue.filter((j) => j.isEmergency).length + todayJobs.filter((j) => j.isEmergency && j.status !== "COMPLETED" && j.status !== "CANCELLED" && j.technicianId).length,
    newCallsToday: createdToday,
    revenueToday: Math.round(paymentsToday.reduce((s, p) => s + p.amount, 0) * 100) / 100,
    paymentsToday: paymentsToday.length,
    techsClockedIn: technicians.filter((t) => t.clockedAt && t.state !== "CLOCKED_OUT").length,
    techsTotal: technicians.length,
    utilization: capacityToday ? Math.round((bookedToday / capacityToday) * 100) : null,
  };

  return {
    now: now.toISOString(),
    today,
    kpis,
    alerts,
    technicians,
    activity: events.map((e) => ({
      id: e.id, type: e.type, message: e.message, userName: e.userName, at: e.createdAt.toISOString(),
      appointmentId: e.appointment?.id ?? null, appointmentNumber: e.appointment?.appointmentNumber ?? null, customer: e.appointment?.name ?? null,
    })),
  };
}

export type CommandCenterData = Awaited<ReturnType<typeof getCommandCenter>>;
