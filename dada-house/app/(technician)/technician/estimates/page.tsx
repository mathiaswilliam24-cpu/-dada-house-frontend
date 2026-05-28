"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { FileText, Plus, Search, ChevronRight, Zap, Loader2, TrendingUp, Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type Estimate = {
  id: string;
  estimateNumber: string;
  clientName: string;
  clientEmail: string;
  total: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
};

const TABS = ["ALL", "OPEN", "CLOSED"] as const;

export default function TechnicianEstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof TABS[number]>("ALL");
  const [q, setQ] = useState("");
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/technician/estimates");
    const data = await res.json();
    setEstimates(data.estimates ?? []);
    setStats({ total: data.total ?? 0, open: data.open ?? 0, closed: data.closed ?? 0 });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = estimates.filter((e) => {
    const matchTab = tab === "ALL" || e.status === tab;
    const matchQ = !q || e.clientName.toLowerCase().includes(q.toLowerCase())
      || e.estimateNumber.toLowerCase().includes(q.toLowerCase());
    return matchTab && matchQ;
  });

  const grouped: Record<string, Estimate[]> = {};
  visible.forEach((e) => {
    const year = new Date(e.createdAt).getFullYear().toString();
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(e);
  });

  return (
    <div className="space-y-4">
      {/* Cross-link to Invoices */}
      <Link href="/technician/invoices"
        className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-[#1B3FA8]/30 hover:bg-blue-50/30 transition-colors">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">My Invoices</span>
        </div>
        <span className="text-xs text-[#1B3FA8] font-semibold">View →</span>
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1B3FA8]" /> Estimates
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {stats.open} open · {stats.closed} closed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/technician/estimates/new?quick=1"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#F7921A]/10 text-[#F7921A] rounded-xl text-xs font-bold border border-[#F7921A]/30 hover:bg-[#F7921A]/20 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" /> Quick
          </Link>
          <Link
            href="/technician/estimates/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1B3FA8] text-white rounded-xl text-xs font-bold hover:bg-[#1A3490] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </Link>
        </div>
      </div>

      {/* Stats strip */}
      {stats.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-1">
          <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
          <p className="text-sm text-gray-600">
            Total estimates value: <span className="font-bold text-gray-900">{formatCurrency(stats.total)}</span>
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by client or estimate #..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8] bg-white"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors border ${
              tab === t
                ? "bg-[#1B3FA8] text-white border-[#1B3FA8]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {t === "ALL" ? `All estimates` : t === "OPEN" ? `Open (${stats.open})` : `Closed (${stats.closed})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 py-16 text-center">
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-500">No estimates yet</p>
          <p className="text-xs text-gray-400 mt-1">Tap "New" to create your first estimate</p>
          <Link
            href="/technician/estimates/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#1B3FA8] text-white rounded-xl text-sm font-bold"
          >
            <Plus className="w-4 h-4" /> Create Estimate
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([year, items]) => {
              const yearTotal = items.reduce((s, e) => s + e.total, 0);
              return (
                <div key={year}>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{year}</p>
                    <p className="text-xs font-bold text-gray-500">{formatCurrency(yearTotal)}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-50">
                    {items.map((est) => (
                      <Link
                        key={est.id}
                        href={`/technician/estimates/${est.id}`}
                        className="flex items-center px-4 py-3.5 hover:bg-gray-50 transition-colors gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-mono text-xs text-gray-400">{est.estimateNumber}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                              est.status === "OPEN"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                              {est.status}
                            </span>
                            {est.sentAt && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-green-50 text-green-600">
                                Sent
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-gray-900 text-sm truncate">{est.clientName}</p>
                          <p className="text-xs text-gray-400">{formatDate(est.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="font-bold text-gray-900">{formatCurrency(est.total)}</p>
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
