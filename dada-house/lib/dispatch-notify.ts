import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";
import { sendCustomerTemplate, customerLang, jobVars, getTemplateOverrides } from "@/lib/customer-notify";
import { DEFAULT_BUSINESS_PHONE, type Lang } from "@/lib/notification-templates";
import { sendTrackedEmail } from "@/lib/customer-email";
import { notifyStaff } from "@/lib/staff-push";
import { sendTechnicianAssignmentNotification } from "@/lib/appointment-notifications";
import { ctParts, fmtTimeCT, logJobEvent } from "@/lib/dispatch";

const APP = (process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");

function when(start: Date | null, window?: string | null) {
  if (!start) return "date to be confirmed";
  const date = start.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" });
  return window ? `${date} between ${window}` : `${date} at ${fmtTimeCT(start)}`;
}

async function techSms(techId: string, body: string) {
  const t = await db.user.findUnique({ where: { id: techId }, select: { phone: true } });
  if (t?.phone) await sendSMS(t.phone, body).catch((e: unknown) => console.error("tech sms failed", e));
}

/** After a board change: new technicians get the full assignment notice; technicians who
 *  keep the job get a "schedule changed" text; a removed technician is told it's off. */
export async function notifyAfterSchedule(opts: {
  appointmentId: string; previousTechIds: string[]; previousStart: Date | null; notifyCustomer: boolean; userId: string; techs?: boolean;
}) {
  const job = await db.appointment.findUnique({ where: { id: opts.appointmentId }, include: { assignments: true } });
  if (!job) return;
  const current = job.assignments.map((a) => a.technicianId);
  const link = `${APP}/technician/jobs/${job.id}`;
  const moved = (opts.previousStart?.getTime() ?? null) !== (job.scheduledStart?.getTime() ?? null);

  for (const id of opts.techs === false ? [] : current) {
    if (!opts.previousTechIds.includes(id)) {
      if (id === job.technicianId) await sendTechnicianAssignmentNotification(job.id).catch(console.error);
      else await techSms(id, `DADA HOUSE: You were added to job #${job.appointmentNumber} (${job.service}) — ${job.name}, ${job.address}, ${job.city}. ${when(job.scheduledStart)}. ${link}`);
    } else if (moved) {
      await techSms(id, `DADA HOUSE: Schedule changed — job #${job.appointmentNumber} (${job.name}) is now ${when(job.scheduledStart)}. ${link}`);
    }
  }
  for (const id of opts.techs === false ? [] : opts.previousTechIds) {
    if (!current.includes(id)) await techSms(id, `DADA HOUSE: Job #${job.appointmentNumber} (${job.name}) was removed from your schedule.`);
  }

  if (opts.notifyCustomer && moved && job.scheduledStart && job.phone) {
    try {
      const lang = await customerLang({ customerId: job.customerId });
      const sent = await sendCustomerTemplate({ key: "JOB_SCHEDULED", phone: job.phone, lang, vars: jobVars(job, lang), sentById: opts.userId });
      await logJobEvent({
        appointmentId: job.id, type: "NOTE", userId: opts.userId,
        message: sent ? `Customer texted (${lang.toUpperCase()}): scheduled ${ctParts(job.scheduledStart).ymd} ${job.arrivalWindow ?? ""}`.trim() : "Customer not texted (message turned off or customer opted out)",
      });
    } catch (e) {
      await logJobEvent({ appointmentId: job.id, type: "NOTE", message: `Customer text failed: ${e instanceof Error ? e.message : "error"}`, userId: opts.userId });
    }
  }
}

const CANCEL_EMAIL: Record<Lang, { subject: (n: string) => string; hello: (n: string) => string; staff: (n: string) => string; customer: (n: string) => string; call: (p: string) => string }> = {
  en: {
    subject: (n) => `Your DADA HOUSE appointment #${n} has been canceled`,
    hello: (n) => `Hi ${n},`,
    staff: (n) => `Your appointment #${n} has been canceled.`,
    customer: (n) => `Your appointment #${n} has been canceled as you requested.`,
    call: (p) => `To reschedule or if you have any questions, call us at ${p}.`,
  },
  fr: {
    subject: (n) => `Votre rendez-vous DADA HOUSE n°${n} a été annulé`,
    hello: (n) => `Bonjour ${n},`,
    staff: (n) => `Votre rendez-vous n°${n} a été annulé.`,
    customer: (n) => `Votre rendez-vous n°${n} a bien été annulé à votre demande.`,
    call: (p) => `Pour reprogrammer ou pour toute question, appelez-nous au ${p}.`,
  },
  es: {
    subject: (n) => `Su cita de DADA HOUSE #${n} ha sido cancelada`,
    hello: (n) => `Hola ${n},`,
    staff: (n) => `Su cita #${n} ha sido cancelada.`,
    customer: (n) => `Su cita #${n} fue cancelada según su solicitud.`,
    call: (p) => `Para reprogramar o si tiene preguntas, llámenos al ${p}.`,
  },
};

/**
 * A job was canceled — by the customer (from their account) or by the office (dispatcher/admin).
 * Every technician on the job gets a text; the customer gets a text and, when on file, an email;
 * when the customer canceled, the office also gets a push notification. Each outcome is logged
 * on the job's activity.
 */
export async function notifyCanceled(appointmentId: string, techIds: string[], opts: { by: "customer" | "staff"; userId?: string | null; reason?: string | null }) {
  const job = await db.appointment.findUnique({ where: { id: appointmentId } });
  if (!job) return;
  const results: string[] = [];
  const who = opts.by === "customer" ? " by the customer" : "";

  for (const id of [...new Set(techIds)]) {
    await techSms(id, `DADA HOUSE: Job #${job.appointmentNumber} (${job.name}, ${when(job.scheduledStart)}) was CANCELED${who}. It has been removed from your schedule.`);
  }
  if (techIds.length) results.push(`technician${techIds.length > 1 ? "s" : ""} texted`);

  const lang = await customerLang({ customerId: job.customerId });
  if (job.phone) {
    try {
      const sent = await sendCustomerTemplate({ key: opts.by === "customer" ? "JOB_CANCELED_BY_CUSTOMER" : "JOB_CANCELED", phone: job.phone, lang, vars: jobVars(job, lang), sentById: opts.userId ?? undefined });
      results.push(sent ? `customer texted (${lang.toUpperCase()})` : "customer not texted (message turned off or opted out)");
    } catch (e) { results.push(`customer text failed: ${e instanceof Error ? e.message : "error"}`); }
  }
  if (job.email) {
    try {
      const t = CANCEL_EMAIL[lang];
      const o = await getTemplateOverrides();
      const phone = o.phone || DEFAULT_BUSINESS_PHONE;
      const first = job.name.trim().split(/\s+/)[0] || job.name;
      const line = opts.by === "customer" ? t.customer(job.appointmentNumber) : t.staff(job.appointmentNumber);
      const r = await sendTrackedEmail({
        to: job.email, subject: t.subject(job.appointmentNumber), customerId: job.customerId, sentById: opts.userId ?? undefined,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#111"><h2 style="color:#1B3FA8">DADA HOUSE</h2><p>${esc(t.hello(first))}</p><p>${esc(line)}</p><p style="background:#FFF4E5;border-radius:8px;padding:12px">${esc(t.call(phone))}</p></div>`,
        text: `${t.hello(first)}\n\n${line}\n\n${t.call(phone)}`,
      });
      results.push(r.error ? `customer email failed: ${r.error.message}` : "customer emailed");
    } catch (e) { results.push(`customer email failed: ${e instanceof Error ? e.message : "error"}`); }
  }

  if (opts.by === "customer") {
    await notifyStaff({ title: "Job canceled by customer", body: `#${job.appointmentNumber} ${job.name} — ${when(job.scheduledStart)}${opts.reason ? ` · ${opts.reason}` : ""}`, url: `/dispatcher/board?job=${job.id}`, tag: `cancel-${job.id}` }).catch(console.error);
  }
  await logJobEvent({ appointmentId: job.id, type: "NOTE", userId: opts.userId ?? null, message: `Cancellation notices: ${results.join(", ") || "nobody to notify (no technician, phone or email)"}` }).catch(console.error);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
