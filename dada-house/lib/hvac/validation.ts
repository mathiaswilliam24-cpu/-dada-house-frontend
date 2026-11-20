import { createHash } from "node:crypto";
import { runEngine, ENGINE_VERSION, type EquipmentSpec } from "./engine";
import { runRules, RULESET_VERSION, FAULT_CATALOG, type HypothesisStatus, type FieldRuleValues } from "./rules";
import { PT_DATA_VERSION } from "./refrigerants";

/**
 * HVAC Diagnostic Pro — validation & calibration (priority 4).
 *
 * Independently verified cases are REPLAYED through the current engine + rules with no technician
 * decisions, so the measured accuracy always describes the code that is running now.
 * Cases are split TRAIN / VALIDATION / TEST by a hash of the equipment identity, so repeated visits
 * to the same unit can never land in two splits (no leakage).
 * Confidence numbers are only produced from the VALIDATION split, per equipment category + fault +
 * status, and only when enough cases exist. Headline accuracy comes from the TEST split.
 */

export const OTHER_FAULT = "OTHER"; // ground truth outside the rule set's coverage
export const NO_FAULT = "NO_FAULT"; // system verified to be operating correctly
export const MIN_CALIBRATION_N = 30;  // cases per (category, fault, status) before a % may be shown
export const MIN_TEST_N = 100;        // test cases before the accuracy target can be declared met
export const ACCURACY_TARGET = 0.95;  // business target (top-1), a validation goal — not a claim

export type Split = "TRAIN" | "VALIDATION" | "TEST";
export const SPLITS: Split[] = ["TRAIN", "VALIDATION", "TEST"];

export type CaseInputs = {
  equipment: EquipmentSpec;
  mode: string | null;
  complaint: string | null;
  circuits: number;
  measurements: Record<number, Record<string, { value: number | null; text: string | null }>>;
  safety: Record<string, boolean>;
};
export type EvalCase = {
  id: string; split: Split; category: string | null; refrigerant: string | null; manufacturer: string | null;
  inputs: CaseInputs; groundTruth: string[];
};

const VALID_LABELS = new Set<string>([...FAULT_CATALOG.map((f) => f.id), OTHER_FAULT, NO_FAULT]);
const SAFETY_FAULTS = new Set(FAULT_CATALOG.filter((f) => f.safetyCritical).map((f) => f.id));
export function isValidLabel(l: string) { return VALID_LABELS.has(l); }
export const baseId = (id: string) => id.split("#")[0];

/** Deterministic, leakage-free split: every case of the same equipment lands in the same split. */
export function splitFor(equipmentKey: string): Split {
  const h = parseInt(createHash("sha256").update(equipmentKey.trim().toLowerCase()).digest("hex").slice(0, 8), 16) % 100;
  return h < 60 ? "TRAIN" : h < 80 ? "VALIDATION" : "TEST";
}

export function equipmentKeyFor(s: { id: string; equipmentId?: string | null; equipment?: unknown }): string {
  if (s.equipmentId) return `eq:${s.equipmentId}`;
  const e = (s.equipment ?? {}) as { manufacturer?: string | null; modelNumber?: string | null; serialNumber?: string | null };
  const norm = (x?: string | null) => (x ?? "").toUpperCase().replace(/[\s\-_.]/g, "");
  if (e.serialNumber && norm(e.serialNumber).length >= 4) return `sn:${norm(e.manufacturer)}|${norm(e.modelNumber)}|${norm(e.serialNumber)}`;
  return `session:${s.id}`;
}

export function inputsFromSession(s: {
  equipment: unknown; mode: string | null; complaint: string | null; circuits: number; safety: unknown;
  measurements: { circuit: number; key: string; value: number | null; text: string | null }[];
}): CaseInputs {
  const measurements: CaseInputs["measurements"] = {};
  for (const m of s.measurements) (measurements[m.circuit] ??= {})[m.key] = { value: m.value, text: m.text };
  return { equipment: (s.equipment ?? {}) as EquipmentSpec, mode: s.mode, complaint: s.complaint, circuits: s.circuits, measurements, safety: (s.safety ?? {}) as Record<string, boolean> };
}

export type Ranked = { id: string; status: HypothesisStatus; safetyCritical: boolean };

