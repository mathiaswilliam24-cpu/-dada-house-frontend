"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Phone, Navigation, MapPin, AlertTriangle, ChevronRight, ChevronDown,
  FileText, Camera, CheckSquare, Package, CreditCard, Shield, Timer,
  StickyNote, MessageSquare, Star, Loader2, Send, Play, Pause, Hash, CalendarClock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CallButton, MessageButton } from "@/components/technician/call-sms-actions";

const ALL_STATUSES = [
  "ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "DIAGNOSING",
  "WAITING_FOR_APPROVAL", "WORKING", "COMPLETED", "CANCELED", "NEED_RESCHEDULE",
] as const;

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: "Assigned", ACCEPTED: "Accepted", EN_ROUTE: "On my way",
  ARRIVED: "Arrived", DIAGNOSING: "Diagnosing",
  WAITING_FOR_APPROVAL: "Waiting Approval", WORKING: "Working",
  COMPLETED: "Completed", CANCELED: "Canceled", NEED_RESCHEDULE: "Reschedule",
};

const STATUS_COLOR: Record<string, string> = {
  ASSIGNED: "bg-gray-100 text-gray-700", ACCEPTED: "bg-blue-50 text-blue-700",
  EN_ROUTE: "bg-indigo-100 text-indigo-800", ARRIVED: "bg-purple-100 text-purple-800",
  DIAGNOSING: "bg-yellow-100 text-yellow-800",
  WAITING_FOR_APPROVAL: "bg-orange-100 text-orange-800",
  WORKING: "bg-blue-100 text-blue-800", COMPLETED: "bg-green-100 text-green-800",
  CANCELED: "bg-red-100 text-red-700", NEED_RESCHEDULE: "bg-pink-100 text-pink-700",
};

type Job = {
  id: string; appointmentNumber: string; service: string; subservice?: string;
  name: string; phone: string; email: string; address: string; city: string;
  zipCode: string; taxCounty?: string | null; description?: string; preferredDate?: string;
  preferredTime?: string; techStatus?: string; status: string;
  priority: string; isEmergency: boolean; diagnosticFee?: number;
  diagnosticFeeStatus?: string; adminNotes?: string; signatureUrl?: string;
  photos: string[];
  diagnosisForm?: { id: string; problemFound: string };
  serviceDiagnostic?: { completedAt: string | null };
  jobPhotos?: { id: string; url: string; category: string }[];
  payments?: { id: string; amount: number; method: string }[];
  checklist?: { items: unknown[] };
  timeLog?: { arrivedAt?: string; completedAt?: string; totalMinutes?: number; timerStartedAt?: string | null; accumulatedSeconds?: number };
  parts?: { id: string; partName: string; totalCost: number }[];
  invoice?: { id: string; amount: number; status: string };
};

type EstimateSummary = { id: string; estimateNumber: string; total: number; status: string; isInvoice: boolean };

