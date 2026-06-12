"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Phone, Navigation, MapPin, Clock, AlertTriangle, MessageSquare,
  Loader2, ChevronRight, CheckCircle, PlayCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { TECH_STATUS_LABEL, TECH_STATUS_COLOR } from "@/lib/tech-status";
import ElapsedTimer from "@/components/technician/elapsed-timer";
import { setActiveJobStatus } from "@/components/technician/location-tracker";

type Job = {
  id: string; appointmentNumber: string; service: string;
  name: string; phone: string; address: string; city: string;
  zipCode: string; description?: string; preferredDate?: string;
  preferredTime?: string; techStatus?: string | null; status: string;
  priority: string; isEmergency: boolean;
  timeLog?: { enRouteAt?: string; arrivedAt?: string; totalMinutes?: number } | null;
};

const PRE_ROUTE_STATUSES = new Set([null, undefined, "ASSIGNED", "ACCEPTED"]);
const WORKING_STATUSES = new Set(["ARRIVED", "DIAGNOSING", "WAITING_FOR_APPROVAL", "WORKING"]);

export default function StartJobPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.job) setJob(d.job); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(status: string) {
    if (updating) return false;
    setUpdating(true);
    const res = await fetch(`/api/technician/jobs/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setActiveJobStatus(status);
      load();
    }
    setUpdating(false);
    return res.ok;
  }

  function handleNavigateClick() {
    if (PRE_ROUTE_STATUSES.has(job?.techStatus ?? null)) {
      updateStatus("EN_ROUTE");
    }
  }

  function goToWork() {
    router.push(`/technician/jobs/${id}/work`);
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;
  }
  if (!job) {
    return <div className="text-center py-16 text-gray-400">Job not found</div>;
  }

  const isEmergency = job.isEmergency || job.priority === "EMERGENCY";
  const status = job.techStatus ?? null;
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(`${job.address}, ${job.city} ${job.zipCode}`)}`;

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div>
        <Link href="/technician" className="text-sm text-gray-500">← Dashboard</Link>
        <div className="flex items-start justify-between mt-1 gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{job.service}</h1>
            <p className="text-xs text-gray-500 font-mono">{job.appointmentNumber}</p>
          </div>
          {isEmergency && (
            <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold shrink-0">
              <AlertTriangle className="w-3 h-3" /> EMERGENCY
            </span>
          )}
        </div>
        {status && (
          <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full font-bold ${TECH_STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600"}`}>
            {TECH_STATUS_LABEL[status] ?? status}
          </span>
        )}
      </div>

      {/* Customer info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm">Customer</h3>
        <p className="font-medium text-gray-800 text-lg">{job.name}</p>
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
          {job.address}, {job.city} {job.zipCode}
        </div>
        {(job.preferredDate || job.preferredTime) && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock className="w-4 h-4 text-gray-400" />
            {job.preferredDate ? formatDate(job.preferredDate) : ""} {job.preferredTime ?? ""}
          </div>
        )}
        {job.description && (
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">{job.description}</div>
        )}

        <div className="grid grid-cols-3 gap-2 pt-1">
          <a
            href={`tel:${job.phone}`}
            className="flex flex-col items-center justify-center gap-1 py-3 bg-[#1B3FA8] text-white rounded-xl text-xs font-semibold"
          >
            <Phone className="w-5 h-5" /> Call
          </a>
          <a
            href={`sms:${job.phone}`}
            className="flex flex-col items-center justify-center gap-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold"
          >
            <MessageSquare className="w-5 h-5" /> Message
          </a>
          <a
            href={mapsUrl}
            target="_blank" rel="noopener noreferrer"
            onClick={handleNavigateClick}
            className="flex flex-col items-center justify-center gap-1 py-3 bg-blue-50 text-[#1B3FA8] rounded-xl text-xs font-semibold"
          >
            <Navigation className="w-5 h-5" /> Navigate
          </a>
        </div>
      </div>

      {/* Primary action based on status */}
      {PRE_ROUTE_STATUSES.has(status) && (
        <div className="bg-[#1B3FA8] rounded-2xl p-5 text-white text-center space-y-2">
          <Navigation className="w-8 h-8 mx-auto" />
          <p className="font-bold text-lg">Ready to head out?</p>
          <p className="text-sm text-blue-200">Tap Navigate above to start your trip — this begins the job timer.</p>
        </div>
      )}

      {status === "EN_ROUTE" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">On The Way</p>
          {job.timeLog?.enRouteAt && (
            <ElapsedTimer since={job.timeLog.enRouteAt} className="block text-3xl font-black font-mono text-[#1B3FA8]" />
          )}
          <button
            onClick={() => updateStatus("ARRIVED")}
            disabled={updating}
            className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold text-lg disabled:opacity-60"
          >
            I've Arrived
          </button>
        </div>
      )}

      {WORKING_STATUSES.has(status ?? "") && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Time On Job</p>
          {(job.timeLog?.enRouteAt || job.timeLog?.arrivedAt) && (
            <ElapsedTimer
              since={job.timeLog!.enRouteAt ?? job.timeLog!.arrivedAt!}
              className="block text-3xl font-black font-mono text-[#1B3FA8]"
            />
          )}
          <button
            onClick={goToWork}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-5 h-5" /> {status === "ARRIVED" ? "Start Work" : "Continue Work"}
          </button>
        </div>
      )}

      {status === "COMPLETED" && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center space-y-2">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
          <p className="font-bold text-green-700">Job Completed</p>
          {job.timeLog?.totalMinutes != null && (
            <p className="text-sm text-green-600">
              Total time: {Math.floor(job.timeLog.totalMinutes / 60)}h {job.timeLog.totalMinutes % 60}m
            </p>
          )}
          <Link href="/technician" className="inline-block mt-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold">
            Back to Dashboard
          </Link>
        </div>
      )}

      {/* Advanced / manual override */}
      <Link href={`/technician/jobs/${id}`} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-2xl">
        <span className="text-sm font-semibold text-gray-700">Advanced / Job Tools</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </Link>
    </div>
  );
}