/** Runs the current engine + rules on a case, without any technician decision. */
export function replay(inputs: CaseInputs, fieldRules?: Partial<FieldRuleValues> | null): Ranked[] {
  const engine = runEngine({ equipment: inputs.equipment, mode: inputs.mode, complaint: inputs.complaint, circuits: inputs.circuits, measurements: inputs.measurements, safety: inputs.safety });
  const rules = runRules({ engine, equipment: inputs.equipment, mode: inputs.mode, complaint: inputs.complaint, safety: inputs.safety, measurements: inputs.measurements, decisions: {}, fieldRules });
  const out: Ranked[] = [];
  for (const h of rules.hypotheses) {
    if (h.status === "RULED_OUT") continue;
    const id = baseId(h.id);
    if (out.some((o) => o.id === id)) continue; // multi-circuit duplicates count once, at their best rank
    out.push({ id, status: h.status, safetyCritical: !!h.safetyCritical });
  }
  return out;
}

const ANSWER: HypothesisStatus[] = ["POSSIBLE", "STRONGLY_SUSPECTED", "CONFIRMED"];
/** The engine abstains when it has no hypothesis better than "insufficient data". */
export const abstains = (r: Ranked[]) => !r.some((h) => ANSWER.includes(h.status));

export type Outcome = {
  id: string; split: Split; category: string | null; refrigerant: string | null; manufacturer: string | null;
  groundTruth: string[]; ranked: Ranked[]; abstained: boolean; top1: boolean; top3: boolean;
  prediction: string | null; safetyMissed: string[];
};

export function evaluateCase(c: EvalCase, fieldRules?: Partial<FieldRuleValues> | null): Outcome {
  const ranked = replay(c.inputs, fieldRules);
  const gt = new Set(c.groundTruth);
  const abstained = abstains(ranked);
  const answered = ranked.filter((h) => ANSWER.includes(h.status));
  const prediction = abstained ? null : answered[0].id;
  const noFaultCase = gt.size === 1 && gt.has(NO_FAULT);
  return {
    id: c.id, split: c.split, category: c.category, refrigerant: c.refrigerant, manufacturer: c.manufacturer,
    groundTruth: c.groundTruth, ranked, abstained,
    // A verified "no fault" case is answered correctly only by abstaining.
    top1: noFaultCase ? abstained : prediction != null && gt.has(prediction),
    top3: noFaultCase ? abstained : answered.slice(0, 3).some((h) => gt.has(h.id)),
    prediction,
    safetyMissed: [...gt].filter((f) => SAFETY_FAULTS.has(f) && !ranked.some((h) => h.id === f)),
  };
}

/** Wilson score interval (95 %) for a binomial proportion. */
export function wilson(hits: number, n: number, z = 1.96) {
  if (n <= 0) return { rate: null as number | null, low: null as number | null, high: null as number | null };
  const p = hits / n, z2 = z * z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  const r = (x: number) => Math.round(x * 1000) / 1000;
  return { rate: r(p), low: r(Math.max(0, centre - half)), high: r(Math.min(1, centre + half)) };
}

const rate = (hits: number, n: number) => ({ n, hits, ...wilson(hits, n) });

function grouped(outs: Outcome[], key: (o: Outcome) => string | null) {
  const m = new Map<string, Outcome[]>();
  for (const o of outs) { const k = key(o) || "Not set"; m.set(k, [...(m.get(k) ?? []), o]); }
  return [...m.entries()].map(([group, os]) => ({ group, n: os.length, top1: rate(os.filter((o) => o.top1).length, os.length), top3: rate(os.filter((o) => o.top3).length, os.length) }))
    .sort((a, b) => b.n - a.n);
}

export function metrics(outs: Outcome[]) {
  const n = outs.length;
  const answered = outs.filter((o) => !o.abstained);
  const abst = outs.filter((o) => o.abstained);
  // An abstention is correct when the best guess available would have been wrong.
  const correctAbst = abst.filter((o) => {
    const guess = o.ranked[0]?.id;
    return guess == null || !o.groundTruth.includes(guess);
  });
  const faults = new Set<string>();
  for (const o of outs) { o.groundTruth.forEach((g) => faults.add(g)); if (o.prediction) faults.add(o.prediction); }
  const perFault = [...faults].map((f) => {
    const tp = outs.filter((o) => o.prediction === f && o.groundTruth.includes(f)).length;
    const fp = outs.filter((o) => o.prediction === f && !o.groundTruth.includes(f)).length;
    const fn = outs.filter((o) => o.groundTruth.includes(f) && o.prediction !== f).length;
    return {
      fault: f, label: FAULT_CATALOG.find((x) => x.id === f)?.fault ?? (f === OTHER_FAULT ? "Other (outside rule coverage)" : f === NO_FAULT ? "No fault" : f),
      support: tp + fn, tp, fp, fn,
      precision: tp + fp ? Math.round((tp / (tp + fp)) * 1000) / 1000 : null,
      recall: tp + fn ? Math.round((tp / (tp + fn)) * 1000) / 1000 : null,
      safetyCritical: SAFETY_FAULTS.has(f),
    };
  }).sort((a, b) => b.support - a.support);
  const safetyCases = outs.filter((o) => o.groundTruth.some((g) => SAFETY_FAULTS.has(g)));
  const safetyMissed = safetyCases.filter((o) => o.safetyMissed.length > 0);
  return {
    n,
    top1: rate(outs.filter((o) => o.top1).length, n),
    top3: rate(outs.filter((o) => o.top3).length, n),
    answered: { n: answered.length, top1: rate(answered.filter((o) => o.top1).length, answered.length) },
    abstention: { n: abst.length, rate: n ? Math.round((abst.length / n) * 1000) / 1000 : null, correct: rate(correctAbst.length, abst.length) },
    safety: { cases: safetyCases.length, missed: safetyMissed.length, falseNegativeRate: wilson(safetyMissed.length, safetyCases.length), missedCaseIds: safetyMissed.map((o) => o.id) },
    perFault,
    byCategory: grouped(outs, (o) => o.category),
    byRefrigerant: grouped(outs, (o) => o.refrigerant),
    byManufacturer: grouped(outs, (o) => o.manufacturer),
  };
}
export type SplitMetrics = ReturnType<typeof metrics>;

