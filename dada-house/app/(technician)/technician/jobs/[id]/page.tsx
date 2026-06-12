"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Phone, Navigation, MapPin, Clock, AlertTriangle, ChevronRight,
  FileText, Camera, CheckSquare, Package, CreditCard, Shield, Timer,
  StickyNote, MessageSquare, Star, Loader2, Send,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

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
  zipCode: string; description?: string; preferredDate?: string;
  preferredTime?: string; techStatus?: string; status: string;
  priority: string; isEmergency: boolean; diagnosticFee?: number;
  diagnosticFeeStatus?: string; adminNotes?: string; signatureUrl?: string;
  photos: string[];
  diagnosisForm?: { id: string; problemFound: string };
  jobPhotos?: { id: string; url: string; category: string }[];
  payments?: { id: string; amount: number; method: string }[];
  checklist?: { items: unknown[] };
  timeLog?: { arrivedAt?: string; completedAt?: string; totalMinutes?: number };
  parts?: { id: string; partName: string; totalCost: number }[];
  invoice?: { id: string; amount: number; status: string };
};

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
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [sendingReview, setSendingReview] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.job) setJob(d.job); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="space-y-4 pb-4">
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

      {/* Customer card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm">Customer</h3>
        <p className="font-medium text-gray-800">{job.name}</p>
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
        {job.adminNotes && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
            <span className="font-semibold">Admin note:</span> {job.adminNotes}
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
        <div className="grid grid-cols-2 gap-2 pt-1">
          <a
            href={`tel:${job.phone}`}
            className="flex items-center justify-center gap-2 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold"
          >
            <Phone className="w-4 h-4" /> Call
          </a>
          <a
            href={`sms:${job.phone}`}
            className="flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold"
          >
            <MessageSquare className="w-4 h-4" /> Text
          </a>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(`${job.address}, ${job.city} ${job.zipCode}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold"
          >
            <Navigation className="w-4 h-4" /> Google Maps
          </a>
          <a
            href={`maps://maps.apple.com/?q=${encodeURIComponent(`${job.address}, ${job.city} ${job.zipCode}`)}`}
            className="flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold border border-gray-200"
          >
            <MapPin className="w-4 h-4" /> Apple Maps
          </a>
        </div>
      </div>

      {/* Quick actions grid */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Job Tools</p>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACTIONS.map(({ href, label, icon: Icon, color }) => {
            const hasData =
              (href === "diagnosis" && job.diagnosisForm) ||
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

      {/* Estimate link */}
      <Link
        href={`/technician/estimates/new?appointmentId=${id}`}
        className="flex items-center justify-between p-4 bg-[#F7921A]/10 border border-[#F7921A]/30 rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-[#F7921A]" />
          <span className="font-semibold text-[#F7921A] text-sm">Create / View Estimate</span>
        </div>
        <ChevronRight className="w-4 h-4 text-[#F7921A]" />
      </Link>
    </div>
  );
}
