import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { voiceAuthError, toolArgs, checkMaintenanceSlot, alertOffice } from "@/lib/voice-agent";
import { createVisitJob, COVERED_STATUSES } from "@/lib/maintenance-visits";
import { ctParts, logJobEvent } from "@/lib/dispatch";
import { sendOutboundSms, DoNotContactError } from "@/lib/messaging";
import { customerCanCancel } from "@/lib/appointment-cancel";
import { notifyCanceled } from "@/lib/dispatch-notify";

export const dynamic = "force-dynamic";

const AI = { id: null, name: "AI receptionist (Sarah)" };
const dayLabel = (d: Date) => d.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" });

const REQUEST_SMS: Record<string, (type: string, day: string, win: string, where: string) => string> = {
  en: (t, d, w, a) => `DADA HOUSE: We received your ${t} request for ${a} on ${d}, arrival window ${w}. Our dispatch team will confirm your appointment. Questions? Call (844) 928-0875.`,
  fr: (t, d, w, a) => `DADA HOUSE : Nous avons bien reçu votre demande de ${t} pour ${a} le ${d}, créneau d'arrivée ${w}. Notre équipe de planification va confirmer votre rendez-vous. Questions ? (844) 928-0875.`,
  es: (t, d, w, a) => `DADA HOUSE: Recibimos su solicitud de ${t} para ${a} el ${d}, ventana de llegada ${w}. Nuestro equipo de despacho confirmará su cita. ¿Preguntas? (844) 928-0875.`,
};

type BookResult = { visitId: string; ok: boolean; error?: string; appointmentNumber?: string; home?: string; date?: string; arrivalWindow?: string; alreadyBooked?: boolean; alternatives?: unknown[]; message: string };

/** Books ONE covered visit (one home) — unassigned, pending dispatch. */
async function bookVisit(visitId: string, customerId: string, slotStart: string, notes: string | null, vapiCallId: string | null): Promise<BookResult> {
  const visit = await db.maintenanceVisit.findUnique({
    where: { id: visitId },
    include: { contract: { select: { status: true } }, appointment: true, property: { select: { address: true, apt: true, city: true, nickname: true } } },
  });
  if (!visit || visit.customerId !== customerId) return { visitId, ok: false, error: "not_found", message: "Visit not found for this customer." };
  const type = visit.season === "SPRING_AC" ? "Cooling Tune-Up" : "Heating Tune-Up";
  const home = visit.property ? `${visit.property.nickname ? `${visit.property.nickname} — ` : ""}${visit.property.address}${visit.property.apt ? ` ${visit.property.apt}` : ""}, ${visit.property.city}` : "your home";
  if (!(COVERED_STATUSES as readonly string[]).includes(visit.contract.status)) return { visitId, ok: false, error: "membership_not_active", home, message: "The membership is not active, so this covered visit cannot be booked. Explain renewal / payment options." };
  if (visit.status === "COMPLETED" || visit.status === "SKIPPED") return { visitId, ok: false, error: "visit_used", home, message: `The ${type} for ${home} was already ${visit.status === "COMPLETED" ? "completed" : "closed"} this membership year. It cannot be booked again as a covered visit; offer a paid visit through a regular booking or a callback.` };
  if (visit.appointment && visit.appointment.status !== "CANCELLED") {
    const ap = visit.appointment;
    return { visitId, ok: true, alreadyBooked: true, appointmentNumber: ap.appointmentNumber, home, message: `The ${type} for ${home} already has request #${ap.appointmentNumber}${ap.scheduledStart ? ` for ${dayLabel(ap.scheduledStart)}, ${ap.arrivalWindow ?? ""}` : ""}. Do not create another one.` };
  }
  const chk = await checkMaintenanceSlot(slotStart);
  if (!chk.slot) return { visitId, ok: false, error: "slot_unavailable", home, alternatives: chk.alternatives, message: `That arrival window is no longer available for ${home}. Offer one of the alternatives.` };
  const slot = chk.slot;
  const job = await createVisitJob(visit.id, AI, { slot, source: "voice_agent", notes });
  if (vapiCallId) await logJobEvent({ appointmentId: job.id, type: "NOTE", userName: AI.name, message: `Vapi call ${vapiCallId.slice(0, 80)}` }).catch(() => {});
  const cust = await db.customer.findUnique({ where: { id: customerId }, select: { phone: true, preferredLanguage: true } });
  const lang = ["fr", "es"].includes(cust?.preferredLanguage ?? "") ? cust!.preferredLanguage! : "en";
  after(async () => {
    if (cust?.phone) await sendOutboundSms(cust.phone, REQUEST_SMS[lang](type, dayLabel(slot.start), slot.window, home)).catch((e) => { if (!(e instanceof DoNotContactError)) console.error(e); });
    await alertOffice({ title: "New maintenance request (AI receptionist)", url: `/dispatcher/board?job=${job.id}&date=${ctParts(slot.start).ymd}`, tag: `maint-${job.id}`,
      text: `#${job.appointmentNumber} ${job.name} — ${type}\n${dayLabel(slot.start)}, ${slot.window}\n${job.address}, ${job.city}\nTechnician: not assigned — please assign and confirm.` });
  });
  return { visitId, ok: true, appointmentNumber: job.appointmentNumber, home, date: dayLabel(slot.start), arrivalWindow: slot.window,
    message: `Request #${job.appointmentNumber} submitted for ${home}: ${dayLabel(slot.start)}, ${slot.window}. Pending dispatch — not confirmed yet.` };
}

