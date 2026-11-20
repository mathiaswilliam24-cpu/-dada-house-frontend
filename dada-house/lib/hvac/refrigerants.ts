import PT from "./data/pt-tables.json";

/**
 * Refrigerant saturation lookups from lib/hvac/data/pt-tables.json, generated with CoolProp
 * by scripts/hvac/generate-pt-tables.py. Values are never typed in by hand.
 *  - Superheat uses the DEW point at suction pressure.
 *  - Subcooling uses the BUBBLE point at liquid/high-side pressure.
 * For single-component and azeotropic refrigerants dew = bubble.
 */

type Row = [number, number, number]; // psig, dewF, bubbleF
type RefData = {
  label: string; coolpropFluid: string; safetyClass: string; kind: string; verification: string;
  minPsig: number; maxPsig: number; criticalPsig: number | null; rows: Row[];
};
const DATA = PT as unknown as { coolpropVersion: string; generatedAt: string; refrigerants: Record<string, RefData> };

export const PT_DATA_VERSION = `CoolProp ${DATA.coolpropVersion} (${DATA.generatedAt.slice(0, 10)})`;

export type RefrigerantInfo = {
  key: string; label: string; safetyClass: string; kind: string; verified: boolean;
  hasGlide: boolean; minPsig: number; maxPsig: number; criticalPsig: number | null;
};

export const REFRIGERANT_KEYS = Object.keys(DATA.refrigerants);

export function refrigerantInfo(key: string | null | undefined): RefrigerantInfo | null {
  if (!key) return null;
  const r = DATA.refrigerants[key];
  if (!r) return null;
  const mid = r.rows[Math.floor(r.rows.length / 2)];
  return {
    key, label: r.label, safetyClass: r.safetyClass, kind: r.kind, verified: r.verification === "checked",
    hasGlide: Math.abs(mid[1] - mid[2]) >= 0.5, minPsig: r.minPsig, maxPsig: r.maxPsig, criticalPsig: r.criticalPsig,
  };
}

export const isA2L = (key: string | null | undefined) => refrigerantInfo(key)?.safetyClass.startsWith("A2") ?? false;

export class OutOfRangeError extends Error {
  constructor(public refrigerant: string, public psig: number, public min: number, public max: number) {
    super(`${psig.toFixed(1)} psig is outside the ${refrigerant} property range (${min} to ${max} psig)`);
  }
}

/** Saturation temperature (°F) at a gauge pressure. `point` = dew (vapor) or bubble (liquid). */
export function saturationF(key: string, psig: number, point: "dew" | "bubble"): number {
  const r = DATA.refrigerants[key];
  if (!r) throw new Error(`Unknown refrigerant ${key}`);
  if (!Number.isFinite(psig) || psig < r.minPsig || psig > r.maxPsig) throw new OutOfRangeError(r.label, psig, r.minPsig, r.maxPsig);
  const col = point === "dew" ? 1 : 2;
  const i = Math.min(r.rows.length - 2, Math.floor(psig - r.minPsig)); // rows are 1 psi apart, starting at minPsig
  const a = r.rows[i], b = r.rows[i + 1];
  const t = (psig - a[0]) / (b[0] - a[0]);
  return a[col] + t * (b[col] - a[col]);
}

/** Inverse lookup (°F → psig), for display and tests. */
export function saturationPsig(key: string, tempF: number, point: "dew" | "bubble"): number {
  const r = DATA.refrigerants[key];
  if (!r) throw new Error(`Unknown refrigerant ${key}`);
  const col = point === "dew" ? 1 : 2;
  const rows = r.rows;
  if (tempF < rows[0][col] || tempF > rows[rows.length - 1][col]) throw new OutOfRangeError(r.label, NaN, r.minPsig, r.maxPsig);
  let lo = 0, hi = rows.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rows[m][col] <= tempF) lo = m; else hi = m; }
  const a = rows[lo], b = rows[hi];
  return a[0] + ((tempF - a[col]) / (b[col] - a[col])) * (b[0] - a[0]);
}
