"use client";
import { useEffect, useState } from "react";
import { MapPin, Navigation } from "lucide-react";

export default function TechMapPage() {
  const [pos, setPos] = useState<{lat: number; lng: number} | null>(null);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(p => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }));
  }, []);
  const mapsUrl = pos ? `https://maps.google.com/maps?q=${pos.lat},${pos.lng}&z=15&output=embed` : null;
  return (
    <div className="space-y-4">
      <div><h1 className="text-xl font-bold text-gray-900">My Location</h1><p className="text-sm text-gray-500">Your current position</p></div>
      {pos ? (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <iframe src={mapsUrl!} width="100%" height="300" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          <div className="p-4 flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 text-[#1B3FA8]" />
            <span className="font-mono text-xs">{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <Navigation className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-500">Getting your location…</p>
        </div>
      )}
    </div>
  );
}