import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";
import { ctParts, ctInstant, fmtTimeCT } from "@/lib/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const APP = (process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");
const SETTING_KEY = "cron.techDailySummary.lastDate";

function addDays(ymd: string, n: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/**
 * Nightly text to every technician with the number of jobs on their schedule for the next day
 * (business time zone), with the list, and a reminder that the schedule may still change.
 * Vercel Cron calls it at 23:59 Eastern (two UTC entries in vercel.json cover daylight saving;
 * only the run that lands in the 11 PM hour sends, and a given day is only sent once).
 *   ?preview=1  → returns what would be sent, sends nothing.
 *   ?force=1    → sends even outside 11 PM (still once per day).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const preview = req.nextUrl.searchParams.get("preview") === "1";
  const force = req.nextUrl.searchParams.get("force") === "1";

  const now = new Date();
  const today = ctParts(now);
  if (!preview && !force && Math.floor(today.minutes / 60) !== 23) {
    return NextResponse.json({ skipped: "not 11 PM in business time", businessTime: `${today.ymd} ${Math.floor(today.minutes / 60)}:${String(today.minutes % 60).padStart(2, "0")}` });
  }
  const tomorrow = addDays(today.ymd, 1);

  if (!preview) {
    const last = await db.setting.findUnique({ where: { key: SETTING_KEY } });
    if (last?.value === tomorrow) return NextResponse.json({ skipped: "already sent", date: tomorrow });
    await db.setting.upsert({ where: { key: SETTING_KEY }, update: { value: tomorrow }, create: { key: SETTING_KEY, value: tomorrow } });
  }

  const from = ctInstant(tomorrow, 0);
  const to = ctInstant(addDays(tomorrow, 1), 0);
  const jobs = await db.appointment.findMany({
    where: {
      scheduledStart: { gte: from, lt: to },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
      NOT: { techStatus: { in: ["CANCELED", "COMPLETED", "NEED_RESCHEDULE"] } },
    },
    select: { id: true, appointmentNumber: true, name: true, city: true, service: true, scheduledStart: true, technicianId: true, assignments: { select: { technicianId: true } } },
    orderBy: { scheduledStart: "asc" },
  });

  const byTech = new Map<string, typeof jobs>();
  for (const j of jobs) {
    for (const t of new Set([j.technicianId, ...j.assignments.map((a) => a.technicianId)].filter((x): x is string => !!x))) {
      byTech.set(t, [...(byTech.get(t) ?? []), j]);
    }
  }

  const techs = await db.user.findMany({ where: { id: { in: [...byTech.keys()] } }, select: { id: true, name: true, phone: true } });
  const dayLabel = from.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "short", day: "numeric" });
  const results: { tech: string; jobs: number; sent: boolean; error?: string; text?: string }[] = [];

  for (const t of techs) {
    const list = byTech.get(t.id)!;
    const first = (t.name ?? "").trim().split(/\s+/)[0] || "there";
    const lines = list.slice(0, 8).map((j) => `• ${j.scheduledStart ? fmtTimeCT(j.scheduledStart) : "—"} ${j.name}, ${j.city} (${j.service})`);
    const more = list.length > 8 ? `\n…and ${list.length - 8} more` : "";
    const text = `DADA HOUSE: Hi ${first}, you have ${list.length} job${list.length > 1 ? "s" : ""} scheduled for tomorrow, ${dayLabel}:\n${lines.join("\n")}${more}\nThis schedule may still be changed or adjusted. Check the app for the latest: ${APP}/technician/jobs`;
    if (preview) { results.push({ tech: t.name ?? t.id, jobs: list.length, sent: false, text }); continue; }
    if (!t.phone) { results.push({ tech: t.name ?? t.id, jobs: list.length, sent: false, error: "no phone on file" }); continue; }
    try { await sendSMS(t.phone, text); results.push({ tech: t.name ?? t.id, jobs: list.length, sent: true }); }
    catch (e) { results.push({ tech: t.name ?? t.id, jobs: list.length, sent: false, error: (e as Error).message }); }
  }

  if (!preview) console.log("tech-daily-summary", tomorrow, JSON.stringify(results));
  return NextResponse.json({ date: tomorrow, preview, results });
}