/**
 * AI receptionist tool — maintenance visits of an ACTIVE membership.
 * POST { action: "book" | "reschedule" | "cancel", customerId, visitId, slotStart?, notes?, reason?, vapiCallId? }
 *  - Several homes: "book" also accepts visits: [{ visitId, slotStart }] (each home its own window)
 *    or visitIds: [...] with one slotStart for all of them. Each home is a separate job.
 *  - customerId + visitId come from /api/voice-agent/customer (verified caller only).
 *  - slotStart must be a `start` returned by /api/voice-agent/availability?jobType=MAINTENANCE.
 *  - "book" creates a NEW CALL with NO technician (pending dispatch); the window counts against
 *    capacity immediately (provisional hold). The dispatcher assigns the technician and confirms.
 *  - Idempotent: a visit can only ever have one job.
 */
export async function POST(req: NextRequest) {
  const denied = voiceAuthError(req); if (denied) return denied;
  const a = await toolArgs(req);
  const action = String(a.action ?? "book");
  const customerId = String(a.customerId ?? ""), visitId = String(a.visitId ?? "");
  const notes = a.notes ? String(a.notes).slice(0, 500) : null;
  const callId = a.vapiCallId ? String(a.vapiCallId) : null;

  // ── book one, several or all homes ──
  if (action === "book") {
    const list: { visitId: string; slotStart: string }[] = Array.isArray(a.visits)
      ? (a.visits as { visitId?: unknown; slotStart?: unknown }[]).map((v) => ({ visitId: String(v.visitId ?? ""), slotStart: String(v.slotStart ?? a.slotStart ?? "") }))
      : Array.isArray(a.visitIds)
        ? (a.visitIds as unknown[]).map((id) => ({ visitId: String(id), slotStart: String(a.slotStart ?? "") }))
        : [{ visitId, slotStart: String(a.slotStart ?? "") }];
    if (!customerId || list.some((x) => !x.visitId)) return NextResponse.json({ error: "customerId and visitId(s) are required (from the customer lookup tool)." }, { status: 400 });
    if (list.some((x) => !x.slotStart)) return NextResponse.json({ error: "slotStart is required for each home — get it from the availability tool (jobType=MAINTENANCE)." }, { status: 400 });
    const results: BookResult[] = [];
    for (const x of list.slice(0, 20)) results.push(await bookVisit(x.visitId, customerId, x.slotStart, notes, callId));
    if (results.length === 1) return NextResponse.json({ ...results[0], dispatchStatus: results[0].ok && !results[0].alreadyBooked ? "PENDING_DISPATCH" : undefined }, { status: results[0].error === "slot_unavailable" ? 409 : results[0].error === "not_found" ? 404 : 200 });
    const done = results.filter((r) => r.ok && !r.alreadyBooked).length;
    return NextResponse.json({ ok: results.every((r) => r.ok), booked: done, results,
      message: `${done} of ${results.length} home(s) submitted (pending dispatch). Read each result to the caller; for any home with slot_unavailable offer its alternatives.` });
  }

  if (!customerId || !visitId) return NextResponse.json({ error: "customerId and visitId are required (from the customer lookup tool)." }, { status: 400 });

  const visit = await db.maintenanceVisit.findUnique({
    where: { id: visitId },
    include: { contract: { select: { status: true, customerId: true } }, appointment: true },
  });
  if (!visit || visit.customerId !== customerId) return NextResponse.json({ error: "Visit not found for this customer." }, { status: 404 });
  const type = visit.season === "SPRING_AC" ? "Cooling Tune-Up" : "Heating Tune-Up";
  const cust = await db.customer.findUnique({ where: { id: customerId }, select: { phone: true, preferredLanguage: true } });
  const lang = ["fr", "es"].includes(cust?.preferredLanguage ?? "") ? cust!.preferredLanguage! : "en";

  const ap = visit.appointment;
  if (!ap || ap.status === "CANCELLED") return NextResponse.json({ ok: false, error: "no_appointment", message: "This visit has no active appointment. Offer to book it instead." });

  // ── reschedule ──
  if (action === "reschedule") {
    if (!a.slotStart) return NextResponse.json({ error: "slotStart is required (from the availability tool)." }, { status: 400 });
    if (ap.technicianId) {
      await logJobEvent({ appointmentId: ap.id, type: "NOTE", userName: AI.name, message: `Customer asked (by phone) to move this visit to ${String(a.slotStart)}${a.notes ? ` — ${String(a.notes).slice(0, 200)}` : ""}. Technician already assigned: dispatcher to decide.` });
      after(() => alertOffice({ title: "Reschedule request (AI receptionist)", url: `/dispatcher/board?job=${ap.id}`, tag: `resched-${ap.id}`,
        text: `#${ap.appointmentNumber} ${ap.name} asked to move the ${type} to ${dayLabel(new Date(String(a.slotStart)))}. A technician is already assigned — please review and call the customer.` }).then(() => {}));
      return NextResponse.json({ ok: true, status: "REQUEST_SENT_TO_DISPATCHER", message: "A technician is already assigned, so the change was sent to the dispatcher, who will call the customer to confirm. The current appointment stays as is until then." });
    }
    const chk = await checkMaintenanceSlot(String(a.slotStart), ap.id);
    if (!chk.slot) return NextResponse.json({ ok: false, error: "slot_unavailable", message: "That arrival window is no longer available. Offer one of these instead.", alternatives: chk.alternatives }, { status: 409 });
    const s = chk.slot;
    await db.appointment.update({ where: { id: ap.id }, data: { scheduledStart: s.start, scheduledEnd: s.end, arrivalWindow: s.window, eta: s.start, preferredDate: s.start, preferredTime: `${s.window} (arrival window requested)` } });
    await logJobEvent({ appointmentId: ap.id, type: "SCHEDULED", userName: AI.name, message: `Moved by the customer (AI receptionist) to ${ctParts(s.start).ymd}, ${s.window} — still pending dispatch`, fromValue: ap.scheduledStart?.toISOString() ?? null, toValue: s.start.toISOString() });
    after(async () => {
      if (cust?.phone) await sendOutboundSms(cust.phone, REQUEST_SMS[lang](type, dayLabel(s.start), s.window, `${ap.address}, ${ap.city}`)).catch(() => {});
      await alertOffice({ title: "Maintenance request moved (AI receptionist)", url: `/dispatcher/board?job=${ap.id}&date=${ctParts(s.start).ymd}`, tag: `maint-${ap.id}`, text: `#${ap.appointmentNumber} ${ap.name} — ${type} now requested for ${dayLabel(s.start)}, ${s.window}. Not assigned yet.` });
    });
    return NextResponse.json({ ok: true, status: "PENDING_DISPATCH", date: dayLabel(s.start), arrivalWindow: s.window, message: "Request moved; the dispatch team will confirm the new window." });
  }

  // ── cancel (this visit only — never the membership) ──
  if (action === "cancel") {
    if (!customerCanCancel(ap)) return NextResponse.json({ ok: false, error: "visit_under_way", message: "The visit is already under way or finished — it cannot be canceled by phone. Offer a transfer to the office." });
    const techIds = [ap.technicianId].filter((x): x is string => !!x);
    await db.appointment.update({ where: { id: ap.id }, data: { status: "CANCELLED", techStatus: ap.technicianId ? "CANCELED" : null } });
    await db.maintenanceVisit.update({ where: { id: visit.id }, data: { status: "DUE", appointmentId: null } });
    await logJobEvent({ appointmentId: ap.id, type: "CANCELED", userName: AI.name, message: `Canceled by the customer by phone (AI receptionist)${a.reason ? `: ${String(a.reason).slice(0, 200)}` : ""}. The covered visit is available again.`, fromValue: ap.status, toValue: "CANCELLED" });
    after(() => notifyCanceled(ap.id, techIds, { by: "customer", reason: a.reason ? String(a.reason) : null }).catch(console.error));
    return NextResponse.json({ ok: true, status: "CANCELED", message: `The ${type} appointment was canceled. The membership stays active and this covered visit can be booked again later.` });
  }

  return NextResponse.json({ error: "action must be book, reschedule or cancel" }, { status: 400 });
}

