/**
 * Minimal Phase-1 business-hours check, driven entirely by env vars —
 * there is no BusinessHours/Holiday table yet (Phase 3). Format:
 *   CALL_CENTER_BUSINESS_HOURS="MON-SAT:08:00-18:00"
 *   CALL_CENTER_TIMEZONE="America/Chicago"
 */
const DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function parseRange(spec: string): { days: string[]; startMin: number; endMin: number } | null {
  const match = spec.trim().match(/^([A-Z]{3})(?:-([A-Z]{3}))?:(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, startDay, endDay, sh, sm, eh, em] = match;
  const startIdx = DAY_NAMES.indexOf(startDay);
  const endIdx = endDay ? DAY_NAMES.indexOf(endDay) : startIdx;
  if (startIdx === -1 || endIdx === -1) return null;

  const days: string[] = [];
  let i = startIdx;
  while (true) {
    days.push(DAY_NAMES[i]);
    if (i === endIdx) break;
    i = (i + 1) % 7;
  }

  return { days, startMin: Number(sh) * 60 + Number(sm), endMin: Number(eh) * 60 + Number(em) };
}

export function isWithinBusinessHours(now: Date = new Date()): boolean {
  const spec = process.env.CALL_CENTER_BUSINESS_HOURS;
  if (!spec) return true; // fail-open: no config means "always route to agents"

  const range = parseRange(spec);
  if (!range) return true;

  const timeZone = process.env.CALL_CENTER_TIMEZONE || "America/Chicago";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value.toUpperCase().slice(0, 3) ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const minutesNow = hour * 60 + minute;

  if (!range.days.includes(weekday)) return false;
  return minutesNow >= range.startMin && minutesNow < range.endMin;
}
