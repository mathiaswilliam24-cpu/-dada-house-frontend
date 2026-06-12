export const TECH_STATUS_LABEL: Record<string, string> = {
  ASSIGNED: "Assigned", ACCEPTED: "Accepted", EN_ROUTE: "On my way",
  ARRIVED: "Arrived", DIAGNOSING: "Diagnosing",
  WAITING_FOR_APPROVAL: "Waiting Approval", WORKING: "Working",
  COMPLETED: "Completed", CANCELED: "Canceled", NEED_RESCHEDULE: "Reschedule",
};

export const TECH_STATUS_COLOR: Record<string, string> = {
  ASSIGNED: "bg-gray-100 text-gray-600",
  ACCEPTED: "bg-blue-50 text-blue-600",
  EN_ROUTE: "bg-indigo-100 text-indigo-700",
  ARRIVED: "bg-purple-100 text-purple-700",
  DIAGNOSING: "bg-yellow-100 text-yellow-700",
  WAITING_FOR_APPROVAL: "bg-orange-100 text-orange-700",
  WORKING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELED: "bg-red-100 text-red-600",
  NEED_RESCHEDULE: "bg-pink-100 text-pink-700",
};
