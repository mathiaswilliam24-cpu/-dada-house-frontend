"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MapPin, Clock, AlertTriangle, ChevronRight, Calendar,
  Phone, Navigation, Search, Loader2,
} from "lucide-react";

type Job = {
  id: string; appointmentNumber: string; name: string; phone: string;
  address: string; city: string; service: string;
  preferredDate: string | null; techStatus: string | null;
  status: string; priority: string; isEmergency: boolean;
};

const TABS = ["today", "upcoming", "pending", "emergency", "completed"] as const;
type Tab = typeof TABS[number];

const TAB_LABEL: Record<Tab, string> = {
  today: "Today", upcoming: "Upcoming", pending: "Pending",
  emergency: "Emergency", completed: "Completed",
};

const TECH_STATUS_COLOR: Record<string, string> = {
  ASSIGNED: "bg-gray-100 text-gray-600", ACCEPTED: "bg-blue-50 text-blue-600",
  EN_ROUTE: "bg-indigo-100 text-indigo-700", ARRIVED: "bg-purple-100 text-purple-700",
  DIAGNOSING: "bg-yellow-100 text-yellow-700", WAITING_FOR_APPROVAL: "bg-orange-100 text-orange-700",
  WORKING: "bg-blue-100 text-blue-700", COMPLETED: "bg-green-100 text-green-700",
  CANCELED: "bg-red-100 text-red-600", NEED_RESCHEDULE: "bg-pink-100 text-pink-700",
};

function JobsPageInner() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) ?? "today");
  const [data, setData] = useState<Record<string, Job[]>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/technician/schedule")
      .then((r) => r.json())
      .then((d) => {
        if (d?.today) {
          setData({
            today: d.today ?? [],
            upcoming: d.upcoming ?? [],
            pending: d.pending ?? [],
            emergency: d.emergency ?? [],
            completed: d.completedToday ?? [],
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const jobs: Job[] = (data[tab] ?? []).filter((j) => {
    if (!q) return true;
    return (
      j.name.toLowerCase().includes(q.toLowerCase()) ||
      j.service.toLowerCase().includes(q.toLowerCase()) ||
      j.address.toLowerCase().includes(q.toLowerCase()) ||
      j.appointmentNumber.toLowerCase().includes(q.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Jobs</h1>
        <p className="text-sm text-gray-500">All your assigned appointments</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, service, address…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              tab === t
                ? t === "emergency"
                  ? "bg-red-500 text-white border-red-500"
                  : "bg-[#1B3FA8] text-white border-[#1B3FA8]"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            {TAB_LABEL[t]}
            {data[t] && data[t].length > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${tab === t ? "bg-white/20" : "bg-gray-100"}`}>
                {data[t].length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No {TAB_LABEL[tab].toLowerCase()} jobs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => {
            const isEmergency = j.isEmergency || j.priority === "EMERGENCY";
            return (
              <Link
                key={j.id}
                href={`/technician/jobs/${j.id}`}
                className={`block rounded-2xl border p-4 active:opacity-80 ${isEmergency ? "border-red-300 bg-red-50" : "bg-white border-gray-200"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {isEmergency && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      <p className="font-semibold text-gray-900 text-sm truncate">{j.service}</p>
                    </div>
                    <p className="text-sm text-gray-600">{j.name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                      <MapPin className="w-3 h-3" /> {j.address}, {j.city}
                    </div>
                    {j.preferredDate && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(j.preferredDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {j.techStatus && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${TECH_STATUS_COLOR[j.techStatus] ?? "bg-gray-100 text-gray-600"}`}>
                        {j.techStatus.replace(/_/g, " ")}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <a
                    href={`tel:${j.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-700"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call
                  </a>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(`${j.address} ${j.city}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-50 rounded-lg text-xs font-medium text-[#1B3FA8]"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Navigate
                  </a>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400">Loading…</div>}>
      <JobsPageInner />
    </Suspense>
  );
}
