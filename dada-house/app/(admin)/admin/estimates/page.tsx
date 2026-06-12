"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, DollarSign, Send, CheckCircle, Loader2, Search, RefreshCw, Plus } from "lucide-react";

type Estimate = {
  id: string;
  estimateNumber: string;
  clientName: string;
  clientEmail: string;
  total: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
  technician: { name: string | null } | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function AdminEstimatesPage() {
  const router = useRouter();
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0, sent: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/estimates");
    const data = await res.json();
    setEstimates(data.estimates ?? []);
    setStats({
      total: data.total ?? 0,
      open: data.open ?? 0,
      closed: data.closed ?? 0,
      sent: data.sent ?? 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = estimates.filter((e) => {
    const matchTab = tab === "ALL" || (tab === "OPEN" ? e.status === "OPEN" : e.status === "CLOSED");
    const matchQ = !q || e.clientName.toLowerCase().includes(q.toLowerCase())
      || e.clientEmail?.toLowerCase().includes(q.toLowerCase())
      || e.estimateNumber.toLowerCase().includes(q.toLowerCase())
      || (e.technician?.name ?? "").toLowerCase().includes(q.toLowerCase());
    return matchTab && matchQ;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
          <p className="text-gray-500 text-sm mt-0.5">All estimates from admin and technicians</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link href="/admin/estimates/new" className="flex items-center gap-2 px-4 py-2 bg-[#F97316] text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors">
            <Plus className="w-4 h-4" /> New Estimate
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Estimates", value: estimates.length.toString(), icon: FileText, color: "text-blue-600 bg-blue-50" },
          { label: "Open",            value: stats.open.toString(),        icon: CheckCircle, color: "text-yellow-600 bg-yellow-50" },
          { label: "Sent to Client",  value: stats.sent.toString(),        icon: Send, color: "text-purple-600 bg-purple-50" },
          { label: "Total Value",     value: fmt(stats.total),             icon: DollarSign, color: "text-green-600 bg-green-50" },
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-gray-200 p-4 items-center">
        <div className="flex gap-1">
          {["ALL", "OPEN", "CLOSED"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t ? "bg-[#1B3FA8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {t === "ALL" ? "All" : t === "OPEN" ? "Open" : "Closed"}
              {t !== "ALL" && ` (${estimates.filter((e) => e.status === t).length})`}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client, estimate #, technician…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estimate #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Technician</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map((est) => (
                  <tr key={est.id} onClick={() => router.push(`/admin/estimates/${est.id}`)} className="hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-gray-500">{est.estimateNumber}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{est.clientName || "—"}</p>
                      {est.clientEmail && <p className="text-xs text-gray-500">{est.clientEmail}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-gray-700">{est.technician?.name ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{fmt(est.total)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                          est.status === "OPEN"
                            ? "text-yellow-600 bg-yellow-50 border-yellow-200"
                            : "text-gray-600 bg-gray-50 border-gray-200"
                        }`}>
                          {est.status}
                        </span>
                        {est.sentAt && (
                          <div className="flex items-center gap-1">
                            <Send className="w-3 h-3 text-blue-500" />
                            <span className="text-xs text-blue-600">Sent {new Date(est.sentAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      {new Date(est.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">No estimates found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
