"use client";
import { useEffect, useState, useCallback } from "react";
import { Navigation, RefreshCw, Clock } from "lucide-react";
import { TECH_STATUS_LABEL, TECH_STATUS_COLOR } from "@/lib/tech-status";
import ElapsedTimer from "@/components/technician/elapsed-timer";

type ActiveJob = {
  number: string; service: string; address: string; techStatus: string | null;
  enRouteAt: string | null; arrivedAt: string | null; startedAt: string | null;
};

type Tech = {
  id: string; name: string | null; lastLat: number | null; lastLng: number | null;
  clockedIn: boolean; clockedInAt: string | null; activeJob: ActiveJob | null;
};

const POLL_INTERVAL = 20000;

export default function DispatcherMapPage() {
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch("/api/dispatcher/map").then(r => r.json()).then(d => { setTechs(d.technicians ?? []); setLoading(false); });
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [load]);

  const active = techs.filter(t => t.lastLat && t.lastLng);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Live Map</h1><p className="text-gray-500 text-sm">{active.length} technicians active</p></div>
        <button onClick={() => { setLoading(true); load(); }} className="p-2 rounded-lg hover:bg-gray-100"><RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? "animate-spin" : ""}`} /></button>
      </div>
      <div className="grid gap-3">
        {techs.map(t => {
          const job = t.activeJob;
          const showTimer = job?.enRouteAt && job.techStatus !== "COMPLETED";
          return (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${t.lastLat ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                <div className="w-10 h-10 bg-[#1B3FA8] rounded-full flex items-center justify-center text-white font-bold">{t.name?.[0] ?? "T"}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.lastLat ? `${t.lastLat.toFixed(4)}, ${t.lastLng?.toFixed(4)}` : "Location unavailable"}</p>
                </div>
                {t.lastLat && t.lastLng && (
                  <a href={`https://maps.google.com/?q=${t.lastLat},${t.lastLng}`} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Navigation className="w-4 h-4" /></a>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-bold ${t.clockedIn ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  <Clock className="w-3 h-3" />
                  {t.clockedIn && t.clockedInAt
                    ? `Clocked In since ${new Date(t.clockedInAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`
                    : "Clocked Out"}
                </span>
                {job?.techStatus && (
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${TECH_STATUS_COLOR[job.techStatus] ?? "bg-gray-100 text-gray-600"}`}>
                    {TECH_STATUS_LABEL[job.techStatus] ?? job.techStatus}
                  </span>
                )}
                {showTimer && (
                  <ElapsedTimer since={job!.enRouteAt!} className="text-xs px-2 py-1 rounded-full font-bold font-mono bg-indigo-50 text-indigo-700" />
                )}
              </div>

              {job && (
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-semibold text-gray-700">{job.service}</span> · {job.number} · {job.address}
                </div>
              )}
            </div>
          );
        })}
        {!loading && techs.length === 0 && <div className="text-center text-gray-400 py-8">No technicians found</div>}
      </div>
    </div>
  );
}
