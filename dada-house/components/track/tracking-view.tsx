"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Clock, Phone } from "lucide-react";
import PublicTrackingMap from "./public-tracking-map";

const POLL_INTERVAL = 15000;
const ARRIVED_STATUSES = ["ARRIVED", "DIAGNOSING", "WAITING_FOR_APPROVAL", "WORKING", "COMPLETED"];

type Location = { lat: number; lng: number; timestamp: string };

export default function TrackingView({
  appointmentId,
  appointmentNumber,
  service,
  address,
  technicianName,
  initialStatus,
  initialLocation,
}: {
  appointmentId: string;
  appointmentNumber: string;
  service: string;
  address: string;
  technicianName: string | null;
  initialStatus: string | null;
  initialLocation: Location | null;
}) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (status !== "EN_ROUTE") return;
    const interval = setInterval(() => {
      fetch(`/api/track/${appointmentId}`)
        .then((r) => r.json())
        .then((d) => { if (d.techStatus) setStatus(d.techStatus); })
        .catch(() => {});
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [status, appointmentId]);

  const isTracking = status === "EN_ROUTE";
  const hasArrived = !!status && ARRIVED_STATUSES.includes(status);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <Image src="/logo dada house.png" alt="DADA HOUSE" width={140} height={66} className="object-contain" />
          <p className="text-xs text-gray-400">Appointment {appointmentNumber}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {isTracking ? (
            <>
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="font-semibold text-gray-900">Technician On My Way</p>
                </div>
                {technicianName && (
                  <p className="text-sm text-gray-500 mt-0.5">{technicianName} is heading to your location</p>
                )}
              </div>
              <PublicTrackingMap appointmentId={appointmentId} initialLocation={initialLocation} />
            </>
          ) : (
            <div className="p-6 text-center space-y-2">
              {hasArrived ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                  <p className="font-semibold text-gray-900">Your technician has arrived</p>
                  <p className="text-sm text-gray-500">Live tracking has ended.</p>
                </>
              ) : (
                <>
                  <Clock className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="font-semibold text-gray-900">Live tracking will start soon</p>
                  <p className="text-sm text-gray-500">We&apos;ll show your technician&apos;s location once they&apos;re on the way.</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-1">
          <h3 className="font-semibold text-gray-900 text-sm">{service}</h3>
          <p className="text-sm text-gray-500">{address}</p>
        </div>

        <div className="text-center pt-2">
          <a href="tel:9106858042" className="inline-flex items-center gap-1.5 text-sm text-[#1B3FA8] font-medium">
            <Phone className="w-4 h-4" /> (910) 685-8042
          </a>
        </div>
      </div>
    </div>
  );
}
