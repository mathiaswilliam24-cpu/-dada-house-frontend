"use client";
import { useEffect, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { getSupabaseClient } from "@/lib/supabase";

type Location = { lat: number; lng: number; timestamp: string };

export default function LiveTrackingMap({
  appointmentId,
  customerAddress,
}: {
  appointmentId: string;
  customerAddress: string;
}) {
  const [location, setLocation] = useState<Location | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey });

  useEffect(() => {
    // Fetch current location
    fetch(`/api/tracking/${appointmentId}`)
      .then((r) => r.json())
      .then((d) => { if (d.location) setLocation(d.location); });

    // Subscribe to real-time updates
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`tracking:${appointmentId}`)
      .on("broadcast", { event: "location" }, ({ payload }) => {
        setLocation(payload as Location);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [appointmentId]);

  if (!apiKey) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-400 text-sm bg-gray-50">
        Map unavailable — Google Maps API key not configured
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="h-48 flex items-center justify-center text-gray-400">Loading map…</div>;
  }

  const center = location ? { lat: location.lat, lng: location.lng } : { lat: 29.7604, lng: -95.3698 };

  return (
    <div className="h-48">
      <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }} center={center} zoom={14}>
        {location && (
          <Marker
            position={{ lat: location.lat, lng: location.lng }}
            label={{ text: "🚗", fontSize: "24px" }}
            title="Technician location"
          />
        )}
      </GoogleMap>
      {!location && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80">
          <p className="text-sm text-blue-700">Waiting for technician location…</p>
        </div>
      )}
    </div>
  );
}
