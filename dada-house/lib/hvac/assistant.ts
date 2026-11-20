import { getOpenAI } from "@/lib/openai";
import { FIELD_BY_KEY, categoryInfo, COMPLAINTS, MODES } from "./catalog";
import type { AnalysisResult } from "./server";
import { isA2L } from "./refrigerants";

/**
 * Layer C — AI reasoning assistant.
 * It EXPLAINS the deterministic results to the technician. It never calculates, never changes the
 * ranking or statuses, and never introduces readings, PT values, specs, fault codes or manufacturer
 * instructions that are not in the data it is given. Its output is checked by `guardOutput` before
 * it is shown: statements with numbers that do not appear in the input, unknown hypothesis ids,
 * certainty claims or unsupported repair advice are removed (and logged).
 */

export const ASSISTANT_MODEL = process.env.HVAC_ASSISTANT_MODEL || "gpt-4o";

export type AssistantOutput = {
  overview: string;
  hypotheses: { id: string; explanation: string; contradictions: string | null }[];
  missingInfo: string[];
  nextTest: { key: string | null; label: string | null; why: string } | null;
  rankingComment: string | null;
  cautions: string[];
};
export type Removed = { where: string; text: string; reason: string };

type Ctx = {
  equipment: Record<string, unknown>;
  complaint: string | null; mode: string | null;
  measurements: { key: string; label: string; circuit: number; value: number | null; text: string | null; unit: string | null }[];
  results: AnalysisResult;
  manufacturerReference: { manufacturer: string; modelPrefix: string; specs: unknown; sourceDocument: string } | null;
  technicianNotes: string | null;
};

export function buildContext(c: Ctx) {
  const r = c.results;
  return {
    equipment: {
      type: categoryInfo(c.equipment.category as string)?.label ?? null,
      manufacturer: c.equipment.manufacturer ?? null, model: c.equipment.modelNumber ?? null,
      refrigerant: c.equipment.refrigerant ?? null,
      refrigerantIsA2L: typeof c.equipment.refrigerant === "string" ? isA2L(c.equipment.refrigerant) : null,
      meteringDevice: c.equipment.meteringDevice ?? null,
      compressorType: c.equipment.compressorType ?? null, phase: c.equipment.phase ?? null,
      rla: c.equipment.rla ?? null, lra: c.equipment.lra ?? null,
      manufacturerTargets: c.equipment.specs ?? {},
    },
    complaint: c.complaint ? COMPLAINTS[c.complaint as keyof typeof COMPLAINTS] ?? c.complaint : null,
    mode: c.mode ? MODES[c.mode as keyof typeof MODES] ?? c.mode : null,
    measurements: c.measurements,
    calculated: r.calculated.map((x) => ({ key: x.key, label: x.label, circuit: x.circuit ?? null, value: x.value, formula: x.formula, note: x.note ?? null })),
    chargeAssessment: r.charge.map((x) => ({ circuit: x.circuit, status: x.status, reason: x.reason })),
    alerts: r.alerts.map((a) => ({ severity: a.severity, message: a.message, action: a.action ?? null })),
    hypotheses: r.rules.hypotheses.map((h) => ({
      id: h.id, fault: h.fault, status: h.status, safetyCritical: !!h.safetyCritical,
      supportingEvidence: h.support, contradictingEvidence: h.contradict, missingEvidence: h.missing,
      confirmationTest: h.confirmationTest, safety: h.safety ?? null, fieldRules: h.fieldRules,
    })),
    nextMeasurements: r.rules.nextMeasurements.map((n) => ({ key: n.key, label: FIELD_BY_KEY[n.key]?.label ?? n.key, reason: n.reason })),
    stillRequired: r.missing.map((m) => ({ key: m.key, label: m.label })),
    engineSummary: r.rules.summary,
    manufacturerReference: c.manufacturerReference,
    technicianNotes: c.technicianNotes,
  };
}
export type AssistantContext = ReturnType<typeof buildContext>;

