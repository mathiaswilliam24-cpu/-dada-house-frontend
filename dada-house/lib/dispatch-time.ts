/** North Carolina (America/New_York) time helpers (pure — safe for client components). */

export const TZ = "America/New_York";

export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** Wall-clock parts of an instant in North Carolina time. */
export function ctParts(d: Date) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23",
  }).formatToParts(d);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  return {
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    dayKey: DAY_KEYS[["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"))],
  };
}

/** UTC instant for a North Carolina wall-clock date ("2026-11-17") and minutes after midnight. */
export function ctInstant(ymd: string, minutes: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  // Offset (minutes) between Eastern wall-clock and UTC at instant t.
  const offset = (t: number) => {
    const p = ctParts(new Date(t));
    const [py, pm, pd] = p.ymd.split("-").map(Number);
    return (Date.UTC(py, pm - 1, pd) + p.minutes * 60000 - t) / 60000;
  };
  // Two passes so the offset is the one in effect at the result (handles DST changes).
  let t = wall - offset(wall) * 60000;
  t = wall - offset(t) * 60000;
  return new Date(t);
}

export const hm = (s: string) => { const [h, m] = s.split(":").map(Number); return h * 60 + (m || 0); };

export function fmtTimeCT(d: Date) {
  return d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
}

export function arrivalWindowFor(start: Date, hours: number) {
  const end = new Date(start.getTime() + hours * 3600000);
  const f = (d: Date) => d.toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).replace(":00", "");
  return `${f(start)} - ${f(end)}`;
}

