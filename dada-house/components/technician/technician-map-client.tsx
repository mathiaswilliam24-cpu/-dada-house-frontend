"use client";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

type Job = { id: string; address: string; city: string; zipCode: string; service: string; preferredTime?: string | null };

export default function TechnicianMapClient({ jobs }: { jobs: Job[] }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey });

  if (!apiKey) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <p className="text-sm text-gray-500">Map not configured. Your jobs today:</p>
        {jobs.map((job, i) => (
          <a key={job.id} href={`https://maps.google.com/?q=${encodeURIComponent(`${job.address}, ${job.city}`)}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
            <span className="w-6 h-6 bg-[#1B3FA8] text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
            <div>
              <p className="text-sm font-medium text-gray-900">{job.service}</p>
              <p className="text-xs text-gray-500">{job.address}, {job.city}</p>
            </div>
          </a>
        ))}
      </div>
    );
  }

  if (!isLoaded) return <div className="h-80 flex items-center justify-center text-gray-400">Loading map…</div>;

  return (
    <div className="space-y-3">
      <div className="h-80 rounded-xl overflow-hidden border border-gray-200">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={{ lat: 29.7604, lng: -95.3698 }}
          zoom={11}
        />
      </div>
      <div className="space-y-2">
        {jobs.map((job, i) => (
          <a key={job.id} href={`https://maps.google.com/?q=${encodeURIComponent(`${job.address}, ${job.city} ${job.zipCode}`)}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3">
            <span className="w-7 h-7 bg-[#1B3FA8] text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{job.service}</p>
              <p className="text-xs text-gray-500 truncate">{job.address}</p>
            </div>
            {job.preferredTime && <span className="text-xs text-gray-400 shrink-0">{job.preferredTime}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
