"use client";
import { useEffect, useRef, useState } from "react";

// Only tracks when a job is actively EN_ROUTE, ARRIVED, WORKING, or DIAGNOSING.
// Reads the active techStatus from sessionStorage (set by the job detail page on status update).
export default function LocationTracker() {
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);
  const [tracking, setTracking] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const ACTIVE_STATUSES = new Set(["EN_ROUTE", "ARRIVED", "DIAGNOSING", "WORKING"]);

    function shouldTrack(): boolean {
      try {
        const status = sessionStorage.getItem("activeJobStatus");
        // If no job status set, still track (always-on fallback)
        if (!status) return true;
        return ACTIVE_STATUSES.has(status);
      } catch {
        return true;
      }
    }

    function startWatching() {
      if (watchIdRef.current !== null) return;
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          if (!shouldTrack()) return;

          const now = Date.now();
          // Throttle: send at most every 15s normally, every 5s when EN_ROUTE
          const interval = sessionStorage.getItem("activeJobStatus") === "EN_ROUTE" ? 5000 : 15000;
          if (now - lastSentRef.current < interval) return;
          lastSentRef.current = now;

          setTracking(true);
          try {
            await fetch("/api/tracking/location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                heading: position.coords.heading,
                speed: position.coords.speed,
              }),
            });
          } catch {
            // Silent — non-critical
          }
        },
        (err) => console.warn("[LocationTracker]", err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }

    startWatching();

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Invisible component — no render output
  return null;
}

// Utility: call this when updating job status to control tracking intensity
export function setActiveJobStatus(status: string | null) {
  try {
    if (status) {
      sessionStorage.setItem("activeJobStatus", status);
    } else {
      sessionStorage.removeItem("activeJobStatus");
    }
  } catch {}
}
