"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from "lucide-react";
import { addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";

type Job = {
  id: string; service: string; name: string; address: string;
  preferredDate: string | null; preferredTime: string | null;
  techStatus: string | null; priority: string; isEmergency: boolean;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_DOT: Record<string, string> = {
  COMPLETED: "bg-green-500", WORKING: "bg-blue-500",
  EN_ROUTE: "bg-indigo-500", ASSIGNED: "bg-gray-400",
};

export default function SchedulePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const baseWeek = (() => {
    let d = new Date();
    if (weekOffset > 0) d = addWeeks(d, weekOffset);
    if (weekOffset < 0) d = subWeeks(d, Math.abs(weekOffset));
    return d;
  })();

  const weekStart = startOfWeek(baseWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(baseWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    fetch("/api/technician/schedule")
      .then((r) => r.json())
      .then((d) => {
        const allJobs: Job[] = [
          ...(d.today ?? []), ...(d.upcoming ?? []),
          ...(d.completedToday ?? []), ...(d.pending ?? []),
        ];
        const seen = new Set<string>();
        setJobs(allJobs.filter((j) => { if (seen.has(j.id)) return false; seen.add(j.id); return true; }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function jobsForDay(day: Date): Job[] {
    return jobs.filter((j) => j.preferredDate && isSameDay(new Date(j.preferredDate), day));
  }

  const selectedJobs = jobsForDay(selectedDay);
  const todayStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Schedule</h1>
        <p className="text-sm text-gray-500">{todayStr}</p>
      </div>

      {/* Week navigator */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="p-2 rounded-xl hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-900">
              {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
              {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            {weekOffset === 0 && <p className="text-xs text-[#1B3FA8] font-medium">Current week</p>}
          </div>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="p-2 rounded-xl hover:bg-gray-100">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Day strip */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            const dayJobs = jobsForDay(day);
            const isSelected = isSameDay(day, selectedDay);
            const isToday = isSameDay(day, new Date());
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(day)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                  isSelected ? "bg-[#1B3FA8] text-white" : isToday ? "bg-blue-50 text-[#1B3FA8]" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="text-[10px] font-medium">{DAY_LABELS[i]}</span>
                <span className={`text-base font-bold ${isSelected ? "text-white" : ""}`}>
                  {day.getDate()}
                </span>
                {dayJobs.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayJobs.slice(0, 3).map((j, k) => (
                      <span key={k} className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : j.isEmergency ? "bg-red-500" : "bg-[#F7921A]"}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day jobs */}
      <div>
        <h2 className="font-bold text-gray-900 text-sm mb-3">
          {selectedDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          {selectedJobs.length > 0 && <span className="ml-2 text-gray-400">({selectedJobs.length} job{selectedJobs.length !== 1 ? "s" : ""})</span>}
        </h2>

        {loading ? (
          <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
        ) : selectedJobs.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No jobs scheduled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedJobs.map((j) => (
              <Link
                key={j.id}
                href={`/technician/jobs/${j.id}`}
                className={`block bg-white border rounded-2xl p-4 active:opacity-80 ${j.isEmergency ? "border-red-300 bg-red-50" : "border-gray-200"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {j.techStatus && (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[j.techStatus] ?? "bg-gray-300"}`} />
                      )}
                      <p className="font-semibold text-gray-900 text-sm">{j.service}</p>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{j.name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <MapPin className="w-3 h-3" /> {j.address}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {j.preferredTime && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                        <Clock className="w-3 h-3" /> {j.preferredTime}
                      </div>
                    )}
                    {j.techStatus && (
                      <span className="text-[10px] text-gray-400">{j.techStatus.replace(/_/g, " ")}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
