"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogIn, LogOut, MapPin } from "lucide-react";

type ClockEntry = {
  type: string;
  timestamp: string;
  address: string | null;
};

export default function ClockInScreen({ userName }: { userName?: string | null }) {
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  const [clockedIn, setClockedIn] = useState(false);
  const [lastEntry, setLastEntry] = useState<ClockEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/technician/clock")
      .then((r) => r.json())
      .then((d) => {
        setClockedIn(!!d.clockedIn);
        setLastEntry(d.lastEntry ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return null;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`
      );
      const d = await res.json();
      return d?.results?.[0]?.formatted_address ?? null;
    } catch {
      return null;
    }
  }

  function getPosition(): Promise<GeolocationPosition | null> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  async function toggle() {
    setSaving(true);
    setError(null);
    try {
      const pos = await getPosition();
      const lat = pos?.coords.latitude;
      const lng = pos?.coords.longitude;
      const address = lat != null && lng != null ? await reverseGeocode(lat, lng) : null;

      const res = await fetch("/api/technician/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: clockedIn ? "out" : "in", lat, lng, address }),
      });
      if (!res.ok) throw new Error("Failed to save");

      router.refresh();
      setClockedIn(!clockedIn);
      const d = await res.json();
      setLastEntry(d.entry);
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-6 text-center">
      <div>
          {userName && <p className="text-sm text-gray-500 mb-1">Welcome back, {userName}</p>}
          <h1 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Clock className="w-5 h-5" /> {clockedIn ? "You're Clocked In" : "Clock In to Start"}
          </h1>
        </div>

        <div className="bg-[#1B3FA8] rounded-3xl p-8 text-white">
          <p className="text-5xl font-black font-mono">{now.toLocaleTimeString()}</p>
          <p className="text-blue-200 mt-2">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        <button
          onClick={toggle}
          disabled={saving || loading}
          className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-60 ${
            clockedIn ? "bg-red-500 text-white hover:bg-red-600" : "bg-green-500 text-white hover:bg-green-600"
          }`}
        >
          {clockedIn ? (
            <>
              <LogOut className="w-6 h-6" /> Clock Out
            </>
          ) : (
            <>
              <LogIn className="w-6 h-6" /> Clock In
            </>
          )}
        </button>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {lastEntry && (
          <div className="text-sm text-gray-500 space-y-1">
            <p>
              Last {lastEntry.type === "IN" ? "clock in" : "clock out"}:{" "}
              {new Date(lastEntry.timestamp).toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            {lastEntry.address && (
              <p className="flex items-center justify-center gap-1 text-gray-400">
                <MapPin className="w-3.5 h-3.5 shrink-0" /> {lastEntry.address}
              </p>
            )}
          </div>
        )}
    </div>
  );
}
