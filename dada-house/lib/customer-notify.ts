import { db } from "@/lib/db";
import { sendOutboundSms, DoNotContactError } from "@/lib/messaging";
import {
  asLang, fillTemplate, isEnabled, localDate, localWindow, templateText, DEFAULT_BUSINESS_PHONE,
  type Lang, type TemplateKey, type TemplateOverrides,
} from "@/lib/notification-templates";

const SETTING_KEY = "notify.templates";

export async function getTemplateOverrides(): Promise<TemplateOverrides> {
  const row = await db.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!row) return {};
  try { return JSON.parse(row.value) as TemplateOverrides; } catch { return {}; }
}

export async function saveTemplateOverrides(o: TemplateOverrides) {
  const value = JSON.stringify(o);
  await db.setting.upsert({ where: { key: SETTING_KEY }, update: { value }, create: { key: SETTING_KEY, value } });
}

/** Customer's language from their Customer record (by id, else by phone). */
export async function customerLang(opts: { customerId?: string | null; phone?: string | null }): Promise<Lang> {
  const c = opts.customerId
    ? await db.customer.findUnique({ where: { id: opts.customerId }, select: { preferredLanguage: true } })
    : null;
  return asLang(c?.preferredLanguage);
}

/** Builds a customer text from the template set (null when that message is turned off). */
export async function renderCustomerText(key: TemplateKey, lang: Lang, vars: Record<string, string | null | undefined>) {
  const o = await getTemplateOverrides();
  if (!isEnabled(key, o)) return null;
  return fillTemplate(templateText(key, lang, o), vars, o.phone || DEFAULT_BUSINESS_PHONE);
}

/** Template variables for a job, localized. */
export function jobVars(
  job: { name: string; appointmentNumber: string; service: string; scheduledStart?: Date | null; preferredDate?: Date | null; arrivalWindow?: string | null; jobCategory?: string | null },
  lang: Lang,
  extra: Record<string, string | null | undefined> = {}
) {
  const d = job.scheduledStart ?? job.preferredDate ?? null;
  return {
    name: job.name.trim().split(/\s+/)[0] ?? job.name,
    number: job.appointmentNumber,
    service: job.jobCategory || job.service,
    date: d ? localDate(d, lang) : lang === "fr" ? "date à confirmer" : lang === "es" ? "fecha por confirmar" : "a date to be confirmed",
    window: d ? localWindow(job.arrivalWindow, lang) : "",
    ...extra,
  };
}

/**
 * Sends a templated text to a customer. Respects STOP / Do-Not-Contact and logs to the
 * customer's message thread (via sendOutboundSms). Returns false when not sent.
 */
export async function sendCustomerTemplate(opts: {
  key: TemplateKey; phone: string | null | undefined; lang: Lang; vars: Record<string, string | null | undefined>; sentById?: string;
}) {
  if (!opts.phone) return false;
  const body = await renderCustomerText(opts.key, opts.lang, opts.vars);
  if (!body) return false;
  try {
    await sendOutboundSms(opts.phone, body, opts.sentById ? { sentById: opts.sentById } : undefined);
    return true;
  } catch (err) {
    if (err instanceof DoNotContactError) return false;
    throw err;
  }
}
