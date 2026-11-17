import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";
import { sendCustomerTemplate, customerLang, jobVars } from "@/lib/customer-notify";
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

export async function notifyCanceled(appointmentId: string, techIds: string[], notifyCustomer: boolean, userId: string) {
  const job = await db.appointment.findUnique({ where: { id: appointmentId } });
  if (!job) return;
  for (const id of techIds) await techSms(id, `DADA HOUSE: Job #${job.appointmentNumber} (${job.name}, ${when(job.scheduledStart)}) was CANCELED.`);
  if (notifyCustomer && job.phone) {
    const lang = await customerLang({ customerId: job.customerId });
    await sendCustomerTemplate({ key: "JOB_CANCELED", phone: job.phone, lang, vars: jobVars(job, lang), sentById: userId }).catch(console.error);
  }
}
