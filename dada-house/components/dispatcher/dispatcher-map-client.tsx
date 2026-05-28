"use client";
import { useEffect, useState } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { getSupabaseClient } from "@/lib/supabase";

type TechLocation = {
  id: string;
  name: string;
  image: string | null;
  technicianLocations: { lat: number; lng: number; timestamp: string }[];
  technicianAppointments: { id: string; service: string; address: string; techStatus: string | null }[];
};

export default function DispatcherMapClient() {
  const [technicians, setTechnicians] = useState<TechLocation[]>([]);
  const [selected, setSelected] = useState<TechLocation | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey });

  useEffect(() => {
    const load = () =>
      fetch("/api/dispatcher/map").then((r) => r.json()).then((d) => setTechnicians(d.technicians ?? []));
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!apiKey || !isLoaded) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <p className="text-gray-500 text-sm mb-4">{apiKey ? "Loading map…" : "Map not configured."} Current technician status:</p>
        <div className="space-y-2">
          {technicians.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{t.name}</p>
              <p className="text-sm text-gray-500">
                {t.technicianAppointments[0]?.service ?? "Idle"}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "500px" }}
        center={{ lat: 29.7604, lng: -95.3698 }}
        zoom={11}
      >
        {technicians.map((tech) => {
          const loc = tech.technicianLocations[0];
          if (!loc) return null;
          return (
            <Marker
              key={tech.id}
              position={{ lat: loc.lat, lng: loc.lng }}
              onClick={() => setSelected(tech)}
              label={{ text: (tech.name[0] ?? "T"), color: "white", fontWeight: "bold" }}
            />
          );
        })}
        {selected && selected.technicianLocations[0] && (
          <InfoWindow
            position={{ lat: selected.technicianLocations[0].lat, lng: selected.technicianLocations[0].lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div className="p-1 min-w-36">
              <p className="font-semibold text-gray-900">{selected.name}</p>
              {selected.technicianAppointments[0] && (
                <p className="text-sm text-gray-600">{selected.technicianAppointments[0].service}</p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-4 flex-wrap">
          {technicians.map((t) => (
            <button key={t.id} onClick={() => setSelected(t)} className="flex items-center gap-2 text-sm hover:text-[#1B3FA8]">
              <div className="w-6 h-6 bg-[#1B3FA8] rounded-full text-white text-xs flex items-center justify-center font-bold">{t.name[0]}</div>
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
