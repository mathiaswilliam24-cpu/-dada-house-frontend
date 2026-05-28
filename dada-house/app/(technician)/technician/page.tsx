"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin, Clock, Phone, Navigation, AlertTriangle,
  CheckCircle, Calendar, ChevronRight, DollarSign, Zap, LogIn, LogOut,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Job = {
  id: string; appointmentNumber: string; name: string; phone: string;
  address: string; city: string; service: string;
  preferredDate: string | null; preferredTime: string | null;
  status: string; techStatus: string | null;
  priority: string; isEmergency: boolean;
};

type Stats = {
  todayCount: number; emergencyCount: number;
  completedCount: number; pendingCount: number; dailyRevenue: number;
};

const TECH_STATUS_LABEL: Record<string, string> = {
  ASSIGNED: "Assigned", ACCEPTED: "Accepted", EN_ROUTE: "En Route",
  ARRIVED: "Arrived", DIAGNOSING: "Diagnosing",
  WAITING_FOR_APPROVAL: "Waiting Approval", WORKING: "Working",
  COMPLETED: "Completed", CANCELED: "Canceled", NEED_RESCHEDULE: "Reschedule",
};

const TECH_STATUS_COLOR: Record<string, string> = {
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

function JobCard({ job }: { job: Job }) {
  const isEmergency = job.isEmergency || job.priority === "EMERGENCY";
  return (
    <Link
      href={`/technician/jobs/${job.id}`}
      className={`block rounded-2xl border p-4 active:opacity-80 ${isEmergency ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
    >
      <div className="flex items-start justify-between gap-3">
        {isEmergency && (
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm truncate">{job.service}</p>
            {job.techStatus && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${TECH_STATUS_COLOR[job.techStatus] ?? "bg-gray-100 text-gray-600"}`}>
                {TECH_STATUS_LABEL[job.techStatus] ?? job.techStatus}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 mt-0.5">{job.name}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{job.address}, {job.city}</span>
          </div>
          {job.preferredTime && (
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <Clock className="w-3 h-3" /> {job.preferredTime}
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href={`tel:${job.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700"
        >
          <Phone className="w-3.5 h-3.5" /> Call
        </a>
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(`${job.address} ${job.city}`)}`}
          target="_blank" rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 rounded-xl text-xs font-semibold text-[#1B3FA8]"
        >
          <Navigation className="w-3.5 h-3.5" /> Navigate
        </a>
      </div>
    </Link>
  );
}

export default function TechnicianDashboard() {
  const [data, setData] = useState<{
    today: Job[]; emergency: Job[]; upcoming: Job[];
    pending: Job[]; completedToday: Job[]; stats: Stats;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [clocked, setClocked] = useState(false);
  const [clockSaving, setClockSaving] = useState(false);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  useEffect(() => {
    fetch("/api/technician/schedule")
      .then((r) => r.json())
      .then((d) => {
        if (d?.today) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function toggleClock() {
    setClockSaving(true);
    await fetch("/api/technician/clock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: clocked ? "out" : "in" }),
    });
    setClocked(!clocked);
    setClockSaving(false);
  }

  const stats = data?.stats;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{today}</p>
        </div>
        <button
          onClick={toggleClock}
          disabled={clockSaving}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all ${clocked ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}
        >
          {clocked ? <><LogOut className="w-4 h-4" /> Clock Out</> : <><LogIn className="w-4 h-4" /> Clock In</>}
        </button>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#1B3FA8] rounded-2xl p-4 text-white">
            <p className="text-3xl font-black">{stats.todayCount}</p>
            <p className="text-xs text-blue-200 mt-0.5">Today's Jobs</p>
          </div>
          <div className="bg-green-600 rounded-2xl p-4 text-white">
            <p className="text-3xl font-black">{stats.completedCount}</p>
            <p className="text-xs text-green-200 mt-0.5">Completed Today</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-green-600" />
              <p className="text-lg font-black text-gray-900">{formatCurrency(stats.dailyRevenue)}</p>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Daily Revenue</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-lg font-black text-gray-900">{stats.pendingCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pending Jobs</p>
          </div>
        </div>
      )}

      {loading && <div className="text-center py-8 text-gray-400">Loading jobs…</div>}

      {/* Emergency jobs */}
      {data && data.emergency.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="font-bold text-red-600 text-sm uppercase tracking-wide">Emergency ({data.emergency.length})</h2>
          </div>
          <div className="space-y-3">
            {data.emergency.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </section>
      )}

      {/* Today's jobs */}
      {data && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1B3FA8]" />
              <h2 className="font-bold text-gray-900 text-sm">Today ({data.today.length})</h2>
            </div>
            <Link href="/technician/jobs" className="text-xs text-[#1B3FA8] font-semibold">See all</Link>
          </div>
          {data.today.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No jobs scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.today.map((j) => <JobCard key={j.id} job={j} />)}
            </div>
          )}
        </section>
      )}

      {/* Upcoming */}
      {data && data.upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-[#F7921A]" />
            <h2 className="font-bold text-gray-900 text-sm">Upcoming ({data.upcoming.length})</h2>
          </div>
          <div className="space-y-3">
            {data.upcoming.slice(0, 3).map((j) => <JobCard key={j.id} job={j} />)}
            {data.upcoming.length > 3 && (
              <Link href="/technician/jobs?tab=upcoming"
                className="block text-center text-sm text-[#1B3FA8] font-semibold py-3 bg-blue-50 rounded-xl">
                View {data.upcoming.length - 3} more upcoming jobs
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Completed today */}
      {data && data.completedToday.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h2 className="font-bold text-gray-900 text-sm">Completed Today ({data.completedToday.length})</h2>
          </div>
          <div className="space-y-3">
            {data.completedToday.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        </section>
      )}
    </div>
  );
}