const QUICK_ACTIONS = [
  { href: "diagnosis", label: "Diagnosis", icon: FileText, color: "bg-blue-50 text-blue-700 border-blue-200" },
  { href: "photos", label: "Photos", icon: Camera, color: "bg-purple-50 text-purple-700 border-purple-200" },
  { href: "checklist", label: "Checklist", icon: CheckSquare, color: "bg-green-50 text-green-700 border-green-200" },
  { href: "parts", label: "Parts", icon: Package, color: "bg-orange-50 text-orange-700 border-orange-200" },
  { href: "payment", label: "Payment", icon: CreditCard, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { href: "warranty", label: "Warranty", icon: Shield, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { href: "time", label: "Time Log", icon: Timer, color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
];

export default function TechJobDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [estimate, setEstimate] = useState<EstimateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [sendingReview, setSendingReview] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [togglingTimer, setTogglingTimer] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showPinnedNote, setShowPinnedNote] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.job) setJob(d.job); if (d.estimate) setEstimate(d.estimate); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const timerRunning = !!job?.timeLog?.timerStartedAt;
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  async function toggleTimer() {
    if (togglingTimer) return;
    setTogglingTimer(true);
    const action = timerRunning ? "pause" : "play";
    const res = await fetch(`/api/technician/jobs/${id}/time-log`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const d = await res.json();
      setJob((prev) => prev ? { ...prev, timeLog: { ...prev.timeLog, ...d.timeLog } } : prev);
    }
    setTogglingTimer(false);
  }

  async function updateStatus(status: string) {
    if (updating) return;
    setUpdating(true);
    const res = await fetch(`/api/technician/jobs/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const d = await res.json();
      setJob((prev) => prev ? { ...prev, techStatus: d.appointment.techStatus, status: d.appointment.status } : prev);
    }
    setUpdating(false);
  }

  async function saveNote() {
    if (!note.trim()) return;
    setSavingNote(true);
    await fetch(`/api/technician/jobs/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: note }),
    });
    setNote("");
    setSavingNote(false);
    alert("Note saved!");
  }

  async function sendReviewRequest() {
    setSendingReview(true);
    await fetch(`/api/technician/jobs/${id}/review-request`, { method: "POST" });
    setSendingReview(false);
    alert("Review request sent!");
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;
  }
  if (!job) {
    return <div className="text-center py-16 text-gray-400">Job not found</div>;
  }

  const isEmergency = job.isEmergency || job.priority === "EMERGENCY";
  const currentStepIdx = job.techStatus
    ? ALL_STATUSES.indexOf(job.techStatus as typeof ALL_STATUSES[number])
    : -1;

  const partsTotal = (job.parts ?? []).reduce((s, p) => s + p.totalCost, 0);
  const paymentsTotal = (job.payments ?? []).reduce((s, p) => s + p.amount, 0);

  const accumulatedSeconds = job.timeLog?.accumulatedSeconds ?? 0;
  const runningSeconds = timerRunning && job.timeLog?.timerStartedAt
    ? Math.max(0, Math.round((nowTick - new Date(job.timeLog.timerStartedAt).getTime()) / 1000))
    : 0;
  const billableHours = ((accumulatedSeconds + runningSeconds) / 3600).toFixed(2);

  return (
    <div className="space-y-4 pb-4">
      {/* Billable hours timer */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
        <button
          onClick={toggleTimer}
          disabled={togglingTimer}
          className={`w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-60 ${timerRunning ? "bg-[#1B3FA8]" : "bg-gray-300"}`}
          title={timerRunning ? "Pause" : "Start"}
        >
          {togglingTimer ? <Loader2 className="w-4 h-4 animate-spin" /> : timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1">
          <p className="text-xs text-gray-500">Billable hours</p>
          <p className="text-lg font-bold text-[#1B3FA8]">{billableHours}</p>
        </div>
      </div>

      {/* Secondary nav (mirrors the sidebar tabs: History / Forms / Invoice) */}
      <div className="grid grid-cols-3 gap-2">
        <Link href={`/technician/jobs/${id}/history`} className="flex items-center justify-center py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-[#1B3FA8]">
          History
        </Link>
        <Link href={`/technician/jobs/${id}/forms`} className="flex items-center justify-center py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-[#1B3FA8]">
          Forms
        </Link>
        <Link href={`/technician/jobs/${id}/invoice`} className="flex items-center justify-center py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-[#1B3FA8]">
          Invoice
        </Link>
      </div>

      {/* Back + header */}
      <div>
        <Link href="/technician/jobs" className="text-sm text-gray-500">← Jobs</Link>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{job.service}</h1>
            <p className="text-xs text-gray-500 font-mono">{job.appointmentNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            {isEmergency && (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">
                <AlertTriangle className="w-3 h-3" /> EMERGENCY
              </span>
            )}
            {job.priority !== "NORMAL" && !isEmergency && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold">
                {job.priority}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Location / Bill To + Scheduled / Job# */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Location / Bill To</p>
          <div className="flex items-center gap-2.5 mt-1.5">
            <div className="w-9 h-9 rounded-full bg-[#1B3FA8] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {job.name.charAt(0).toUpperCase()}
            </div>
            <p className="font-bold text-gray-900">{job.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1"><CalendarClock className="w-3 h-3" /> Scheduled</p>
            <p className="text-sm text-gray-800 mt-1">
              {job.preferredDate ? formatDate(job.preferredDate) : "Not set"}{job.preferredTime ? ` · ${job.preferredTime}` : ""}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1"><Hash className="w-3 h-3" /> Job #</p>
            <p className="text-sm text-gray-800 font-mono mt-1">{job.appointmentNumber}</p>
          </div>
        </div>

        <button
          onClick={() => setShowContact((v) => !v)}
          className="flex items-center justify-between w-full pt-2 border-t border-gray-100 text-sm font-semibold text-[#1B3FA8]"
        >
          Contact details
          <ChevronDown className={`w-4 h-4 transition-transform ${showContact ? "rotate-180" : ""}`} />
        </button>
        {showContact && (
          <div className="space-y-1.5 text-sm text-gray-600 pb-1">
            <p>{job.phone}</p>
            {job.email && <p>{job.email}</p>}
          </div>
        )}
      </div>

      {/* Type & service area */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Type</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{job.service}{job.subservice ? `: ${job.subservice}` : ""}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Service Area</p>
          <p className="text-sm text-gray-800 mt-1">{job.city}</p>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Tax Zone</p>
          <p className="text-sm text-gray-800 mt-1">{job.taxCounty ?? "—"}</p>
        </div>
        {(job.preferredDate || job.preferredTime) && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Arrival Window</p>
            <p className="text-sm text-gray-800 mt-1">
              {job.preferredDate ? formatDate(job.preferredDate) : ""}{job.preferredTime ? ` · ${job.preferredTime}` : ""}
            </p>
          </div>
        )}
      </div>

      {/* Address + directions */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Address</p>
        <div className="flex items-start gap-1.5 text-sm text-gray-800">
          <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <span>{job.address}, {job.city} {job.zipCode}</span>
        </div>
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(`${job.address}, ${job.city} ${job.zipCode}`)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-bold"
        >
          <Navigation className="w-4 h-4" /> Get Directions
        </a>
        <div className="grid grid-cols-2 gap-2">
          <CallButton jobId={id} className="flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold w-full">
            <Phone className="w-4 h-4" /> Call
          </CallButton>
          <MessageButton jobId={id} className="flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold w-full">
            <MessageSquare className="w-4 h-4" /> Text
          </MessageButton>
        </div>
      </div>

      {/* Recommended estimates / Pinned notes */}
      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        <Link href={estimate ? `/technician/estimates/${estimate.id}` : `/technician/estimates/new?appointmentId=${id}`} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2.5">
            <Star className="w-4 h-4 text-[#F7921A]" />
            <span className="text-sm font-semibold text-gray-800">Recommended estimates</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="text-sm">{estimate ? 1 : 0}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>
        <button onClick={() => setShowPinnedNote((v) => !v)} className="flex items-center justify-between w-full p-4">
          <div className="flex items-center gap-2.5">
            <StickyNote className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-semibold text-gray-800">Pinned notes</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="text-sm">{job.adminNotes ? 1 : 0}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showPinnedNote ? "rotate-180" : ""}`} />
          </div>
        </button>
        {showPinnedNote && (
          <div className="p-4 pt-0">
            {job.adminNotes ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">{job.adminNotes}</div>
            ) : (
              <p className="text-sm text-gray-400">No pinned notes from dispatch.</p>
            )}
          </div>
        )}
      </div>

      {/* Status stepper */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Update Status</p>
        <div className="grid grid-cols-2 gap-2">
          {ALL_STATUSES.filter(s => !["CANCELED", "NEED_RESCHEDULE"].includes(s)).map((step, idx) => {
            const isActive = job.techStatus === step;
            const isDone = currentStepIdx > idx && currentStepIdx < 8;
            return (
              <button
                key={step}
                onClick={() => updateStatus(step)}
                disabled={updating}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all disabled:opacity-60 text-left ${
                  isActive
                    ? "bg-[#1B3FA8] text-white"
                    : isDone
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {STATUS_LABEL[step]}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {(["CANCELED", "NEED_RESCHEDULE"] as const).map((step) => (
            <button
              key={step}
              onClick={() => updateStatus(step)}
              disabled={updating}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all disabled:opacity-60 ${
                job.techStatus === step
                  ? "bg-red-500 text-white"
                  : "bg-red-50 text-red-600 hover:bg-red-100"
              }`}
            >
              {STATUS_LABEL[step]}
            </button>
          ))}
        </div>
        {job.techStatus && (
          <div className={`mt-3 text-xs px-3 py-1.5 rounded-lg text-center font-semibold ${STATUS_COLOR[job.techStatus]}`}>
            Current: {STATUS_LABEL[job.techStatus] ?? job.techStatus}
          </div>
        )}
      </div>

      {/* Job description + diagnostic fee */}
      {(job.description || job.diagnosticFee) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          {job.description && (
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1.5">Description</h3>
              <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600">{job.description}</div>
            </div>
          )}
          {job.diagnosticFee && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Diagnostic Fee</span>
              <span className={`font-semibold ${job.diagnosticFeeStatus === "PAID" ? "text-green-600" : "text-orange-600"}`}>
                ${job.diagnosticFee} — {job.diagnosticFeeStatus ?? "Pending"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick actions grid */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Job Tools</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon, color }) => {
            const hasData =
              (href === "diagnosis" && !!job.serviceDiagnostic?.completedAt) ||
              (href === "photos" && (job.jobPhotos?.length ?? 0) > 0) ||
              (href === "checklist" && job.checklist) ||
              (href === "parts" && (job.parts?.length ?? 0) > 0) ||
              (href === "payment" && (job.payments?.length ?? 0) > 0) ||
              (href === "time" && job.timeLog);
            return (
              <Link
                key={href}
                href={`/technician/jobs/${id}/${href}`}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-center ${color} relative`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{label}</span>
                {hasData && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Summary strip */}
      {(partsTotal > 0 || paymentsTotal > 0 || job.invoice) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
          <h3 className="font-semibold text-gray-900 text-sm">Financial Summary</h3>
          {partsTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Parts cost</span>
              <span className="font-medium text-gray-900">${partsTotal.toFixed(2)}</span>
            </div>
          )}
          {job.invoice && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Invoice</span>
              <span className={`font-semibold ${job.invoice.status === "PAID" ? "text-green-600" : "text-orange-600"}`}>
                ${job.invoice.amount} — {job.invoice.status}
              </span>
            </div>
          )}
          {paymentsTotal > 0 && (
            <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2">
              <span className="text-gray-700">Collected</span>
              <span className="text-green-600">${paymentsTotal.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Customer photos (uploaded with booking) */}
      {job.photos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Customer Photos</h3>
          <div className="grid grid-cols-3 gap-2">
            {job.photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="Photo" className="w-full h-24 object-cover rounded-lg" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Internal notes */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-yellow-500" /> Internal Notes
        </h3>
        <p className="text-xs text-gray-500">Visible to admin and dispatcher only</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Add work notes, observations, issues found…"
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
        />
        <button
          onClick={saveNote}
          disabled={savingNote || !note.trim()}
          className="w-full py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold disabled:opacity-40"
        >
          {savingNote ? "Saving…" : "Save Note"}
        </button>
      </div>

      {/* Review request (only when completed) */}
      {job.techStatus === "COMPLETED" && (
        <div className="bg-gradient-to-r from-[#1B3FA8] to-[#2952CC] rounded-2xl p-4 text-white space-y-2">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-300" />
            <h3 className="font-semibold">Request a Review</h3>
          </div>
          <p className="text-sm text-blue-200">Send an automatic review request to the customer</p>
          <button
            onClick={sendReviewRequest}
            disabled={sendingReview}
            className="flex items-center gap-2 px-4 py-2 bg-white text-[#1B3FA8] rounded-xl text-sm font-bold disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            {sendingReview ? "Sending…" : "Send Review Request"}
          </button>
        </div>
      )}

    </div>
  );
}
