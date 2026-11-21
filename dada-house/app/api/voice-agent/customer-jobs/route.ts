import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { voiceAuthError, toolArgs, vapiTool, alertOffice } from "@/lib/voice-agent";
import { verifyCaller } from "@/lib/voice-verify";
import { findOpenWindows } from "@/lib/dispatch-availability";
import { ctParts, fmtTimeCT, logJobEvent, inferJobType, type JobType } from "@/lib/dispatch";
import { sendOutboundSms, DoNotContactError } from "@/lib/messaging";
import { customerCanCancel } from "@/lib/appointment-cancel";
import { notifyCanceled } from "@/lib/dispatch-notify";

export const dynamic = "force-dynamic";

const AI = "AI receptionist (Sarah)";
const BASE = () => (process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");
const day = (d: Date | null | undefined) => d ? d.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" }) : null;

function plainStatus(a: { status: string; techStatus: string | null; technicianId: string | null; scheduledStart: Date | null }) {
  if (a.status === "CANCELLED" || a.techStatus === "CANCELED") return "Canceled";
  if (a.status === "COMPLETED" || a.techStatus === "COMPLETED") return "Completed";
  if (a.techStatus === "NEED_RESCHEDULE") return "Needs a new date — the office will call to reschedule";
  if (a.techStatus === "EN_ROUTE") return "The technician is on the way";
  if (["ARRIVED", "DIAGNOSING", "WAITING_FOR_APPROVAL", "WORKING"].includes(a.techStatus ?? "")) return "The technician is on site / working";
  if (!a.scheduledStart) return "Received — waiting to be scheduled by the office";
  if (!a.technicianId) return "Requested time received — waiting for the dispatcher to confirm";
  return "Scheduled and confirmed with a technician";
}

/**
 * AI receptionist tool — the caller's own jobs, invoices and estimates (verified callers only).
 * POST { callerPhone, name, address?, zip?, action?: "list" | "send_payment_link" | "reschedule" | "cancel",
 *        appointmentNumber?, documentNumber?, slotStart?, reason? }
 *  - list: upcoming + recent jobs (plain-language status, date, arrival window, technician first name,
 *    live tracking link when on the way) and unpaid invoices/estimates with amounts.
 *  - send_payment_link: texts the secure pay link of an unpaid invoice/estimate to the phone on file.
 *  - reschedule: slotStart from the availability tool; direct if no technician yet, otherwise a request
 *    to the dispatcher. cancel: allowed until the technician arrives.
 */
export const POST = vapiTool(async (req: NextRequest) => {
  const denied = voiceAuthError(req); if (denied) return denied;
  const a = await toolArgs(req);
  const v = await verifyCaller(a);
  if (!v.customer) return NextResponse.json({ verified: false, found: v.found, message: v.message });
  const cust = v.customer;
  const action = String(a.action ?? "list");

  const jobs = await db.appointment.findMany({
    where: { customerId: cust.id, OR: [{ scheduledStart: { gte: new Date(Date.now() - 90 * 86400000) } }, { scheduledStart: null, createdAt: { gte: new Date(Date.now() - 90 * 86400000) } }] },
    orderBy: [{ scheduledStart: "desc" }, { createdAt: "desc" }], take: 15,
    select: { id: true, appointmentNumber: true, service: true, subservice: true, status: true, techStatus: true, technicianId: true, scheduledStart: true, arrivalWindow: true, preferredDate: true, address: true, city: true, jobType: true, name: true,
      technician: { select: { name: true } }, invoice: { select: { amount: true, status: true, paymentToken: true } } },
  });
  const estimates = await db.estimate.findMany({
    where: { OR: [{ appointmentId: { in: jobs.map((j) => j.id) } }, ...(cust.phone ? [{ clientPhone: { contains: cust.phone.replace(/\D/g, "").slice(-10) } }] : [])], paidAt: null, status: { notIn: ["PAID", "DECLINED", "VOID", "CANCELLED"] } },
    select: { estimateNumber: true, total: true, isInvoice: true, status: true, paymentToken: true, createdAt: true },
    orderBy: { createdAt: "desc" }, take: 10,
  });
  const unpaid = [
    ...jobs.filter((j) => j.invoice && j.invoice.status !== "PAID" && j.invoice.paymentToken).map((j) => ({ documentNumber: j.appointmentNumber, kind: "Invoice", amount: j.invoice!.amount, token: j.invoice!.paymentToken! })),
    ...estimates.filter((e) => e.paymentToken).map((e) => ({ documentNumber: e.estimateNumber, kind: e.isInvoice ? "Invoice" : "Estimate", amount: e.total, token: e.paymentToken! })),
  ];

  if (action === "send_payment_link") {
    const doc = unpaid.find((u) => u.documentNumber === String(a.documentNumber ?? "")) ?? (unpaid.length === 1 ? unpaid[0] : null);
    if (!doc) return NextResponse.json({ ok: false, message: unpaid.length ? `Ask which document: ${unpaid.map((u) => `${u.kind} ${u.documentNumber} ($${u.amount.toFixed(2)})`).join(", ")}.` : "There is no unpaid invoice or estimate on this account." });
    if (!cust.phone) return NextResponse.json({ ok: false, message: "No phone number on file — offer a transfer to the office." });
    try {
      await sendOutboundSms(cust.phone, `DADA HOUSE: Here is your secure payment link for ${doc.kind.toLowerCase()} #${doc.documentNumber} ($${doc.amount.toFixed(2)}): ${BASE()}/pay/${doc.token}`);
      return NextResponse.json({ ok: true, message: `Payment link for ${doc.kind} ${doc.documentNumber} texted to the number on file (ending ${cust.phone.replace(/\D/g, "").slice(-4)}).` });
    } catch (e) {
      return NextResponse.json({ ok: false, message: e instanceof DoNotContactError ? "The customer opted out of texts (STOP) — the link cannot be texted. Offer a transfer to the office." : "The text could not be sent. Do not say it was sent; offer a transfer." });
    }
  }

  if (action === "reschedule" || action === "cancel") {
    const job = jobs.find((j) => j.appointmentNumber === String(a.appointmentNumber ?? ""));
    if (!job) return NextResponse.json({ ok: false, message: `Ask which appointment (numbers on file: ${jobs.filter((j) => j.status !== "CANCELLED" && j.status !== "COMPLETED").map((j) => j.appointmentNumber).join(", ") || "none open"}).` });

    if (action === "cancel") {
      if (!customerCanCancel(job)) return NextResponse.json({ ok: false, message: "This visit is already under way or finished — it cannot be canceled by phone. Offer a transfer to the office." });
      await db.appointment.update({ where: { id: job.id }, data: { status: "CANCELLED", techStatus: job.technicianId ? "CANCELED" : null } });
      await logJobEvent({ appointmentId: job.id, type: "CANCELED", userName: AI, message: `Canceled by the customer by phone (AI receptionist)${a.reason ? `: ${String(a.reason).slice(0, 200)}` : ""}`, fromValue: job.status, toValue: "CANCELLED" });
      after(() => notifyCanceled(job.id, [job.technicianId].filter((x): x is string => !!x), { by: "customer", reason: a.reason ? String(a.reason) : null }).catch(console.error));
      return NextResponse.json({ ok: true, message: `Appointment #${job.appointmentNumber} is canceled. The customer will get a confirmation text.` });
    }

    if (!a.slotStart) return NextResponse.json({ ok: false, message: "Get a window from the availability tool first, then pass its start as slotStart." });
    if (["EN_ROUTE", "ARRIVED", "DIAGNOSING", "WAITING_FOR_APPROVAL", "WORKING", "COMPLETED"].includes(job.techStatus ?? "") || job.status === "COMPLETED" || job.status === "CANCELLED") {
      return NextResponse.json({ ok: false, message: "This visit is under way, finished or canceled — it cannot be moved by phone. Offer a transfer to the office." });
    }
    const start = new Date(String(a.slotStart));
    if (job.technicianId) {
      await logJobEvent({ appointmentId: job.id, type: "NOTE", userName: AI, message: `Customer asked (by phone) to move this job to ${day(start)}${a.reason ? ` — ${String(a.reason).slice(0, 200)}` : ""}. Technician assigned: dispatcher to decide.` });
      after(() => alertOffice({ title: "Reschedule request (AI receptionist)", url: `/dispatcher/board?job=${job.id}`, tag: `resched-${job.id}`, text: `#${job.appointmentNumber} ${job.name} asked to move to ${day(start)}. Technician assigned — please review and call the customer.` }).then(() => {}));
      return NextResponse.json({ ok: true, status: "REQUEST_SENT_TO_DISPATCHER", message: "A technician is already assigned, so the request went to the dispatcher, who will call to confirm. The current appointment stays until then." });
    }
    const jobType = (job.jobType as JobType | null) ?? inferJobType(job.service);
    const r = await findOpenWindows({ jobType, fromYmd: ctParts(start).ymd, days: 1, excludeAppointmentId: job.id });
    const w = r.windows.find((x) => new Date(x.start).getTime() === start.getTime());
    if (!w) {
      const alt = await findOpenWindows({ jobType, fromYmd: ctParts(start).ymd, days: 3, limit: 3, excludeAppointmentId: job.id });
      return NextResponse.json({ ok: false, error: "slot_unavailable", message: "That window is no longer available. Offer one of these.", alternatives: alt.windows });
    }
    const t = (d: Date) => fmtTimeCT(d).replace(":00", "");
    const end = new Date(w.end), window = `${t(start)} - ${t(end)}`;
    await db.appointment.update({ where: { id: job.id }, data: { scheduledStart: start, scheduledEnd: new Date(start.getTime() + r.durationMinutes * 60000), arrivalWindow: window, eta: start, preferredDate: start, preferredTime: `${window} (arrival window)` } });
    await logJobEvent({ appointmentId: job.id, type: "SCHEDULED", userName: AI, message: `Moved by the customer (AI receptionist) to ${ctParts(start).ymd}, ${window}`, fromValue: job.scheduledStart?.toISOString() ?? null, toValue: start.toISOString() });
    after(() => alertOffice({ title: "Appointment moved by customer (AI receptionist)", url: `/dispatcher/board?job=${job.id}&date=${ctParts(start).ymd}`, tag: `moved-${job.id}`, text: `#${job.appointmentNumber} ${job.name} moved to ${day(start)}, ${window}. Not assigned yet.` }).then(() => {}));
    return NextResponse.json({ ok: true, status: "PENDING_DISPATCH", date: day(start), arrivalWindow: window, message: "Moved. The dispatch team will confirm the technician." });
  }

  return NextResponse.json({
    verified: true,
    customer: { name: `${cust.firstName ?? ""} ${cust.lastName ?? ""}`.trim(), customerId: cust.id, language: cust.preferredLanguage ?? "en" },
    jobs: jobs.map((j) => ({
      appointmentNumber: j.appointmentNumber, service: [j.service, j.subservice].filter(Boolean).join(" — "),
      status: plainStatus(j), date: day(j.scheduledStart ?? j.preferredDate), arrivalWindow: j.arrivalWindow,
      technician: j.technician?.name ? j.technician.name.trim().split(/\s+/)[0] : null,
      address: `${j.address}, ${j.city}`,
      trackingLink: j.techStatus === "EN_ROUTE" ? `${BASE()}/track/${j.id}` : null,
    })),
    unpaid: unpaid.map(({ token: _t, ...u }) => { void _t; return { ...u, amount: Math.round(u.amount * 100) / 100 }; }),
    message: "Answer from this data only. Never promise an exact arrival minute — use the arrival window. For a payment, use action send_payment_link (never take card numbers).",
  });
});
