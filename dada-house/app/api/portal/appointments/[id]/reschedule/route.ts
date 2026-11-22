import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { findOpenWindows } from "@/lib/dispatch-availability";
import { ctParts, fmtTimeCT, logJobEvent, inferJobType, type JobType } from "@/lib/dispatch";
import { alertOffice, maintenanceWindows } from "@/lib/voice-agent";
import { customerCanReschedule } from "@/lib/appointment-cancel";

export const dynamic = "force-dynamic";

/**
 * The customer moves his own appointment from his account (same rules as the AI receptionist):
 * real open arrival windows only; if a technician is already assigned, the request goes to the dispatcher.
 */

const day = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" });

async function loadOwned(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Please sign in." }, { status: 401 }) };
  const appt = await db.appointment.findUnique({ where: { id }, include: { customer: { select: { userId: true } } } });
  if (!appt || (appt.userId !== session.user.id && appt.customer?.userId !== session.user.id)) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!customerCanReschedule(appt)) {
    return { error: NextResponse.json({ error: "Your technician is already on the way (or the visit is finished or canceled), so it can no longer be changed online. Please call us at (844) 928-0875." }, { status: 400 }) };
  }
  return { appt, session };
}

function windowsFor(jobType: JobType, fromYmd: string | undefined, days: number, limit: number, excludeAppointmentId: string) {
  return jobType === "MAINTENANCE"
    ? maintenanceWindows({ fromYmd, days, limit, excludeAppointmentId })
    : findOpenWindows({ jobType, fromYmd, days, limit, excludeAppointmentId });
}

/** GET ?date=YYYY-MM-DD — open arrival windows for this job from that date (5 days). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await loadOwned(id);
  if ("error" in r) return r.error;
  const date = new URL(req.url).searchParams.get("date");
  const jobType = (r.appt.jobType as JobType | null) ?? inferJobType(r.appt.service);
  const w = await windowsFor(jobType, date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined, 5, 15, id);
  return NextResponse.json({ windows: w.windows, technicianAssigned: !!r.appt.technicianId });
}

const schema = z.object({ slotStart: z.string().min(10), reason: z.string().max(300).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await loadOwned(id);
  if ("error" in r) return r.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a new arrival window." }, { status: 400 });
  const { appt: job, session } = r;
  const start = new Date(parsed.data.slotStart);
  if (Number.isNaN(start.getTime()) || start.getTime() < Date.now()) return NextResponse.json({ error: "Choose a future arrival window." }, { status: 400 });
  const reason = parsed.data.reason?.trim() || null;
  const who = session.user.name ?? job.name;

  if (job.technicianId) {
    await logJobEvent({ appointmentId: job.id, type: "NOTE", userId: session.user.id, userName: who, message: `Customer asked (from his account) to move this job to ${day(start)}${reason ? ` — ${reason}` : ""}. Technician assigned: dispatcher to decide.` });
    after(() => alertOffice({ title: "Reschedule request (customer account)", url: `/dispatcher/board?job=${job.id}`, tag: `resched-${job.id}`, text: `#${job.appointmentNumber} ${job.name} asked to move to ${day(start)}. Technician assigned — please review and call the customer.` }).then(() => {}));
    return NextResponse.json({ ok: true, status: "REQUEST_SENT", message: "A technician is already assigned to this visit, so your request was sent to our dispatch team. They will call you to confirm. Your current appointment stays until then." });
  }

  const jobType = (job.jobType as JobType | null) ?? inferJobType(job.service);
  const res = await windowsFor(jobType, ctParts(start).ymd, 1, 20, job.id);
  const w = res.windows.find((x) => new Date(x.start).getTime() === start.getTime());
  if (!w) return NextResponse.json({ error: "That window was just taken. Please choose another one." }, { status: 409 });
  const t = (d: Date) => fmtTimeCT(d).replace(":00", "");
  const end = new Date(w.end), window = `${t(start)} - ${t(end)}`;
  const minutes = res.durationMinutes;
  await db.appointment.update({ where: { id: job.id }, data: { scheduledStart: start, scheduledEnd: new Date(start.getTime() + minutes * 60000), arrivalWindow: window, eta: start, preferredDate: start, preferredTime: `${window} (arrival window)` } });
  await logJobEvent({ appointmentId: job.id, type: "SCHEDULED", userId: session.user.id, userName: who, message: `Moved by the customer (account) to ${ctParts(start).ymd}, ${window}${reason ? ` — ${reason}` : ""}`, fromValue: job.scheduledStart?.toISOString() ?? null, toValue: start.toISOString() });
  after(() => alertOffice({ title: "Appointment moved by customer (account)", url: `/dispatcher/board?job=${job.id}&date=${ctParts(start).ymd}`, tag: `moved-${job.id}`, text: `#${job.appointmentNumber} ${job.name} moved to ${day(start)}, ${window}. Not assigned yet.` }).then(() => {}));
  return NextResponse.json({ ok: true, status: "MOVED", message: `Your visit is now ${day(start)}, between ${window}. Our dispatch team will confirm your technician.` });
}
