/**
 * Unit conversions for HVAC Diagnostic Pro. Canonical storage units:
 * temperature °F, refrigerant pressure psig, static pressure in. w.c., gas pressure in. w.c.
 * Gauge pressures are relative to standard atmosphere (14.696 psi) unless an altitude correction is added later.
 */

export const ATM_PSI = 14.696;
const KPA_PER_PSI = 6.894757293168;
const BAR_PER_PSI = 0.0689475729;
const PA_PER_INWC = 249.08891;

export type TempUnit = "F" | "C";
export type PressureUnit = "psig" | "kPag" | "barg";
export type StaticUnit = "inwc" | "Pa";

export const fToC = (f: number) => ((f - 32) * 5) / 9;
export const cToF = (c: number) => (c * 9) / 5 + 32;
/** A temperature DIFFERENCE (superheat, ΔT…) converts without the 32° offset. */
export const dFtoDC = (d: number) => (d * 5) / 9;
export const dCtoDF = (d: number) => (d * 9) / 5;

export const psigToPsia = (psig: number) => psig + ATM_PSI;
export const psiaToPsig = (psia: number) => psia - ATM_PSI;

export function toPsig(value: number, unit: PressureUnit): number {
  if (unit === "kPag") return value / KPA_PER_PSI;
  if (unit === "barg") return value / BAR_PER_PSI;
  return value;
}
export function fromPsig(psig: number, unit: PressureUnit): number {
  if (unit === "kPag") return psig * KPA_PER_PSI;
  if (unit === "barg") return psig * BAR_PER_PSI;
  return psig;
}

export const toF = (value: number, unit: TempUnit) => (unit === "C" ? cToF(value) : value);
export const fromF = (f: number, unit: TempUnit) => (unit === "C" ? fToC(f) : f);

export const toInwc = (value: number, unit: StaticUnit) => (unit === "Pa" ? value / PA_PER_INWC : value);
export const fromInwc = (inwc: number, unit: StaticUnit) => (unit === "Pa" ? inwc * PA_PER_INWC : inwc);

/** Converts a value typed in the technician's unit to the canonical unit for its kind. */
export type Kind = "temp" | "tempDiff" | "pressure" | "static" | "plain";
export function toCanonical(kind: Kind, value: number, prefs: { temp: TempUnit; pressure: PressureUnit; static: StaticUnit }): number {
  switch (kind) {
    case "temp": return toF(value, prefs.temp);
    case "tempDiff": return prefs.temp === "C" ? dCtoDF(value) : value;
    case "pressure": return toPsig(value, prefs.pressure);
    case "static": return toInwc(value, prefs.static);
    default: return value;
  }
}
export function fromCanonical(kind: Kind, value: number, prefs: { temp: TempUnit; pressure: PressureUnit; static: StaticUnit }): number {
  switch (kind) {
    case "temp": return fromF(value, prefs.temp);
    case "tempDiff": return prefs.temp === "C" ? dFtoDC(value) : value;
    case "pressure": return fromPsig(value, prefs.pressure);
    case "static": return fromInwc(value, prefs.static);
    default: return value;
  }
}
export function unitLabel(kind: Kind, prefs: { temp: TempUnit; pressure: PressureUnit; static: StaticUnit }, plain?: string): string {
  switch (kind) {
    case "temp": return prefs.temp === "C" ? "°C" : "°F";
    case "tempDiff": return prefs.temp === "C" ? "K" : "°F";
    case "pressure": return prefs.pressure === "kPag" ? "kPa(g)" : prefs.pressure === "barg" ? "bar(g)" : "psig";
    case "static": return prefs.static === "Pa" ? "Pa" : "in. w.c.";
    default: return plain ?? "";
  }
}
export const CANONICAL_UNIT: Record<Kind, string> = { temp: "°F", tempDiff: "°F", pressure: "psig", static: "in. w.c.", plain: "" };
