import crypto from "crypto";
import { db } from "@/lib/db";
import { getDispatchConfig } from "@/lib/dispatch";
import { PRICING } from "@/lib/enrollment-pricing";
import { DEFAULT_BUSINESS_PHONE } from "@/lib/notification-templates";

/**
 * What the AI receptionist is allowed to say about DADA HOUSE.
 *  1. Built-in facts read from the system (hours from the dispatch settings, plan pricing from the
 *     checkout pricing engine, the service-call fee and services the company confirmed).
 *  2. Questions & answers written by the office (Admin → AI receptionist), Setting "voice.knowledge".
 * Anything not covered here is unknown: the agent says so, logs it (Setting "voice.unanswered")
 * and transfers. The office answers it in the admin, and the agent knows it from then on.
 */

export type KnowledgeEntry = { id: string; question: string; answer: string; keywords: string[]; updatedAt: string; updatedBy?: string | null };
export type Unanswered = { id: string; question: string; callerPhone?: string | null; callerName?: string | null; at: string; status: "OPEN" | "ANSWERED" | "DISMISSED" };

const K_KEY = "voice.knowledge", U_KEY = "voice.unanswered";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  try { return JSON.parse(row.value) as T; } catch { return fallback; }
}
async function writeJson(key: string, v: unknown) {
  const value = JSON.stringify(v);
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export const getKnowledge = () => readJson<KnowledgeEntry[]>(K_KEY, []);
export const getUnanswered = () => readJson<Unanswered[]>(U_KEY, []);

export async function saveKnowledgeEntry(e: { id?: string; question: string; answer: string; keywords?: string[] }, by?: string | null) {
  const list = await getKnowledge();
  const entry: KnowledgeEntry = { id: e.id ?? crypto.randomUUID(), question: e.question.trim(), answer: e.answer.trim(), keywords: (e.keywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean), updatedAt: new Date().toISOString(), updatedBy: by ?? null };
  const i = list.findIndex((x) => x.id === entry.id);
  if (i >= 0) list[i] = entry; else list.push(entry);
  await writeJson(K_KEY, list);
  return entry;
}
export async function deleteKnowledgeEntry(id: string) { await writeJson(K_KEY, (await getKnowledge()).filter((x) => x.id !== id)); }

export async function logUnanswered(q: { question: string; callerPhone?: string | null; callerName?: string | null }) {
  const list = await getUnanswered();
  const item: Unanswered = { id: crypto.randomUUID(), question: q.question.trim().slice(0, 500), callerPhone: q.callerPhone ?? null, callerName: q.callerName ?? null, at: new Date().toISOString(), status: "OPEN" };
  await writeJson(U_KEY, [item, ...list].slice(0, 300));
  return item;
}
export async function setUnansweredStatus(id: string, status: Unanswered["status"]) {
  await writeJson(U_KEY, (await getUnanswered()).map((x) => (x.id === id ? { ...x, status } : x)));
}

const STOP = new Set("a an the is are do does did you your we our i my me can could would will to of for in on at and or with how what when where who why which it this that there have has be any about please".split(" "));
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9à-ÿ$ ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

/** Best matching office answers for a caller's question (keyword overlap). */
export async function searchKnowledge(question: string, limit = 4) {
  const q = new Set(words(question));
  if (!q.size) return [];
  const scored = (await getKnowledge()).map((e) => {
    const bag = new Set([...words(e.question), ...e.keywords.flatMap(words)]);
    let score = 0;
    for (const w of q) if (bag.has(w)) score += e.keywords.some((k) => k.includes(w)) ? 2 : 1;
    return { e, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => ({ question: x.e.question, answer: x.e.answer }));
}

const DAY = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" } as const;
const t12 = (hm: string) => { const [h, m] = hm.split(":").map(Number); return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`; };

/** Facts read from the system — never typed into the prompt. */
export async function builtInFacts() {
  const cfg = await getDispatchConfig();
  const hours = (Object.keys(DAY) as (keyof typeof DAY)[]).map((d) => {
    const h = cfg.businessHours[d];
    return `${DAY[d]}: ${h ? `${t12(h.start)} – ${t12(h.end)}` : "closed"}`;
  });
  return {
    company: "DADA HOUSE — residential home services",
    phone: DEFAULT_BUSINESS_PHONE,
    email: "customerservice@dada-house.com",
    website: "dada-house.com",
    services: ["Air conditioning repair and installation", "Heating repair and installation", "Plumbing", "Water heater repair and replacement", "Remodeling (bathroom, kitchen, flooring, general renovation)", "Preventive HVAC maintenance and the annual maintenance plan", "Emergency service"],
    serviceCall: "The service call (diagnostic visit) is $69. If the customer approves the work, the $69 is deducted from the total.",
    pricingPolicy: "Repair and installation prices are given by the technician after the diagnostic visit — never quote a repair price by phone.",
    schedulingHours: hours,
    arrivalWindows: `Appointments use ${cfg.arrivalWindowHours}-hour arrival windows; the technician arrives within the window. Maintenance tune-ups: 2-hour windows between 8 AM and 4 PM.`,
    maintenancePlan: `HVAC Maintenance Plan: $${PRICING.annual.base}/year (or $${PRICING.monthly.base}/month, 12-month commitment) for the first system at an address, +$${PRICING.annual.additional}/year ($${PRICING.monthly.additional}/month) per additional system at the same address; each additional address starts at $${PRICING.annual.base}. Includes a spring cooling tune-up and a fall heating tune-up per address per year, 10% off HVAC repairs, $69 service call for members, priority scheduling.`,
    payments: "Customers pay invoices and estimates through a secure online payment link (sent by text or email). Never take card numbers by phone.",
    languages: "English, French and Spanish.",
  };
}
