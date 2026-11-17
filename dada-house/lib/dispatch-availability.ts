import { db } from "@/lib/db";
import {
  getDispatchConfig, getBoardTechnicians, techHoursFor, techSkills, ctParts, ctInstant, hm,
  JOB_TYPES, type JobType, type BoardTech,
} from "@/lib/dispatch";

/**
 * Real bookable arrival windows, computed from the Dispatch Board: technician working
 * hours, jobs already on their schedule (+ travel buffer), skills, and jobs already
 * booked into a window but not yet given a technician. Used by the AI receptionist so it
 * never offers a time the team can't actually cover.
 */

export type OpenWindow = { start: string; end: string; label: string; technicians: number };

const MIN_LEAD_MINUTES = 120; // never offer a window starting sooner than this

export function windowLabel(start: Date, end: Date) {
  const day = start.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" });
  const t = (d: Date) => d.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).replace(":00", "");
  return `${day}, ${t(start)} to ${t(end)}`;
}

function eligible(techs: BoardTech[], type: JobType) {
  const skill = JOB_TYPES[type].skill;
  if (!skill) return techs;
  const withSkill = techs.filter((t) => techSkills(t).some((s) => s.includes(skill) || skill.includes(s)));
  // Until skills are filled in on profiles, every active technician counts.
  const anySkills = techs.some((t) => techSkills(t).length > 0);
  return anySkills ? withSkill : techs;
}

export async function findOpenWindows(opts: { jobType: JobType; fromYmd?: string; days?: number; durationMinutes?: number; limit?: number; excludeAppointmentId?: string }) {
  const cfg = await getDispatchConfig();
  const duration = opts.durationMinutes ?? cfg.defaultMinutes[opts.jobType] ?? 60;
  const winMin = Math.round(cfg.arrivalWindowHours * 60);
  const buf = cfg.travelBufferMinutes * 60000;
  const now = new Date();
  const earliest = now.getTime() + MIN_LEAD_MINUTES * 60000;
  const today = ctParts(now).ymd;
  const from = opts.fromYmd && opts.fromYmd > today ? opts.fromYmd : today;
  const days = Math.min(14, Math.max(1, opts.days ?? 3));
  const dayList = Array.from({ length: days }, (_, i) => ctParts(new Date(ctInstant(from, 720).getTime() + i * 86400000)).ymd);

  const techs = eligible(await getBoardTechnicians(), opts.jobType);
  if (!techs.length) return { windows: [] as OpenWindow[], durationMinutes: duration, reason: "No active technicians" };

  const rangeStart = ctInstant(dayList[0], 0), rangeEnd = ctInstant(dayList[dayList.length - 1], 1440);
  const jobs = await db.appointment.findMany({
    where: {
      status: { not: "CANCELLED" }, scheduledStart: { lt: rangeEnd }, scheduledEnd: { gt: rangeStart },
      ...(opts.excludeAppointmentId ? { id: { not: opts.excludeAppointmentId } } : {}),
    },
    select: { technicianId: true, scheduledStart: true, scheduledEnd: true, assignments: { select: { technicianId: true } } },
  });
  const busy = (techId: string) => jobs.filter((j) => j.technicianId === techId || j.assignments.some((a) => a.technicianId === techId));
  const unassigned = jobs.filter((j) => !j.technicianId);

  const windows: OpenWindow[] = [];
  for (const ymd of dayList) {
    const business = cfg.businessHours[ctParts(ctInstant(ymd, 720)).dayKey];
    if (!business) continue;
    for (let w = hm(business.start); w + winMin <= hm(business.end); w += winMin) {
      const ws = ctInstant(ymd, w), we = ctInstant(ymd, w + winMin);
      if (ws.getTime() < earliest) continue;

      // Technicians who can start somewhere inside this window and finish within their hours.
      let free = 0;
      for (const t of techs) {
        const h = techHoursFor(t, cfg, ctParts(ws).dayKey);
        if (!h) continue;
        const mine = busy(t.id);
        for (let m = Math.max(w, hm(h.start)); m < w + winMin && m + duration <= hm(h.end); m += 15) {
          const s = ctInstant(ymd, m), e = new Date(s.getTime() + duration * 60000);
          if (!mine.some((j) => j.scheduledStart!.getTime() < e.getTime() + buf && j.scheduledEnd!.getTime() + buf > s.getTime())) { free++; break; }
        }
      }
      // Jobs already promised this window but not yet given a technician use up capacity.
      const promised = unassigned.filter((j) => j.scheduledStart!.getTime() < we.getTime() && j.scheduledEnd!.getTime() > ws.getTime()).length;
      const capacity = free - promised;
      if (capacity > 0) windows.push({ start: ws.toISOString(), end: we.toISOString(), label: windowLabel(ws, we), technicians: capacity });
      if (opts.limit && windows.length >= opts.limit) return { windows, durationMinutes: duration, reason: null };
    }
  }
  return { windows, durationMinutes: duration, reason: windows.length ? null : "No open windows in this range" };
}
