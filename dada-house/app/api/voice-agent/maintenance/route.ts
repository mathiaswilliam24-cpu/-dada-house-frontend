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

const REQUEST_SMS: Record<string, (type: string, day: string, win: string) => string> = {
  en: (t, d, w) => `DADA HOUSE: We received your ${t} request for ${d}, arrival window ${w}. Our dispatch team will confirm your appointment. Questions? Call (844) 928-0875.`,
  fr: (t, d, w) => `DADA HOUSE : Nous avons bien reçu votre demande de ${t} pour le ${d}, créneau d'arrivée ${w}. Notre équipe de planification va confirmer votre rendez-vous. Questions ? (844) 928-0875.`,
  es: (t, d, w) => `DADA HOUSE: Recibimos su solicitud de ${t} para el ${d}, ventana de llegada ${w}. Nuestro equipo de despacho confirmará su cita. ¿Preguntas? (844) 928-0875.`,
};

/**
 * AI receptionist tool — maintenance visits of an ACTIVE membership.
 * POST { action: "book" | "reschedule" | "cancel", customerId, visitId, slotStart?, notes?, reason?, vapiCallId? }
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
  if (!customerId || !visitId) return NextResponse.json({ error: "customerId and visitId are required (from the customer lookup tool)." }, { status: 400 });

  const visit = await db.maintenanceVisit.findUnique({
    where: { id: visitId },
    include: { contract: { select: { status: true, customerId: true } }, appointment: true },
  });
  if (!visit || visit.customerId !== customerId) return NextResponse.json({ error: "Visit not found for this customer." }, { status: 404 });
  const type = visit.season === "SPRING_AC" ? "Cooling Tune-Up" : "Heating Tune-Up";
  const cust = await db.customer.findUnique({ where: { id: customerId }, select: { phone: true, preferredLanguage: true } });
  const lang = ["fr", "es"].includes(cust?.preferredLanguage ?? "") ? cust!.preferredLanguage! : "en";

  // ── book ──
  if (action === "book") {
    if (!(COVERED_STATUSES as readonly string[]).includes(visit.contract.status)) return NextResponse.json({ ok: false, error: "membership_not_active", message: "The membership is not active, so this covered visit cannot be booked. Explain renewal / payment options." });
    if (visit.status === "COMPLETED" || visit.status === "SKIPPED") return NextResponse.json({ ok: false, error: "visit_used", message: `This ${type} was already ${visit.status === "COMPLETED" ? "completed" : "closed"} this membership year. It cannot be booked again as a covered visit; offer a paid maintenance visit through a regular booking or a callback.` });
    if (visit.appointment && visit.appointment.status !== "CANCELLED") {
      const ap = visit.appointment;
      return NextResponse.json({ ok: true, alreadyBooked: true, appointmentNumber: ap.appointmentNumber,
        message: `This ${type} already has request #${ap.appointmentNumber}${ap.scheduledStart ? ` for ${dayLabel(ap.scheduledStart)}, ${ap.arrivalWindow ?? ""}` : ""}. Do not create another one.` });
    }
    if (!a.slotStart) return NextResponse.json({ error: "slotStart is required — get it from the availability tool (jobType=MAINTENANCE)." }, { status: 400 });
    const chk = await checkMaintenanceSlot(String(a.slotStart));
    if (!chk.slot) return NextResponse.json({ ok: false, error: "slot_unavailable", message: "That arrival window is no longer available. Offer one of these instead.", alternatives: chk.alternatives }, { status: 409 });
    const slot = chk.slot;
    const job = await createVisitJob(visit.id, AI, { slot, source: "voice_agent", notes: a.notes ? String(a.notes).slice(0, 500) : null });
    if (a.vapiCallId) await logJobEvent({ appointmentId: job.id, type: "NOTE", userName: AI.name, message: `Vapi call ${String(a.vapiCallId).slice(0, 80)}` }).catch(() => {});

    after(async () => {
      if (cust?.phone) {
        await sendOutboundSms(cust.phone, REQUEST_SMS[lang](type, dayLabel(slot.start), slot.window)).catch((e) => { if (!(e instanceof DoNotContactError)) console.error(e); });
      }
      await alertOffice({ title: "New maintenance request (AI receptionist)", url: `/dispatcher/board?job=${job.id}&date=${ctParts(slot.start).ymd}`, tag: `maint-${job.id}`,
        text: `#${job.appointmentNumber} ${job.name} — ${type}\n${dayLabel(slot.start)}, ${slot.window}\n${job.address}, ${job.city}\nTechnician: not assigned — please assign and confirm.` });
    });
    return NextResponse.json({ ok: true, appointmentNumber: job.appointmentNumber, dispatchStatus: "PENDING_DISPATCH", technician: null, date: dayLabel(slot.start), arrivalWindow: slot.window,
      message: `Request #${job.appointmentNumber} submitted for ${dayLabel(slot.start)}, ${slot.window}. Tell the customer the dispatch team will confirm the appointment — it is not confirmed yet.` });
  }

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
      if (cust?.phone) await sendOutboundSms(cust.phone, REQUEST_SMS[lang](type, dayLabel(s.start), s.window)).catch(() => {});
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

