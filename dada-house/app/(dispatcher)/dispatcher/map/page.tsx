"use client";
import { useEffect, useState } from "react";
import { Navigation, RefreshCw } from "lucide-react";

type Tech = { id: string; name: string | null; lastLat: number | null; lastLng: number | null; };

export default function DispatcherMapPage() {
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/dispatcher/map").then(r => r.json()).then(d => { setTechs(d.technicians ?? []); setLoading(false); });
  }, []);
  const active = techs.filter(t => t.lastLat && t.lastLng);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Live Map</h1><p className="text-gray-500 text-sm">{active.length} technicians active</p></div>
        <button onClick={() => { setLoading(true); fetch("/api/dispatcher/map").then(r => r.json()).then(d => { setTechs(d.technicians ?? []); setLoading(false); }); }} className="p-2 rounded-lg hover:bg-gray-100"><RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? "animate-spin" : ""}`} /></button>
      </div>
      <div className="grid gap-3">
        {techs.map(t => (
          <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${t.lastLat ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
            <div className="w-10 h-10 bg-[#1B3FA8] rounded-full flex items-center justify-center text-white font-bold">{t.name?.[0] ?? "T"}</div>
            <div>
              <p className="font-medium text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-500">{t.lastLat ? `${t.lastLat.toFixed(4)}, ${t.lastLng?.toFixed(4)}` : "Location unavailable"}</p>
            </div>
            {t.lastLat && t.lastLng && (
              <a href={`https://maps.google.com/?q=${t.lastLat},${t.lastLng}`} target="_blank" rel="noopener noreferrer" className="ml-auto p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Navigation className="w-4 h-4" /></a>
            )}
          </div>
        ))}
        {!loading && techs.length === 0 && <div className="text-center text-gray-400 py-8">No technicians found</div>}
      </div>
    </div>
  );
}