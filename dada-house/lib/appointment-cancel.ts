/** Statuses where the visit is under way or done — the customer must call instead. */
const LOCKED_TECH = ["ARRIVED", "DIAGNOSING", "WAITING_FOR_APPROVAL", "WORKING", "COMPLETED"];

/** Whether a customer may cancel this appointment themselves from their account. */
export function customerCanCancel(a: { status: string; techStatus: string | null }) {
  return !["COMPLETED", "CANCELLED", "IN_PROGRESS"].includes(a.status) && !LOCKED_TECH.includes(a.techStatus ?? "");
}