export type CalibrationEntry = {
  category: string; fault: string; status: HypothesisStatus; n: number; hits: number;
  rate: number | null; low: number | null; high: number | null; calibrated: boolean;
};

/** How often a hypothesis shown with a given status turned out to be the verified fault (VALIDATION split only). */
export function calibrate(outs: Outcome[]): { entries: CalibrationEntry[]; byStatus: { status: string; n: number; hits: number; rate: number | null; low: number | null; high: number | null }[] } {
  const m = new Map<string, { category: string; fault: string; status: HypothesisStatus; n: number; hits: number }>();
  const st = new Map<string, { n: number; hits: number }>();
  for (const o of outs) {
    for (const h of o.ranked) {
      const hit = o.groundTruth.includes(h.id) ? 1 : 0;
      const k = `${o.category ?? "UNKNOWN"}|${h.id}|${h.status}`;
      const e = m.get(k) ?? { category: o.category ?? "UNKNOWN", fault: h.id, status: h.status, n: 0, hits: 0 };
      e.n++; e.hits += hit; m.set(k, e);
      const s = st.get(h.status) ?? { n: 0, hits: 0 };
      s.n++; s.hits += hit; st.set(h.status, s);
    }
  }
  return {
    entries: [...m.values()].map((e) => ({ ...e, ...wilson(e.hits, e.n), calibrated: e.n >= MIN_CALIBRATION_N })).sort((a, b) => b.n - a.n),
    byStatus: [...st.entries()].map(([status, s]) => ({ status, ...s, ...wilson(s.hits, s.n) })),
  };
}

export const CURRENT_VERSIONS = () => ({ engineVersion: ENGINE_VERSION, rulesetVersion: RULESET_VERSION, ptDataVersion: PT_DATA_VERSION });

/** Full evaluation over all verified cases. */
export function runEvaluation(cases: EvalCase[], fieldRules?: Partial<FieldRuleValues> | null) {
  const outs = cases.map((c) => evaluateCase(c, fieldRules));
  const bySplit = Object.fromEntries(SPLITS.map((s) => [s, metrics(outs.filter((o) => o.split === s))])) as Record<Split, SplitMetrics>;
  const test = bySplit.TEST;
  const target = {
    target: ACCURACY_TARGET, minTestCases: MIN_TEST_N, testCases: test.n,
    top1: test.top1.rate, lowerBound: test.top1.low,
    met: test.n >= MIN_TEST_N && (test.top1.low ?? 0) >= ACCURACY_TARGET,
    categoriesMet: test.byCategory.filter((g) => g.n >= MIN_TEST_N && (g.top1.low ?? 0) >= ACCURACY_TARGET).map((g) => g.group),
  };
  return {
    ...CURRENT_VERSIONS(),
    caseCount: cases.length,
    splitCounts: Object.fromEntries(SPLITS.map((s) => [s, outs.filter((o) => o.split === s).length])) as Record<Split, number>,
    metrics: bySplit,
    calibration: calibrate(outs.filter((o) => o.split === "VALIDATION")),
    target,
    outcomes: outs.map((o) => ({ id: o.id, split: o.split, top1: o.top1, top3: o.top3, abstained: o.abstained, prediction: o.prediction, groundTruth: o.groundTruth, safetyMissed: o.safetyMissed })),
  };
}
