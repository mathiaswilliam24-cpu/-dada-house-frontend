import { db } from "@/lib/db";
import { inferJobType, JOB_TYPES, ctInstant, ctParts, type JobType } from "@/lib/dispatch";

/**
 * Job costing from recorded data only:
 *  revenue  = payments collected on the job (billed = invoice amount when higher)
 *  parts    = parts recorded on the job (JobPart, at cost)
 *  labor    = time on the job (technician timer) × each crew member's hourly rate
 *  commission = primary technician's commission % × collected
 * Anything missing is flagged instead of guessed.
 */

export type JobCostRow = {
  id: string; number: string; customer: string; jobType: JobType; jobTypeLabel: string; category: string | null;
  doneAt: string; technician: string | null; technicianId: string | null;
  collected: number; billed: number; parts: number; labor: number | null; commission: number | null;
  laborMinutes: number | null; profit: number; margin: number | null; flags: string[];
};

const round = (n: number) => Math.round(n * 100) / 100;

export async function jobCosting(fromYmd: string, toYmd: string) {
  const from = ctInstant(fromYmd, 0), to = ctInstant(toYmd, 1440);
  const jobs = await db.appointment.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ timeLog: { completedAt: { gte: from, lt: to } } }, { scheduledEnd: { gte: from, lt: to } }, { updatedAt: { gte: from, lt: to } }],
    },
    select: {
      id: true, appointmentNumber: true, name: true, service: true, jobType: true, jobCategory: true, technicianId: true, scheduledEnd: true, updatedAt: true,
      payments: { select: { amount: true } },
      invoice: { select: { amount: true } },
      parts: { select: { totalCost: true } },
      timeLog: { select: { totalMinutes: true, accumulatedSeconds: true, arrivedAt: true, completedAt: true } },
      assignments: { select: { technicianId: true } },
    },
    take: 5000,
  });

  const techIds = [...new Set(jobs.flatMap((j) => [j.technicianId, ...j.assignments.map((a) => a.technicianId)]).filter(Boolean) as string[])];
  const techs = await db.user.findMany({ where: { id: { in: techIds } }, select: { id: true, name: true, technicianProfile: { select: { hourlyRate: true, commissionRate: true } } } });
  const tech = new Map(techs.map((t) => [t.id, t]));

  const rows: JobCostRow[] = [];
  for (const j of jobs) {
    const done = j.timeLog?.completedAt ?? j.scheduledEnd ?? j.updatedAt;
    if (done < from || done >= to) continue;
    const flags: string[] = [];
    const collected = round(j.payments.reduce((s, p) => s + p.amount, 0));
    const billed = round(Math.max(collected, j.invoice?.amount ?? 0));
    if (!collected) flags.push(billed ? "Not paid yet" : "No payment or invoice");
    else if (billed > collected) flags.push(`$${(billed - collected).toFixed(2)} still owed`);
    const parts = round(j.parts.reduce((s, p) => s + p.totalCost, 0));

    // Labor
    const tl = j.timeLog;
    let minutes: number | null = tl?.totalMinutes ?? (tl?.accumulatedSeconds ? Math.round(tl.accumulatedSeconds / 60) : null);
    if (!minutes && tl?.arrivedAt && tl.completedAt) minutes = Math.round((tl.completedAt.getTime() - tl.arrivedAt.getTime()) / 60000);
    const crew = [...new Set([j.technicianId, ...j.assignments.map((a) => a.technicianId)].filter(Boolean) as string[])];
    let labor: number | null = null;
    if (!minutes) flags.push("No time logged");
    else if (!crew.length) flags.push("No technician");
    else {
      const missing = crew.filter((id) => tech.get(id)?.technicianProfile?.hourlyRate == null);
      if (missing.length) flags.push(`No hourly rate: ${missing.map((id) => tech.get(id)?.name ?? "technician").join(", ")}`);
      labor = round(crew.reduce((s, id) => s + ((tech.get(id)?.technicianProfile?.hourlyRate ?? 0) * minutes!) / 60, 0));
      if (missing.length === crew.length) labor = null;
    }

    // Commission (primary technician)
    const rate = j.technicianId ? tech.get(j.technicianId)?.technicianProfile?.commissionRate ?? null : null;
    const commission = rate != null ? round((collected * rate) / 100) : null;

    const profit = round(collected - parts - (labor ?? 0) - (commission ?? 0));
    const type = (j.jobType as JobType) || inferJobType(j.service);
    rows.push({
      id: j.id, number: j.appointmentNumber, customer: j.name, jobType: type, jobTypeLabel: JOB_TYPES[type].label, category: j.jobCategory,
      doneAt: done.toISOString(), technician: j.technicianId ? tech.get(j.technicianId)?.name ?? null : null, technicianId: j.technicianId,
      collected, billed, parts, labor, commission, laborMinutes: minutes, profit, margin: collected ? Math.round((profit / collected) * 1000) / 10 : null, flags,
    });
  }
  rows.sort((a, b) => b.doneAt.localeCompare(a.doneAt));

  const sum = (rs: JobCostRow[]) => {
    const collected = round(rs.reduce((s, r) => s + r.collected, 0));
    const profit = round(rs.reduce((s, r) => s + r.profit, 0));
    return {
      jobs: rs.length, collected, billed: round(rs.reduce((s, r) => s + r.billed, 0)),
      parts: round(rs.reduce((s, r) => s + r.parts, 0)), labor: round(rs.reduce((s, r) => s + (r.labor ?? 0), 0)),
      commission: round(rs.reduce((s, r) => s + (r.commission ?? 0), 0)), profit,
      margin: collected ? Math.round((profit / collected) * 1000) / 10 : null,
      avgTicket: rs.filter((r) => r.collected).length ? round(collected / rs.filter((r) => r.collected).length) : null,
      incomplete: rs.filter((r) => r.flags.length).length,
    };
  };
  const group = (key: (r: JobCostRow) => string) => {
    const m = new Map<string, JobCostRow[]>();
    rows.forEach((r) => m.set(key(r), [...(m.get(key(r)) ?? []), r]));
    return [...m.entries()].map(([k, rs]) => ({ key: k, ...sum(rs) })).sort((a, b) => b.collected - a.collected);
  };

  return {
    from: fromYmd, to: toYmd, generatedAt: ctParts(new Date()).ymd,
    totals: sum(rows),
    byTechnician: group((r) => r.technician ?? "Unassigned"),
    byJobType: group((r) => r.jobTypeLabel),
    rows,
  };
}
