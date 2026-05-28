import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Radio, AlertCircle, CheckCircle, Clock, User } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDispatchPage() {
  const [appointments, technicians] = await Promise.all([
    db.appointment.findMany({
      where: { status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] } },
      orderBy: { createdAt: "desc" },
      include: {
        technician: { select: { id: true, name: true } },
        dispatcher: { select: { name: true } },
      },
    }),
    db.user.findMany({
      where: { role: "TECHNICIAN" },
      select: { id: true, name: true, phone: true },
    }),
  ]);

  const unassigned = appointments.filter((a) => !a.technicianId);
  const inProgress = appointments.filter((a) => a.status === "IN_PROGRESS");
  const confirmed = appointments.filter((a) => a.status === "CONFIRMED" && a.technicianId);

  const statusColor: Record<string, string> = {
    PENDING: "text-yellow-700 bg-yellow-50 border-yellow-200",
    CONFIRMED: "text-blue-700 bg-blue-50 border-blue-200",
    IN_PROGRESS: "text-purple-700 bg-purple-50 border-purple-200",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dispatch Center</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage job assignments and active dispatches</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Unassigned", value: unassigned.length, icon: AlertCircle, color: "text-red-600 bg-red-50" },
          { label: "In Progress", value: inProgress.length, icon: Radio, color: "text-purple-600 bg-purple-50" },
          { label: "Confirmed", value: confirmed.length, icon: CheckCircle, color: "text-blue-600 bg-blue-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {unassigned.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-red-100 bg-red-50 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <h2 className="font-semibold text-red-800">Unassigned Jobs ({unassigned.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {unassigned.map((appt) => (
              <div key={appt.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusColor[appt.status] ?? ""}`}>
                      {appt.status}
                    </span>
                    <p className="font-mono text-xs text-gray-400">{appt.appointmentNumber}</p>
                  </div>
                  <p className="font-semibold text-gray-900">{appt.name}</p>
                  <p className="text-sm text-gray-600">{appt.service}{appt.subservice ? ` · ${appt.subservice}` : ""}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{appt.address}, {appt.city}</p>
                  {appt.preferredDate && (
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(appt.preferredDate)} {appt.preferredTime ?? ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link
                    href={`/dispatcher/assign?id=${appt.id}`}
                    className="text-xs px-3 py-1.5 bg-[#1B3FA8] text-white rounded-lg font-medium hover:bg-blue-800 transition-colors"
                  >
                    Assign Tech
                  </Link>
                  <Link
                    href={`/admin/appointments`}
                    className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors text-center"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-600" />
          <h2 className="font-semibold text-gray-800">Field Technicians ({technicians.length})</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {technicians.map((tech) => {
            const activJobs = appointments.filter((a) => a.technicianId === tech.id);
            return (
              <div key={tech.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">{tech.name}</p>
                  {tech.phone && <p className="text-xs text-gray-500">{tech.phone}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{activJobs.length} active job{activJobs.length !== 1 ? "s" : ""}</span>
                  {activJobs.length > 0 ? (
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                  )}
                </div>
              </div>
            );
          })}
          {technicians.length === 0 && (
            <p className="px-5 py-8 text-center text-gray-400 text-sm">No technicians found. Add technicians in Settings.</p>
          )}
        </div>
      </div>

      {(inProgress.length > 0 || confirmed.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
            <h2 className="font-semibold text-gray-800">Active Dispatches</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {[...inProgress, ...confirmed].map((appt) => (
              <div key={appt.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusColor[appt.status] ?? ""}`}>
                      {appt.status.replace("_", " ")}
                    </span>
                    {appt.techStatus && (
                      <span className="text-xs text-purple-600 font-medium">{appt.techStatus.replace("_", " ")}</span>
                    )}
                  </div>
                  <p className="font-semibold text-gray-900">{appt.name} — {appt.service}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{appt.address}, {appt.city}</p>
                  {appt.technician && (
                    <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Assigned to {appt.technician.name}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}