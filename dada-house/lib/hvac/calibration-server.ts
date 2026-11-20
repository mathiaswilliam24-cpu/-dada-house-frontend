import { db } from "@/lib/db";
import { activeFieldRules } from "./admin-data";
import { CURRENT_VERSIONS, baseId, type CalibrationEntry } from "./validation";
import type { Hypothesis } from "./rules";

/**
 * Calibrated confidence for technicians. Returned ONLY when the latest evaluation run was made with
 * the exact engine, rule set, refrigerant data and field-rule versions in use now, and only for
 * (equipment category, fault, status) groups with enough independently verified validation cases.
 */
export async function activeCalibration() {
  const run = await db.hvacEvaluationRun.findFirst({ orderBy: { createdAt: "desc" } });
  if (!run) return null;
  const v = CURRENT_VERSIONS();
  const fr = await activeFieldRules();
  if (run.engineVersion !== v.engineVersion || run.rulesetVersion !== v.rulesetVersion || run.ptDataVersion !== v.ptDataVersion || run.fieldRulesVersion !== fr.version) return null;
  const result = run.result as { calibration?: { entries?: CalibrationEntry[] } };
  return { runId: run.id, at: run.createdAt, entries: (result.calibration?.entries ?? []).filter((e) => e.calibrated) };
}

export type HypCalibration = { n: number; hits: number; rate: number; low: number; high: number; runAt: string };

export async function calibrationFor(category: string | null | undefined, hypotheses: Pick<Hypothesis, "id" | "status">[]): Promise<Record<string, HypCalibration>> {
  if (!category || !hypotheses.length) return {};
  const cal = await activeCalibration();
  if (!cal) return {};
  const out: Record<string, HypCalibration> = {};
  for (const h of hypotheses) {
    const e = cal.entries.find((x) => x.category === category && x.fault === baseId(h.id) && x.status === h.status);
    if (e && e.rate != null && e.low != null && e.high != null) out[h.id] = { n: e.n, hits: e.hits, rate: e.rate, low: e.low, high: e.high, runAt: cal.at.toISOString() };
  }
  return out;
}
