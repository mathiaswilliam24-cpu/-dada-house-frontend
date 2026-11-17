export type BoardStatus = "UNASSIGNED" | "SCHEDULED" | "CONFIRMED" | "ON_THE_WAY" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "HOLD";

export type BoardJob = {
  id: string; appointmentNumber: string; name: string; phone: string; email: string;
  address: string; city: string; zipCode: string; service: string; subservice: string | null; description: string | null;
  jobType: string; jobTypeLabel: string; jobCategory: string | null; color: string; inferredType: boolean;
  customerType: string | null; priority: string; isEmergency: boolean;
  status: string; techStatus: string | null; boardStatus: BoardStatus;
  technicianId: string | null; assignments: { technicianId: string; role: string }[]; crew: { technicianId: string; role: string }[];
  scheduledStart: string | null; scheduledEnd: string | null; estimatedMinutes: number | null; arrivalWindow: string | null;
  preferredDate: string | null; preferredTime: string | null; source: string; createdAt: string;
  member: boolean; diagnosticFee: number | null;
};

export type BoardTech = {
  id: string; name: string; phone: string | null; image: string | null; color: string | null; role: string | null;
  skills: string[]; emergencyAvailable: boolean;
  hours: Record<string, { start: string; end: string } | null>;
  status: "AVAILABLE" | "ASSIGNED" | "DRIVING" | "ON_JOB" | "OFF_DUTY";
  clockedInAt: string | null; location: { lat: number; lng: number; timestamp: string } | null; bookedMinutes: number;
};

export type BoardData = {
  date: string; days: string[]; today: string;
  config: { boardStart: string; boardEnd: string; defaultMinutes: Record<string, number>; autoDispatch: string };
  jobTypes: Record<string, { label: string; color: string; minutes: number; categories: string[] }>;
  technicians: BoardTech[]; jobs: BoardJob[]; unassigned: BoardJob[];
  kpis: Record<string, number>;
};

export type Conflict = { kind: string; message: string; appointmentId?: string };

export const STATUS_STYLE: Record<BoardStatus, { label: string; card: string; dot: string }> = {
  UNASSIGNED: { label: "Unassigned", card: "bg-gray-100 border-gray-300 text-gray-800", dot: "bg-gray-400" },
  SCHEDULED: { label: "Scheduled", card: "bg-blue-50 border-blue-300 text-blue-950", dot: "bg-blue-500" },
  CONFIRMED: { label: "Confirmed", card: "bg-purple-50 border-purple-300 text-purple-950", dot: "bg-purple-500" },
  ON_THE_WAY: { label: "On the way", card: "bg-orange-50 border-orange-300 text-orange-950", dot: "bg-orange-500" },
  IN_PROGRESS: { label: "In progress", card: "bg-yellow-50 border-yellow-300 text-yellow-950", dot: "bg-yellow-500" },
  COMPLETED: { label: "Completed", card: "bg-green-50 border-green-300 text-green-950", dot: "bg-green-500" },
  CANCELED: { label: "Canceled", card: "bg-red-50 border-red-300 text-red-900 line-through", dot: "bg-red-500" },
  HOLD: { label: "Reschedule", card: "bg-pink-50 border-pink-300 text-pink-950", dot: "bg-pink-500" },
};

export const TECH_STATUS_STYLE: Record<BoardTech["status"], { label: string; dot: string }> = {
  AVAILABLE: { label: "Available", dot: "bg-green-500" },
  ASSIGNED: { label: "Assigned", dot: "bg-blue-500" },
  DRIVING: { label: "Driving", dot: "bg-orange-500" },
  ON_JOB: { label: "On job", dot: "bg-yellow-500" },
  OFF_DUTY: { label: "Off duty", dot: "bg-gray-400" },
};