const SYSTEM = `You are the reasoning assistant inside a professional HVAC diagnostic tool used by licensed technicians.
A deterministic engine has already done every calculation and ranked the hypotheses. Your job is to EXPLAIN, not to decide.
Strict rules:
- Use ONLY the data in the JSON you receive. Never invent or estimate readings, pressure-temperature values, specifications, targets, fault codes, part numbers or manufacturer procedures.
- Do not calculate new values. Quote numbers only exactly as they appear in the data.
- Do not change hypothesis statuses or ranking. If you think the evidence points elsewhere, say so in "rankingComment" and explain which measurement would settle it.
- Never give a probability, percentage or confidence score, and never claim certainty. A cause is only confirmed by the technician's test.
- Never recommend adding/recovering refrigerant or replacing a compressor or other major component unless that hypothesis is CONFIRMED.
- Mention A2L (flammable refrigerant) precautions only when equipment.refrigerantIsA2L is true.
- Never suggest bypassing a safety device, interlock or a manufacturer requirement. Repeat critical safety alerts first.
- Manufacturer procedures: refer only to "manufacturerReference" if present; otherwise tell the technician to follow the manufacturer's installation/service instructions.
- Plain, technician-friendly English. Short sentences.
Return JSON:
{"overview": "2-4 sentences: what the readings show and what the engine concluded",
 "hypotheses": [{"id": "<id from the data>", "explanation": "why the evidence points to or away from this cause", "contradictions": "explain the contradicting evidence, or null"}],
 "missingInfo": ["what is still unknown and why it matters"],
 "nextTest": {"key": "<a key from nextMeasurements or stillRequired, or null>", "why": "why this is the highest-value next check"},
 "rankingComment": "null, or where you think the evidence is ambiguous",
 "cautions": ["safety or procedure cautions grounded in the alerts / hypotheses"]}
Explain at most the 5 most relevant hypotheses.`;

export async function askAssistant(context: AssistantContext) {
  const res = await getOpenAI().chat.completions.create({
    model: ASSISTANT_MODEL,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: JSON.stringify(context) },
    ],
  });
  let raw: unknown = {};
  try { raw = JSON.parse(res.choices[0]?.message?.content ?? "{}"); } catch { /* guarded below */ }
  return guardOutput(raw, context);
}

// ── Guard ──
const A2L_RE = /(^|[^A-Za-z0-9])A2L([^A-Za-z0-9]|$)/i;
const NUM_RE = /-?\d+(?:[.,]\d+)?/g;
const CERTAINTY_RE = /\b(certain(ly)?|definitely|guarantee[ds]?|without (a )?doubt|100\s?%|confidence (score|level) of|\d+\s?% (likely|chance|probab|confiden))/i;
const MAJOR_REPAIR: { re: RegExp; needs: string[] }[] = [
  { re: /\b(add|adding|top(ping)? off|recharg\w*|charge it|recover(ing)?)\b[^.]*\brefrigerant\b|\brefrigerant\b[^.]*\b(add|top off)\b/i, needs: ["LOW_CHARGE", "OVERCHARGE"] },
  { re: /\breplac\w*\b[^.]*\bcompressor\b/i, needs: ["COMPRESSOR_ELECTRICAL", "COMPRESSOR_MECHANICAL"] },
];

/** Numbers present anywhere in the input (incl. inside strings such as "R-410A" or formulas). */
export function allowedNumbers(context: unknown): number[] {
  const out = new Set<number>();
  const walk = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) out.add(v);
    else if (typeof v === "string") for (const m of v.match(NUM_RE) ?? []) out.add(Math.abs(Number(m.replace(",", "."))));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(context);
  return [...out].map(Math.abs);
}

