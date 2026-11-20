"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gauge, Loader2, Play, ChevronRight } from "lucide-react";
import { COMPLAINTS, categoryInfo } from "@/lib/hvac/catalog";

type Session = {
  id: string; status: string; step: number; complaint: string | null; mode: string | null; updatedAt: string; completedAt: string | null; technicianName: string | null;
  equipment: { manufacturer?: string; modelNumber?: string; category?: string } | null;
  appointment: { id: string; appointmentNumber: string; name: string; address: string; city: string } | null;
};
type Job = { id: string; appointmentNumber: string; name: string; address: string; city: string; service: string; scheduledStart: string | null; status: string };

export default function HvacDiagnosticHome() {
  const router = useRouter();
  const [data, setData] = useState<{ sessions: Session[]; jobs: Job[] } | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/technician/hvac-diagnostic", { cache: "no-store" }).then((r) => r.json()).then(setData).catch(() => setErr("Could not load."));
  }, []);

  async function start(jobId: string) {
    setStarting(jobId); setErr("");
    const r = await fetch("/api/technician/hvac-diagnostic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointmentId: jobId }) });
    const d = await r.json().catch(() => ({}));
    setStarting(null);
    if (!r.ok) { setErr(d.error ?? "Could not start."); return; }
    router.push(`/technician/hvac-diagnostic/${d.id}`);
  }

  if (!data) return <div className="flex justify-center py-16">{err ? <p className="text-sm text-red-600">{err}</p> : <Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" />}</div>;
  const drafts = data.sessions.filter((s) => s.status !== "COMPLETED");
  const history = data.sessions.filter((s) => s.status === "COMPLETED");
  const label = (s: Session) => [s.equipment?.manufacturer, s.equipment?.modelNumber].filter(Boolean).join(" ") || categoryInfo(s.equipment?.category)?.label || "Equipment not set";

  return (
    <div className="space-y-5 pb-6">
      <div className="rounded-2xl bg-[#0A1628] text-white p-4">
        <p className="flex items-center gap-2 text-lg font-black"><Gauge className="w-5 h-5 text-orange-400" /> DADA HVAC Diagnostic Pro</p>
        <p className="text-xs text-white/60 mt-0.5">Measure. Analyze. Diagnose. Repair.</p>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-gray-900">Start on a job</h2>
        {data.jobs.length === 0 && <p className="text-sm text-gray-500">No jobs assigned to you around today.</p>}
        {data.jobs.map((j) => (
          <button key={j.id} onClick={() => start(j.id)} disabled={!!starting} className="w-full text-left bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 active:bg-gray-50">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{j.name} <span className="text-xs text-gray-400">#{j.appointmentNumber}</span></p>
              <p className="text-xs text-gray-500 truncate">{j.service} · {j.address}, {j.city}</p>
              {j.scheduledStart && <p className="text-[11px] text-gray-400">{new Date(j.scheduledStart).toLocaleString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>}
            </div>
            {starting === j.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-[#1B3FA8]" />}
          </button>
        ))}
      </section>

      {drafts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-900">Resume ({drafts.length})</h2>
          {drafts.map((s) => (
            <Link key={s.id} href={`/technician/hvac-diagnostic/${s.id}`} className="bg-white rounded-xl border border-amber-200 p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{s.appointment?.name ?? "—"} · {label(s)}</p>
                <p className="text-xs text-gray-500">{s.complaint ? COMPLAINTS[s.complaint as keyof typeof COMPLAINTS] : "Complaint not set"} · step {s.step} · {s.status === "ANALYZED" ? "analyzed" : "draft"}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-gray-900">History</h2>
        {history.length === 0 && <p className="text-sm text-gray-500">No completed diagnostics yet.</p>}
        {history.map((s) => (
          <Link key={s.id} href={`/technician/hvac-diagnostic/${s.id}`} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{s.appointment?.name ?? "—"} · {label(s)}</p>
              <p className="text-xs text-gray-500">{s.completedAt ? new Date(s.completedAt).toLocaleDateString("en-US", { timeZone: "America/New_York" }) : ""}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        ))}
      </section>
    </div>
  );
}
