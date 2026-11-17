import { db } from "@/lib/db";
import {
  JOB_TYPES, inferJobType, getDispatchConfig, getBoardTechnicians, techSkills, techHoursFor,
  findConflicts, ctParts, ctInstant, hm, fmtTimeCT, ensureJobCoords, drivingMinutes, haversineMiles,
  type JobType, type BoardTech,
} from "@/lib/dispatch";

export type Recommendation = {
  technicianId: string;
  name: string;
  available: boolean;
  availabilityNote: string;
  slotStart: string | null; // ISO — requested time if free, else earliest free slot that day
  slotEnd: string | null;
  skillMatch: number | null; // %; null = no skills on profile
  skillNote: string;
  travelMinutes: number | null;
  travelNote: string;
  workload: "Light" | "Moderate" | "Heavy" | "Off";
  workloadMinutes: number;
  jobsThatDay: number;
  emergencyReady: boolean;
  score: number;
};

/**
 * Ranks technicians for a job from real data only: working hours, booked jobs (conflicts
 * and workload), profile skills, and travel time (Google, when configured). Anything
 * that can't be computed is reported as unavailable — never guessed.
 */
export async function recommendTechnicians(appointmentId: string, requested?: { start?: Date | null }) {
  const cfg = await getDispatchConfig();
  const job = await db.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
  const type = (job.jobType as JobType) || inferJobType(job.service);
  const duration = job.estimatedMinutes ?? cfg.defaultMinutes[type] ?? 60;
  const requestedStart = requested?.start ?? job.scheduledStart ?? null;
  const day = ctParts(requestedStart ?? job.preferredDate ?? new Date()).ymd;
  const dayStart = ctInstant(day, 0), dayEnd = ctInstant(day, 1440);
  const nowCT = ctParts(new Date());

  const techs = await getBoardTechnicians();
  const dayJobs = await db.appointment.findMany({
    where: {
      id: { not: job.id }, status: { not: "CANCELLED" },
      scheduledStart: { lt: dayEnd }, scheduledEnd: { gt: dayStart },
    },
    select: { id: true, technicianId: true, scheduledStart: true, scheduledEnd: true, lat: true, lng: true, assignments: { select: { technicianId: true } } },
    orderBy: { scheduledStart: "asc" },
  });
  const jobsOf = (t: BoardTech) => dayJobs.filter((j) => j.technicianId === t.id || j.assignments.some((a) => a.technicianId === t.id));

  const recentLocs = await db.technicianLocation.findMany({
    where: { userId: { in: techs.map((t) => t.id) }, timestamp: { gte: new Date(Date.now() - 2 * 3600000) } },
    orderBy: { timestamp: "desc" },
    distinct: ["userId"],
  });

  const dest = await ensureJobCoords(job);
  const required = JOB_TYPES[type].skill;
  const category = (job.jobCategory ?? job.service ?? "").toLowerCase();

  const rows = await Promise.all(techs.map(async (t) => {
    const hours = techHoursFor(t, cfg, ctParts(ctInstant(day, 720)).dayKey);
    const mine = jobsOf(t);
    const bookedMin = mine.reduce((s, j) => s + (j.scheduledEnd!.getTime() - j.scheduledStart!.getTime()) / 60000, 0);
    const capacity = hours ? hm(hours.end) - hm(hours.start) : 0;
    const load = capacity ? bookedMin / capacity : 1;

    // Availability: requested slot, else earliest gap (15-min steps, travel buffer between jobs).
    let slot: Date | null = null, note = "";
    if (!hours) note = "Day off";
    else if (requestedStart) {
      const conflicts = await findConflicts(t, requestedStart, new Date(requestedStart.getTime() + duration * 60000), job.id, cfg);
      if (!conflicts.length) { slot = requestedStart; note = "Free at the requested time"; }
      else note = conflicts[0].message;
    }
    if (!slot && hours) {
      let from = hm(hours.start);
      if (day === nowCT.ymd) from = Math.max(from, Math.ceil((nowCT.minutes + 15) / 15) * 15);
      for (let m = from; m + duration <= hm(hours.end); m += 15) {
        const s = ctInstant(day, m), e = new Date(s.getTime() + duration * 60000);
        const buf = cfg.travelBufferMinutes * 60000;
        if (!mine.some((j) => j.scheduledStart!.getTime() < e.getTime() + buf && j.scheduledEnd!.getTime() + buf > s.getTime())) { slot = s; break; }
      }
      if (slot && requestedStart) note += ` — next free: ${fmtTimeCT(slot)}`;
      else if (slot) note = `Earliest free: ${fmtTimeCT(slot)}`;
      else if (!note) note = "Fully booked that day";
    }

    // Skills.
    const skills = techSkills(t);
    let skillMatch: number | null = null, skillNote = "No skills on profile";
    if (skills.length) {
      const hit = required ? skills.some((s) => s.includes(required) || required.includes(s)) : true;
      const catHit = skills.some((s) => category.includes(s));
      skillMatch = hit ? (catHit ? 100 : 90) : catHit ? 70 : 20;
      skillNote = hit ? `Has ${required || "general"} skill` : `No ${required} skill on profile`;
    }

    // Travel origin: previous job that day before the slot → live location → home base.
    let origin: { lat: number; lng: number } | null = null, originLabel = "";
    if (slot) {
      const prev = [...mine].reverse().find((j) => j.scheduledEnd! <= slot! && j.lat != null && j.lng != null);
      if (prev) { origin = { lat: prev.lat!, lng: prev.lng! }; originLabel = "from previous job"; }
    }
    const live = recentLocs.find((l) => l.userId === t.id);
    if (!origin && live && day === nowCT.ymd) { origin = { lat: live.lat, lng: live.lng }; originLabel = "from live location"; }
    const p = t.technicianProfile;
    if (!origin && p?.homeLat != null && p?.homeLng != null) { origin = { lat: p.homeLat, lng: p.homeLng }; originLabel = "from home base"; }

    return { t, slot, note, hours, load, bookedMin, jobs: mine.length, skillMatch, skillNote, origin, originLabel };
  }));

  // Travel times in one Distance Matrix call.
  const withOrigin = rows.filter((r) => r.origin);
  const minutes = dest ? await drivingMinutes(withOrigin.map((r) => r.origin!), dest) : withOrigin.map(() => null);
  const travel = new Map(withOrigin.map((r, i) => [r.t.id, minutes[i]]));

  const recs: Recommendation[] = rows.map((r) => {
    const tm = travel.get(r.t.id) ?? null;
    let travelNote = "Unavailable";
    if (!dest) travelNote = "Job address not located";
    else if (!r.origin) travelNote = "No technician location";
    else if (tm != null) travelNote = `${tm} min ${r.originLabel}`;
    else travelNote = `~${Math.round(haversineMiles(r.origin, dest))} mi straight line ${r.originLabel}`;

    const workload = !r.hours ? "Off" : r.load < 0.4 ? "Light" : r.load < 0.75 ? "Moderate" : "Heavy";
    const available = !!r.slot;
    const emergencyReady = !!r.t.technicianProfile?.emergencyAvailable;

    // Score 0–100 from the parts we actually know.
    let score = 0;
    if (available) {
      const wait = requestedStart && r.slot ? Math.max(0, (r.slot.getTime() - requestedStart.getTime()) / 60000) : 0;
      score += 40 - Math.min(30, wait / 8);
      score += ((r.skillMatch ?? 60) / 100) * 30;
      score += (1 - Math.min(1, r.load)) * 15;
      score += tm != null ? Math.max(0, 15 - tm / 4) : 7;
      if (job.isEmergency && emergencyReady) score += 10;
    }
    return {
      technicianId: r.t.id,
      name: r.t.name ?? "Technician",
      available,
      availabilityNote: r.note,
      slotStart: r.slot?.toISOString() ?? null,
      slotEnd: r.slot ? new Date(r.slot.getTime() + duration * 60000).toISOString() : null,
      skillMatch: r.skillMatch,
      skillNote: r.skillNote,
      travelMinutes: tm,
      travelNote,
      workload,
      workloadMinutes: Math.round(r.bookedMin),
      jobsThatDay: r.jobs,
      emergencyReady,
      score: Math.round(score),
    };
  });

  recs.sort((a, b) => b.score - a.score);
  return { jobType: type, durationMinutes: duration, day, recommendations: recs };
}
