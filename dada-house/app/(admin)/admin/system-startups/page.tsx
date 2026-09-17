"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Loader2, RefreshCw } from "lucide-react";

type StartupRow = {
  id: string;
  appointmentId: string;
  appointmentNumber: string;
  customerName: string;
  service: string;
  technicianName: string | null;
  status: string;
  finalStartupResult: string | null;
  completedAt: string | null;
  updatedAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  AWAITING_SUPERVISOR_REVIEW: "Awaiting Review",
  RETURNED: "Returned",
  ADDITIONAL_TESTING_REQUESTED: "Additional Testing",
  APPROVED: "Approved",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  AWAITING_SUPERVISOR_REVIEW: "bg-orange-50 text-orange-600 border-orange-200",
  RETURNED: "bg-red-50 text-red-600 border-red-200",
  ADDITIONAL_TESTING_REQUESTED: "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED: "bg-green-50 text-green-600 border-green-200",
};

const TABS = ["ALL", "AWAITING_SUPERVISOR_REVIEW", "RETURNED", "ADDITIONAL_TESTING_REQUESTED", "APPROVED"];

export default function AdminSystemStartupsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<StartupRow[]>([]);
  const [tab, setTab] = useState("AWAITING_SUPERVISOR_REVIEW");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [counts, setCounts] = useState({ awaitingReview: 0 });

  const load = useCallback(async (status: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/system-startups?status=${status}`);
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    const d = await res.json();
    setRows(d.startups ?? []);
    setCounts(d.counts ?? { awaitingReview: 0 });
    setLoading(false);
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  if (forbidden) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="font-semibold text-gray-700">Supervisor access required</p>
        <p className="text-sm text-gray-400 mt-1">System Startup reviews are limited to Admin, Super Admin, and Manager roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-[#1B3FA8]" /> System Startup Reviews
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{counts.awaitingReview} awaiting your review</p>
        </div>
        <button onClick={() => load(tab)} className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2 bg-white rounded-xl border border-gray-200 p-3">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t ? "bg-[#1B3FA8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {t === "ALL" ? "All" : STATUS_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-gray-400">Nothing here.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Job #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Technician</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Result</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => router.push(`/admin/system-startups/${r.id}`)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.appointmentNumber}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.customerName}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-700">{r.technicianName ?? "—"}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">{r.service}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{r.finalStartupResult?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${STATUS_COLOR[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
