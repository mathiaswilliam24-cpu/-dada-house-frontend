"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin, User, AlertTriangle, Plus, ChevronRight } from "lucide-react";

type Appt = { id: string; appointmentNumber: string; name: string; phone: string; address: string; city: string; service: string; status: string; techStatus: string | null; preferredDate: string | null; preferredTime: string | null; technicianId: string | null; };

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  CONFIRMED: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-orange-50 text-orange-700 border-orange-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-gray-50 text-gray-500 border-gray-200",
};

export default function DispatcherPage() {
  const [appts, setAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetch("/api/dispatcher/requests")
      .then(r => r.json())
      .then(d => { setAppts(d.appointments ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? appts : filter === "unassigned" ? appts.filter(a => !a.technicianId) : appts.filter(a => a.status === filter.toUpperCase());
  const pending = appts.filter(a => a.status === "PENDING").length;
  const unassigned = appts.filter(a => !a.technicianId && a.status !== "COMPLETED" && a.status !== "CANCELLED").length;
  const today_jobs = appts.filter(a => a.preferredDate?.startsWith(today)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Board</h1>
          <p className="text-gray-500 text-sm mt-0.5">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <Link href="/booking" className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7921A] text-white rounded-lg text-sm font-semibold hover:bg-[#F7921A]/90">
          <Plus className="w-4 h-4" />New Job
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[["Pending", pending, "text-yellow-600 bg-yellow-50"], ["Today", today_jobs, "text-blue-600 bg-blue-50"], ["Unassigned", unassigned, "text-red-600 bg-red-50"]].map(([label, count, cls]) => (
          <div key={label as string} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${(cls as string).split(" ")[0]}`}>{count as number}</p>
            <p className="text-xs text-gray-500 mt-1">{label as string}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all","unassigned","PENDING","CONFIRMED","IN_PROGRESS","COMPLETED"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === f ? "bg-[#1B3FA8] text-white border-[#1B3FA8]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
            {f === "all" ? "All" : f === "unassigned" ? "Unassigned" : f.replace("_"," ")}
          </button>
        ))}
      </div>

      {loading ? <div className="text-center py-10 text-gray-400">Loading…</div> : (
        <div className="space-y-3">
          {filtered.map(a => (
            <Link key={a.id} href={`/dispatcher/assign?id=${a.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-200 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 text-sm">{a.service}</span>
                    {!a.technicianId && a.status !== "COMPLETED" && a.status !== "CANCELLED" && (
                      <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full font-medium">Unassigned</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-0.5"><User className="w-3 h-3" />{a.name} · {a.phone}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-500"><MapPin className="w-3 h-3 shrink-0" />{a.address}, {a.city}</div>
                  {a.preferredDate && <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Clock className="w-3 h-3" />{new Date(a.preferredDate).toLocaleDateString()}{a.preferredTime ? ` at ${a.preferredTime}` : ""}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[a.status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>{a.status.replace("_"," ")}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </div>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">No appointments</div>}
        </div>
      )}
    </div>
  );
}