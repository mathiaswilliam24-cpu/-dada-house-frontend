/**
 * Psychrometrics (IP units) — ASHRAE Handbook—Fundamentals (2017), Chapter 1, "Psychrometrics":
 *   eq. 3  standard atmospheric pressure vs elevation
 *   eq. 5/6 Hyland–Wexler saturation pressure over ice / liquid water
 *   eq. 22 humidity ratio from vapor pressure
 *   eq. 33/35 humidity ratio from dry-bulb + thermodynamic wet-bulb
 *   eq. 30 enthalpy, eq. 28 specific volume
 * Dew point and wet bulb are obtained by numerically inverting these equations (bisection), so every
 * output is consistent with the same equations. Pure functions, no lookup tables.
 * Psychrometer wet-bulb readings approximate the thermodynamic wet bulb; very low airflow over the
 * wick or a dry wick makes them read high.
 */

export const PSYCHRO_SOURCE = "ASHRAE Fundamentals 2017 ch.1 (Hyland–Wexler)";

const R = 459.67;

/** Standard atmospheric pressure (psia) at an elevation in feet (ASHRAE eq. 3). */
export function pressureAtElevation(ft: number): number {
  return 14.696 * Math.pow(1 - 6.8754e-6 * ft, 5.2559);
}

/** Saturation pressure of water vapor (psia) at t °F — over ice below 32 °F, over liquid water above. */
export function pws(tF: number): number {
  const T = tF + R;
  if (tF < 32) {
    return Math.exp(-1.0214165e4 / T - 4.8932428 - 5.3765794e-3 * T + 1.9202377e-7 * T ** 2 + 3.5575832e-10 * T ** 3 - 9.0344688e-14 * T ** 4 + 4.1635019 * Math.log(T));
  }
  return Math.exp(-1.0440397e4 / T - 1.129465e1 - 2.7022355e-2 * T + 1.289036e-5 * T ** 2 - 2.4780681e-9 * T ** 3 + 6.5459673 * Math.log(T));
}

/** Humidity ratio (lb water / lb dry air) from vapor partial pressure (eq. 22). */
export const wFromPw = (pw: number, p: number) => (0.621945 * pw) / (p - pw);
/** Vapor partial pressure from humidity ratio. */
export const pwFromW = (w: number, p: number) => (w * p) / (0.621945 + w);

/** Humidity ratio from dry bulb and thermodynamic wet bulb (eq. 33 above freezing, eq. 35 below). */
export function wFromDbWb(db: number, wb: number, p: number): number {
  const wsStar = wFromPw(pws(wb), p);
  return wb >= 32
    ? ((1093 - 0.556 * wb) * wsStar - 0.24 * (db - wb)) / (1093 + 0.444 * db - wb)
    : ((1220 - 0.04 * wb) * wsStar - 0.24 * (db - wb)) / (1220 + 0.444 * db - 0.48 * wb);
}

/** Moist-air enthalpy, BTU per lb of dry air (eq. 30). */
export const enthalpy = (db: number, w: number) => 0.24 * db + w * (1061 + 0.444 * db);
/** Specific volume, ft³ per lb of dry air (eq. 28). */
export const specificVolume = (db: number, w: number, p: number) => (0.370486 * (db + R) * (1 + 1.607858 * w)) / p;

function bisect(f: (x: number) => number, lo: number, hi: number, iter = 80) {
  let flo = f(lo);
  for (let i = 0; i < iter; i++) {
    const mid = (lo + hi) / 2, fm = f(mid);
    if ((fm > 0) === (flo > 0)) { lo = mid; flo = fm; } else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Dew point (°F) for a vapor partial pressure (inverts pws). */
export function dewPointFromPw(pw: number): number {
  return bisect((t) => pws(t) - pw, -100, 200);
}

/** Thermodynamic wet bulb (°F) for a dry bulb and humidity ratio. */
export function wetBulbFromW(db: number, w: number, p: number): number {
  return bisect((t) => wFromDbWb(db, t, p) - w, -100, db);
}

export type AirState = {
  db: number; wb: number; rh: number; dewPoint: number; w: number; grains: number;
  h: number; v: number; density: number; p: number;
};
export type AirInput = { db: number; wb?: number | null; rh?: number | null; p: number };
export type AirError = { code: "WB_ABOVE_DB" | "RH_OUT_OF_RANGE" | "BELOW_ZERO_W" | "OUT_OF_RANGE"; message: string };

/**
 * Full state point from dry bulb + (wet bulb OR relative humidity %). Wet bulb wins when both are given.
 * Returns an error instead of a state for physically impossible inputs.
 */
export function airState(i: AirInput): { state: AirState | null; error: AirError | null; from: "WB" | "RH" | null } {
  const { db, p } = i;
  if (!Number.isFinite(db) || db < -40 || db > 200) return { state: null, error: { code: "OUT_OF_RANGE", message: `Dry bulb ${db} °F is outside the supported range (−40 to 200 °F).` }, from: null };
  let w: number, from: "WB" | "RH";
  if (i.wb != null && Number.isFinite(i.wb)) {
    if (i.wb > db + 0.05) return { state: null, error: { code: "WB_ABOVE_DB", message: `Wet bulb ${i.wb} °F is above dry bulb ${db} °F — physically impossible.` }, from: null };
    w = wFromDbWb(db, i.wb, p); from = "WB";
  } else if (i.rh != null && Number.isFinite(i.rh)) {
    if (i.rh <= 0 || i.rh > 100) return { state: null, error: { code: "RH_OUT_OF_RANGE", message: `Relative humidity ${i.rh} % must be above 0 and at most 100 %.` }, from: null };
    w = wFromPw((i.rh / 100) * pws(db), p); from = "RH";
  } else return { state: null, error: null, from: null };
  if (w < 0) return { state: null, error: { code: "BELOW_ZERO_W", message: `Wet bulb ${i.wb} °F is too low for dry bulb ${db} °F (no moisture possible) — re-measure (dry wick, probe placement).` }, from: null };
  const pw = pwFromW(w, p);
  const v = specificVolume(db, w, p);
  return {
    state: {
      db, wb: from === "WB" ? (i.wb as number) : wetBulbFromW(db, w, p), rh: Math.min(100, (pw / pws(db)) * 100), dewPoint: dewPointFromPw(pw),
      w, grains: w * 7000, h: enthalpy(db, w), v, density: (1 + w) / v, p,
    },
    error: null, from,
  };
}
