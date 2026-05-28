"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart2, Star, Clock, DollarSign, CheckCircle, Loader2, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Summary = {
  totalCompleted: number;
  monthCompleted: number;
  weekCompleted: number;
  monthRevenue: number;
  avgJobTimeMinutes: number;
  avgRating: number;
};

type RecentJob = {
  id: string; appointmentNumber: string; service: string;
  name: string; techStatus: string | null; completedAt: string | null; revenue: number;
};

function formatMinutes(mins: number): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [serviceBreakdown, setServiceBreakdown] = useState<Record<string, number>>({});
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/technician/reports")
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.summary);
        setServiceBreakdown(d.serviceBreakdown ?? {});
        setRecentJobs(d.recentJobs ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Reports</h1>
        <p className="text-sm text-gray-500">Performance overview</p>
      </div>

      {/* KPI grid */}
      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1B3FA8] text-white rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1"><CheckCircle className="w-4 h-4 text-blue-300" /></div>
            <p className="text-3xl font-black">{summary.monthCompleted}</p>
            <p className="text-xs text-blue-200">Jobs This Month</p>
          </div>
          <div className="bg-green-600 text-white rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1"><DollarSign className="w-4 h-4 text-green-200" /></div>
            <p className="text-2xl font-black">{formatCurrency(summary.monthRevenue)}</p>
            <p className="text-xs text-green-200">Revenue This Month</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-[#F7921A]" />
            </div>
            <p className="text-2xl font-black text-gray-900">{formatMinutes(summary.avgJobTimeMinutes)}</p>
            <p className="text-xs text-gray-500">Avg Job Time</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center gap-1 mb-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </div>
            <p className="text-2xl font-black text-gray-900">{summary.avgRating > 0 ? summary.avgRating.toFixed(1) : "—"}</p>
            <p className="text-xs text-gray-500">Avg Customer Rating</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-2xl font-black text-gray-900">{summary.weekCompleted}</p>
            <p className="text-xs text-gray-500">Jobs This Week</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-2xl font-black text-gray-900">{summary.totalCompleted}</p>
            <p className="text-xs text-gray-500">Total Completed</p>
          </div>
        </div>
      )}

      {/* Service breakdown */}
      {Object.keys(serviceBreakdown).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#1B3FA8]" />
            <h2 className="font-bold text-gray-900 text-sm">By Service</h2>
          </div>
          {Object.entries(serviceBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([service, count]) => {
              const max = Math.max(...Object.values(serviceBreakdown));
              const pct = Math.round((count / max) * 100);
              return (
                <div key={service}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 truncate">{service}</span>
                    <span className="font-bold text-gray-900 ml-2">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full bg-[#1B3FA8] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Recent jobs */}
      {recentJobs.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 text-sm mb-3">Recent Jobs</h2>
          <div className="space-y-2">
            {recentJobs.map((j) => (
              <Link
                key={j.id}
                href={`/technician/jobs/${j.id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{j.service}</p>
                  <p className="text-xs text-gray-500">{j.name}</p>
                  {j.completedAt && (
                    <p className="text-xs text-gray-400">{new Date(j.completedAt).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {j.revenue > 0 && (
                    <span className="text-sm font-bold text-green-600">{formatCurrency(j.revenue)}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
