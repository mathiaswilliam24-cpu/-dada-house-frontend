import { db } from "@/lib/db";
import { DEFAULT_FIELD_RULES, FIELD_RULE_DEFS, resolveFieldRules, type FieldRuleKey, type FieldRuleValues } from "./rules";

/**
 * Admin-managed HVAC Diagnostic data:
 *  - company field-rule thresholds (Setting "hvac.fieldRules"): proposed by one admin, approved by another
 *    (a SUPER_ADMIN may approve their own change);
 *  - manufacturer model library (HvacModelSpec): usable only once APPROVED the same way.
 */

const KEY = "hvac.fieldRules";
export type RuleChange = { values: Partial<FieldRuleValues>; note: string; by: string; byId: string; at: string };
export type FieldRulesSetting = {
  active: Partial<FieldRuleValues>;
  version: number;
  pending: RuleChange | null;
  history: (RuleChange & { approvedBy: string; approvedAt: string; version: number })[];
};

export async function getFieldRulesSetting(): Promise<FieldRulesSetting> {
  const row = await db.setting.findUnique({ where: { key: KEY } });
  const base: FieldRulesSetting = { active: {}, version: 0, pending: null, history: [] };
  if (!row) return base;
  try { return { ...base, ...JSON.parse(row.value) }; } catch { return base; }
}

export async function activeFieldRules(): Promise<{ values: FieldRuleValues; version: number }> {
  const s = await getFieldRulesSetting();
  return { values: resolveFieldRules(s.active), version: s.version };
}

async function save(s: FieldRulesSetting) {
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: JSON.stringify(s) }, update: { value: JSON.stringify(s) } });
}

export class RuleChangeError extends Error {}

export async function proposeFieldRules(values: Partial<Record<string, number>>, note: string, user: { id: string; name?: string | null }) {
  const clean: Partial<FieldRuleValues> = {};
  for (const [k, v] of Object.entries(values)) {
    const d = FIELD_RULE_DEFS[k as FieldRuleKey];
    if (!d) continue;
    if (typeof v !== "number" || v < d.min || v > d.max) throw new RuleChangeError(`${k} must be between ${d.min} and ${d.max}`);
    clean[k as FieldRuleKey] = v;
  }
  if (!Object.keys(clean).length) throw new RuleChangeError("No change proposed.");
  if (!note.trim()) throw new RuleChangeError("Explain the reason / source for the change.");
  const s = await getFieldRulesSetting();
  s.pending = { values: clean, note: note.trim(), by: user.name ?? user.id, byId: user.id, at: new Date().toISOString() };
  await save(s);
  return s;
}

export async function decideFieldRules(approve: boolean, user: { id: string; name?: string | null; role: string }) {
  const s = await getFieldRulesSetting();
  if (!s.pending) throw new RuleChangeError("Nothing pending.");
  if (approve) {
    if (s.pending.byId === user.id && user.role !== "SUPER_ADMIN") throw new RuleChangeError("A different administrator must approve this change.");
    s.version += 1;
    s.active = { ...s.active, ...s.pending.values };
    s.history = [{ ...s.pending, approvedBy: user.name ?? user.id, approvedAt: new Date().toISOString(), version: s.version }, ...s.history].slice(0, 50);
  }
  s.pending = null;
  await save(s);
  return s;
}

export function fieldRulesView(s: FieldRulesSetting) {
  const values = resolveFieldRules(s.active);
  return Object.entries(FIELD_RULE_DEFS).map(([k, d]) => ({
    key: k, unit: d.unit, min: d.min, max: d.max, source: d.source,
    value: values[k as FieldRuleKey], default: DEFAULT_FIELD_RULES[k as FieldRuleKey], label: d.label(values[k as FieldRuleKey]),
    pending: s.pending?.values[k as FieldRuleKey] ?? null,
  }));
}

// ── Manufacturer model library ──
const norm = (x: string) => x.toUpperCase().replace(/[\s\-_.\/]/g, "");

/** Longest approved model prefix matching this equipment (manufacturer must match too). */
export async function findModelSpec(manufacturer: string | null | undefined, modelNumber: string | null | undefined) {
  if (!manufacturer || !modelNumber) return null;
  const m = norm(modelNumber);
  const rows = await db.hvacModelSpec.findMany({ where: { status: "APPROVED", manufacturer: { equals: manufacturer.trim(), mode: "insensitive" } } });
  const hits = rows.filter((r) => m.startsWith(norm(r.modelPrefix)));
  hits.sort((a, b) => norm(b.modelPrefix).length - norm(a.modelPrefix).length);
  return hits[0] ?? null;
}
