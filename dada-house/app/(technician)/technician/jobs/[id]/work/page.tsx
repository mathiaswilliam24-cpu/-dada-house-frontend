"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2, FileText, Mail, MessageSquare,
  CreditCard, CheckCircle, ChevronRight, Trash2,
} from "lucide-react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import { setActiveJobStatus } from "@/components/technician/location-tracker";
import { formatCurrency } from "@/lib/utils";

type Photo = { id: string; url: string; category: string };
type Job = {
  id: string; appointmentNumber: string; service: string;
  diagnosisForm?: { problemFound: string } | null;
  timeLog?: { workPerformed?: string | null } | null;
  jobPhotos?: Photo[];
};
type Estimate = {
  id: string; estimateNumber: string; total: number; status: string;
  isInvoice: boolean; sentAt?: string | null;
  clientEmail?: string | null; clientPhone?: string | null;
};

export default function WorkPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [problemFound, setProblemFound] = useState("");
  const [workPerformed, setWorkPerformed] = useState("");
  const [savingProblem, setSavingProblem] = useState(false);
  const [savingWork, setSavingWork] = useState(false);
  const [savedProblem, setSavedProblem] = useState(false);
  const [savedWork, setSavedWork] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [ending, setEnding] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.job) {
          setJob(d.job);
          setPhotos(d.job.jobPhotos ?? []);
          setProblemFound(d.job.diagnosisForm?.problemFound ?? "");
          setWorkPerformed(d.job.timeLog?.workPerformed ?? "");
        }
        setEstimate(d.estimate ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function onUploadComplete(category: string, res: { url: string }[]) {
    for (const file of res) {
      const r = await fetch(`/api/technician/jobs/${id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: file.url, category }),
      });
      if (r.ok) {
        const d = await r.json();
        setPhotos((p) => [...p, d.photo]);
      }
    }
  }

  async function deletePhoto(photoId: string) {
    await fetch(`/api/technician/jobs/${id}/photos/${photoId}`, { method: "DELETE" });
    setPhotos((p) => p.filter((x) => x.id !== photoId));
  }

  async function saveProblem() {
    if (!problemFound.trim()) return;
    setSavingProblem(true);
    const res = await fetch(`/api/technician/jobs/${id}/diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(job?.diagnosisForm ?? {}), problemFound }),
    });
    if (res.ok) { setSavedProblem(true); setTimeout(() => setSavedProblem(false), 2000); }
    setSavingProblem(false);
  }

  async function saveWork() {
    setSavingWork(true);
    const res = await fetch(`/api/technician/jobs/${id}/time-log`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workPerformed }),
    });
    if (res.ok) { setSavedWork(true); setTimeout(() => setSavedWork(false), 2000); }
    setSavingWork(false);
  }

  async function sendInvoice(action: "email" | "sms") {
    if (!estimate) return;
    if (action === "email") setSendingEmail(true); else setSendingSms(true);
    const res = await fetch(`/api/technician/invoices/${estimate.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Failed to send invoice");
    }
    if (action === "email") setSendingEmail(false); else setSendingSms(false);
  }

  async function endJob() {
    if (ending) return;
    setEnding(true);
    const res = await fetch(`/api/technician/jobs/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    if (res.ok) {
      setActiveJobStatus(null);
      router.push("/technician");
    }
    setEnding(false);
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;
  }
  if (!job) {
    return <div className="text-center py-16 text-gray-400">Job not found</div>;
  }

  const beforePhotos = photos.filter((p) => p.category === "before");
  const afterPhotos = photos.filter((p) => p.category === "after");

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div>
        <Link href={`/technician/jobs/${id}/start`} className="text-sm text-gray-500">← Job</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">{job.service}</h1>
        <p className="text-xs text-gray-500 font-mono">{job.appointmentNumber}</p>
      </div>

      {/* BEFORE section */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-blue-600 uppercase tracking-wide">Before</h2>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Photos</p>
          {beforePhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {beforePhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <a href={photo.url} target="_blank" rel="noopener noreferrer">
                    <img src={photo.url} alt="Before" className="w-full h-24 object-cover rounded-xl" />
                  </a>
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-lg flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <UploadButton<OurFileRouter, "jobPhotos">
            endpoint="jobPhotos"
            onClientUploadComplete={(res) => onUploadComplete("before", res)}
            onUploadError={(err) => alert(err.message)}
            appearance={{
              button: "bg-[#1B3FA8] text-white font-semibold rounded-xl px-4 py-2.5 text-sm w-full after:bg-[#1A3490]",
              allowedContent: "text-xs text-gray-400",
            }}
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-900">Problem Observed</p>
          <textarea
            value={problemFound}
            onChange={(e) => setProblemFound(e.target.value)}
            rows={3}
            placeholder="Describe the problem found…"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
          />
          <button
            onClick={saveProblem}
            disabled={savingProblem || !problemFound.trim()}
            className="w-full py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            {savingProblem ? "Saving…" : savedProblem ? "Saved!" : "Save"}
          </button>
        </div>
      </section>

      {/* AFTER section */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-green-600 uppercase tracking-wide">After</h2>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Photos</p>
          {afterPhotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {afterPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <a href={photo.url} target="_blank" rel="noopener noreferrer">
                    <img src={photo.url} alt="After" className="w-full h-24 object-cover rounded-xl" />
                  </a>
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-lg flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <UploadButton<OurFileRouter, "jobPhotos">
            endpoint="jobPhotos"
            onClientUploadComplete={(res) => onUploadComplete("after", res)}
            onUploadError={(err) => alert(err.message)}
            appearance={{
              button: "bg-green-600 text-white font-semibold rounded-xl px-4 py-2.5 text-sm w-full after:bg-green-700",
              allowedContent: "text-xs text-gray-400",
            }}
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-900">Work Performed</p>
          <textarea
            value={workPerformed}
            onChange={(e) => setWorkPerformed(e.target.value)}
            rows={3}
            placeholder="Describe the work performed…"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
          />
          <button
            onClick={saveWork}
            disabled={savingWork || !workPerformed.trim()}
            className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            {savingWork ? "Saving…" : savedWork ? "Saved!" : "Save"}
          </button>
        </div>

        {/* Estimate / Invoice */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Estimate / Invoice</p>
          {estimate ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-mono text-gray-700">{estimate.estimateNumber}</p>
                <p className="text-lg font-black text-gray-900">{formatCurrency(estimate.total)}</p>
              </div>
              <Link href={`/technician/estimates/${estimate.id}`} className="text-xs text-[#1B3FA8] font-semibold flex items-center gap-1">
                Edit <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No estimate created yet.</p>
          )}

          <Link
            href={`/technician/estimates/new?appointmentId=${id}`}
            className="flex items-center justify-center gap-2 py-2.5 bg-[#F7921A]/10 text-[#F7921A] border border-[#F7921A]/30 rounded-xl text-sm font-semibold"
          >
            <FileText className="w-4 h-4" /> {estimate ? "New Estimate / Invoice" : "Create Estimate / Invoice"}
          </Link>

          {estimate?.isInvoice && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => sendInvoice("email")}
                disabled={sendingEmail || !estimate.clientEmail}
                className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-[#1B3FA8] rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                <Mail className="w-4 h-4" /> {sendingEmail ? "Sending…" : "Email Invoice"}
              </button>
              <button
                onClick={() => sendInvoice("sms")}
                disabled={sendingSms || !estimate.clientPhone}
                className="flex items-center justify-center gap-2 py-2.5 bg-purple-50 text-purple-700 rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                <MessageSquare className="w-4 h-4" /> {sendingSms ? "Sending…" : "Text Invoice"}
              </button>
            </div>
          )}
          {estimate?.isInvoice && estimate.sentAt && (
            <p className="text-xs text-gray-400 text-center">Sent {new Date(estimate.sentAt).toLocaleString()}</p>
          )}
        </div>

        {/* Payment */}
        <Link
          href={`/technician/jobs/${id}/payment`}
          className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-emerald-700" />
            <span className="font-semibold text-emerald-700 text-sm">Collect Payment</span>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-700" />
        </Link>
      </section>

      {/* End the Job */}
      <button
        onClick={endJob}
        disabled={ending}
        className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <CheckCircle className="w-5 h-5" /> {ending ? "Ending…" : "End the Job"}
      </button>
    </div>
  );
}
