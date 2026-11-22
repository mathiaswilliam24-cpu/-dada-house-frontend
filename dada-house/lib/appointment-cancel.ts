/**
 * Statuses where the technician is on the way, on site or done — the customer can no longer cancel or
 * reschedule from his account (or with the AI receptionist); he must call the office.
 * Rule (user, 2026-11-22): as soon as the technician is EN ROUTE, cancel/reschedule are disabled.
 */
export const LOCKED_TECH = ["EN_ROUTE", "ARRIVED", "DIAGNOSING", "WAITING_FOR_APPROVAL", "WORKING", "COMPLETED"];

/** Whether a customer may cancel or reschedule this appointment themselves. */
export function customerCanCancel(a: { status: string; techStatus: string | null }) {
  return !["COMPLETED", "CANCELLED", "IN_PROGRESS"].includes(a.status) && !LOCKED_TECH.includes(a.techStatus ?? "");
}

export const customerCanReschedule = customerCanCancel;

/** The visit is still open but the technician is already on the way / on site: show the buttons disabled. */
export function customerChangesLocked(a: { status: string; techStatus: string | null }) {
  return !["COMPLETED", "CANCELLED"].includes(a.status) && !customerCanCancel(a);
}