function numberOk(n: number, allowed: number[]) {
  if (Number.isInteger(n) && n >= 0 && n <= 5) return true; // counting words ("2 readings", "circuit 1", "step 3")
  // Exact value or the same value rounded to the precision the AI wrote it with.
  return allowed.some((a) => Math.abs(a - n) < 1e-9 || Math.abs(Math.round(a) - n) < 1e-9 || Math.abs(Math.round(a * 10) / 10 - n) < 1e-9);
}

function sentences(t: string) { return t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean); }

export function guardOutput(raw: unknown, context: AssistantContext): { output: AssistantOutput; removed: Removed[] } {
  const removed: Removed[] = [];
  const allowed = allowedNumbers(context);
  const ids = new Set(context.hypotheses.map((h) => h.id));
  const confirmed = new Set(context.hypotheses.filter((h) => h.status === "CONFIRMED").map((h) => h.id.split("#")[0]));
  const nextKeys = new Map([...context.nextMeasurements, ...context.stillRequired].map((n) => [n.key, n.label]));

  const clean = (text: unknown, where: string): string => {
    if (typeof text !== "string") return "";
    const kept: string[] = [];
    for (const s of sentences(text.slice(0, 2000))) {
      const bad = (s.match(NUM_RE) ?? []).map((m) => Math.abs(Number(m.replace(",", ".")))).find((n) => !numberOk(n, allowed));
      if (bad != null) { removed.push({ where, text: s, reason: `number ${bad} is not in the recorded or calculated data` }); continue; }
      if (A2L_RE.test(s) && context.equipment?.refrigerantIsA2L !== true) { removed.push({ where, text: s, reason: "A2L precaution does not apply to this refrigerant" }); continue; }
      if (CERTAINTY_RE.test(s)) { removed.push({ where, text: s, reason: "certainty or probability claim" }); continue; }
      const major = MAJOR_REPAIR.find((m) => m.re.test(s) && !m.needs.some((id) => confirmed.has(id)));
      if (major) { removed.push({ where, text: s, reason: "major repair advised without a technician-confirmed cause" }); continue; }
      kept.push(s);
    }
    return kept.join(" ");
  };
  const list = (v: unknown, where: string) => (Array.isArray(v) ? v : []).slice(0, 8).map((x, i) => clean(x, `${where}[${i}]`)).filter(Boolean);

  const r = (raw ?? {}) as Record<string, unknown>;
  const hyps: AssistantOutput["hypotheses"] = [];
  for (const [i, h0] of (Array.isArray(r.hypotheses) ? r.hypotheses : []).slice(0, 6).entries()) {
    const h = (h0 ?? {}) as Record<string, unknown>;
    const id = String(h.id ?? "");
    if (!ids.has(id)) { removed.push({ where: `hypotheses[${i}]`, text: id, reason: "hypothesis id not produced by the engine" }); continue; }
    const explanation = clean(h.explanation, `hypotheses.${id}`);
    const contradictions = clean(h.contradictions, `hypotheses.${id}.contradictions`) || null;
    if (explanation || contradictions) hyps.push({ id, explanation, contradictions });
  }
  let nextTest: AssistantOutput["nextTest"] = null;
  const nt = (r.nextTest ?? null) as Record<string, unknown> | null;
  if (nt) {
    const key = typeof nt.key === "string" && nextKeys.has(nt.key) ? nt.key : null;
    if (typeof nt.key === "string" && nt.key && !key) removed.push({ where: "nextTest.key", text: nt.key, reason: "not one of the measurements the engine asked for" });
    const why = clean(nt.why, "nextTest.why");
    if (key || why) nextTest = { key, label: key ? nextKeys.get(key) ?? null : null, why };
  }
  return {
    output: {
      overview: clean(r.overview, "overview"),
      hypotheses: hyps,
      missingInfo: list(r.missingInfo, "missingInfo"),
      nextTest,
      rankingComment: clean(r.rankingComment, "rankingComment") || null,
      cautions: list(r.cautions, "cautions"),
    },
    removed,
  };
}
