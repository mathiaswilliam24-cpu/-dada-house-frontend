"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Calendar, X } from "lucide-react";

type Props = {
  technicians: { id: string; name: string | null }[];
  services: string[];
  currentService?: string;
  currentTechnicianId?: string;
  currentFrom?: string;
  currentTo?: string;
  currentStatus?: string;
  currentQ?: string;
};

export function AppointmentFilters({
  technicians, services,
  currentService, currentTechnicianId, currentFrom, currentTo, currentStatus, currentQ,
}: Props) {
  const router = useRouter();

  function navigate(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (currentQ)           base.q           = currentQ;
    if (currentStatus)      base.status      = currentStatus;
    if (currentService)     base.service     = currentService;
    if (currentTechnicianId) base.technicianId = currentTechnicianId;
    if (currentFrom)        base.from        = currentFrom;
    if (currentTo)          base.to          = currentTo;
    const merged = { ...base, ...overrides };
    const entries = Object.entries(merged).filter((e): e is [string, string] => Boolean(e[1]));
    router.push("/admin/appointments?" + new URLSearchParams(entries).toString());
  }

  const hasFilters = currentService || currentTechnicianId || currentFrom || currentTo;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Service filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <select
          value={currentService ?? "ALL"}
          onChange={e => navigate({ service: e.target.value !== "ALL" ? e.target.value : undefined, page: "1" })}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#F7921A]/30 bg-white"
        >
          <option value="ALL">All Services</option>
          {services.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Technician filter */}
      <select
        value={currentTechnicianId ?? "ALL"}
        onChange={e => navigate({ technicianId: e.target.value !== "ALL" ? e.target.value : undefined, page: "1" })}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#F7921A]/30 bg-white"
      >
        <option value="ALL">All Technicians</option>
        <option value="UNASSIGNED">Unassigned</option>
        {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>

      {/* Date range */}
      <div className="flex items-center gap-2">
        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <input
          type="date"
          defaultValue={currentFrom}
          onChange={e => navigate({ from: e.target.value || undefined, page: "1" })}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white"
        />
        <span className="text-gray-400 text-xs">to</span>
        <input
          type="date"
          defaultValue={currentTo}
          onChange={e => navigate({ to: e.target.value || undefined, page: "1" })}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white"
        />
      </div>

      {/* Clear filters */}
      {hasFilters && (
        <button
          onClick={() => navigate({ service: undefined, technicianId: undefined, from: undefined, to: undefined, page: "1" })}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
        >
          <X className="w-3.5 h-3.5" /> Clear filters
        </button>
      )}
    </div>
  );
}
