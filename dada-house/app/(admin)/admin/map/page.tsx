"use client";
import { useEffect, useState, useCallback } from "react";
import { Navigation, RefreshCw, Clock, AlertCircle } from "lucide-react";

type TechLocation = { id: string; name: string | null; lat: number | null; lng: number | null; updatedAt: string | null; activeJob: string | null; };

export default function AdminMapPage() {
  const [techs, setTechs] = useState<TechLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/map").then(r => r.json()).then(d => { setTechs(d.technicians ?? []); setLoading(false); setLastRefresh(new Date()); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const active = techs.filter(t => t.lat && t.lng);
  const inactive = techs.filter(t => !t.lat || !t.lng);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Technician Map</h1>
          <p className="text-gray-500 text-sm mt-0.5">{active.length} active · refreshes every 30s</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {lastRefresh.toLocaleTimeString()}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {techs.map(tech => {
          const minsAgo = tech.updatedAt ? Math.floor((Date.now() - new Date(tech.updatedAt).getTime()) / 60000) : null;
          return (
            <div key={tech.id} className={`bg-white rounded-xl border p-4 ${tech.lat ? "border-green-200" : "border-gray-200"}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full shrink-0 ${tech.lat ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                <div className="w-10 h-10 bg-[#1B3FA8] rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {tech.name?.[0] ?? "T"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{tech.name}</p>
                  {minsAgo !== null && <p className="text-xs text-gray-400">{minsAgo < 2 ? "Just now" : `${minsAgo}m ago`}</p>}
                </div>
              </div>
              {tech.lat && tech.lng ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-mono">{tech.lat.toFixed(4)}, {tech.lng.toFixed(4)}</p>
                  {tech.activeJob && <p className="text-xs text-blue-600 flex items-center gap-1"><Clock className="w-3 h-3" />Job: {tech.activeJob}</p>}
                  <a href={`https://maps.google.com/?q=${tech.lat},${tech.lng}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#1B3FA8] hover:underline">
                    <Navigation className="w-3 h-3" />Open in Google Maps
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <AlertCircle className="w-3.5 h-3.5" />Location unavailable
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!loading && techs.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No technicians with TECHNICIAN role found
        </div>
      )}
    </div>
  );
}