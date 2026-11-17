"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Loader2, Search, Snowflake, Flame, PlusCircle, ExternalLink, Ban, RotateCcw, AlertTriangle, MessageSquare } from "lucide-react";

type Visit = {
  id: string; state: "OVERDUE" | "DUE_NOW" | "UPCOMING" | "SCHEDULED" | "COMPLETED" | "SKIPPED";
  visitNumber: number; season: string; seasonLabel: string; windowStart: string; windowEnd: string; completedAt: string | null; notes: string | null;
  contractStatus: string; membershipNumber: string | null; plan: string; systems: number;
  customer: { id: string; name: string; phone: string; address: string };
  job: { id: string; number: string; status: string; scheduledStart: string | null; technician: string | null } | null;
};
type Data = { visits: Visit[]; counts: Record<Visit["state"], number>; members: number };

const TZ = "America/New_York";
const d = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" });
const dt = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const TABS: { key: Visit["state"]; label: string; cls: string }[] = [
  { key: "OVERDUE", label: "Overdue", cls: "bg-red-100 text-red-800" },
  { key: "DUE_NOW", label: "Due now", cls: "bg-orange-100 text-orange-800" },
  { key: "UPCOMING", label: "Upcoming", cls: "bg-blue-100 text-blue-800" },
  { key: "SCHEDULED", label: "Job created", cls: "bg-purple-100 text-purple-800" },
  { key: "COMPLETED", label: "Completed", cls: "bg-green-100 text-green-800" },
  { key: "SKIPPED", label: "Skipped", cls: "bg-gray-100 text-gray-600" },
];

export default function MaintenanceScheduler() {
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Visit["state"]>("DUE_NOW");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean; jobId?: string } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/dispatch/maintenance", { cache: "no-store" });
    if (!r.ok) { setError("Could not load maintenance visits."); return; }
    const d: Data = await r.json();
    setData(d);
    return d;
  }, []);

  useEffect(() => {
    load().then((d) => { if (d && !d.counts.DUE_NOW && d.counts.OVERDUE) setTab("OVERDUE"); });
  }, [load]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.visits ?? []).filter((v) => v.state === tab && (!s || `${v.customer.name} ${v.customer.phone} ${v.customer.address} ${v.membershipNumber ?? ""}`.toLowerCase().includes(s)));
  }, [data, tab, q]);

  async function act(v: Visit, action: "create_job" | "skip" | "reopen" | "text") {
    let note: string | undefined;
    if (action === "text" && !confirm(`Text ${v.customer.name} (${v.customer.phone}) to book their ${v.seasonLabel.toLowerCase()}?`)) return;
    if (action === "skip") {
      note = prompt("Reason for skipping this visit (e.g. customer declined, no access):") ?? undefined;
      if (!note) return;
    }
    setBusy(v.id); setMsg(null);
    try {
      const r = await fetch(`/api/dispatch/maintenance/${v.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note }) });
      const res = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ text: res.error ?? "Action failed", error: true }); return; }
      if (action === "text") setMsg({ text: `Text sent to ${v.customer.name}.` });
      if (action === "create_job") setMsg({ text: `Job #${res.appointmentNumber} created for ${v.customer.name} — it's in "Needs scheduling" on the board.`, jobId: res.jobId });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function createAll() {
    const targets = list.filter((v) => !v.job);
    if (!targets.length || !confirm(`Create ${targets.length} maintenance job${targets.length > 1 ? "s" : ""}? They go to the "Needs scheduling" list on the Dispatch Board.`)) return;
    setBusy("all"); setMsg(null);
    let ok = 0; const errors: string[] = [];
    for (const v of targets) {
      const r = await fetch(`/api/dispatch/maintenance/${v.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_job" }) });
      if (r.ok) ok++; else errors.push(`${v.customer.name}: ${(await r.json().catch(() => ({}))).error ?? "failed"}`);
    }
    setMsg({ text: `${ok} job${ok === 1 ? "" : "s"} created.${errors.length ? ` Not created: ${errors.join("; ")}` : ""}`, error: errors.length > 0 });
    setBusy(null);
    load();
  }

  if (!data) return <div className="p-6 flex justify-center text-gray-500">{error ? <p className="text-red-600">{error}</p> : <Loader2 className="animate-spin" />}</div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><CalendarCheck size={24} className="text-[#1B3FA8]" /> Maintenance Visits</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data.members} active membership{data.members === 1 ? "" : "s"} · 2 tune-ups per contract year: spring AC (Mar–May) and fall heating (Sep–Nov).
          </p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search member, phone, address" className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm w-64" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 rounded-lg text-sm font-bold border ${tab === t.key ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}>
            {t.label} <span className={`ml-1 px-1.5 py-0.5 rounded text-[11px] ${tab === t.key ? "bg-white/20" : t.cls}`}>{data.counts[t.key] ?? 0}</span>
          </button>
        ))}
        {(tab === "OVERDUE" || tab === "DUE_NOW" || tab === "UPCOMING") && list.some((v) => !v.job) && (
          <button onClick={createAll} disabled={busy === "all"} className="ml-auto px-3 py-2 rounded-lg bg-[#F7921A] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {busy === "all" ? <Loader2 size={15} className="animate-spin" /> : <PlusCircle size={15} />} Create jobs for all {list.filter((v) => !v.job).length}
          </button>
        )}
      </div>

      {msg && (
        <p className={`text-sm rounded-lg px-3 py-2 ${msg.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>
          {msg.text}{" "}
          {msg.jobId && <Link href={`/dispatcher/board?job=${msg.jobId}`} className="font-bold underline">Schedule it now</Link>}
        </p>
      )}

      {list.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
          {data.members === 0 ? "No active maintenance memberships yet. Visits appear here as soon as a membership is paid/active." : "Nothing in this list."}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {list.map((v) => {
            const Icon = v.season === "SPRING_AC" ? Snowflake : Flame;
            return (
              <div key={v.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${v.season === "SPRING_AC" ? "bg-sky-50 text-sky-600" : "bg-orange-50 text-orange-600"}`}><Icon size={18} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-gray-900">{v.customer.name || "Member"}</p>
                    <span className="text-xs text-gray-500">{v.plan}{v.membershipNumber ? ` · #${v.membershipNumber}` : ""}</span>
                    {v.contractStatus === "PAST_DUE" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle size={10} /> Payment past due</span>}
                  </div>
                  <p className="text-sm text-gray-700">Visit {v.visitNumber} of 2 · {v.seasonLabel} · {v.systems} system{v.systems > 1 ? "s" : ""}</p>
                  <p className="text-xs text-gray-500">{v.customer.address || "No address on file"} · {v.customer.phone}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Window {d(v.windowStart)} – {d(v.windowEnd)}
                    {v.completedAt && <span className="text-green-700"> · completed {d(v.completedAt)}</span>}
                    {v.notes && <span className="text-gray-400"> · {v.notes}</span>}
                  </p>
                  {v.job && (
                    <p className="text-xs mt-0.5">
                      <Link href={`/dispatcher/board?job=${v.job.id}`} className="font-semibold text-[#1B3FA8] hover:underline">#{v.job.number}</Link>{" "}
                      {v.job.scheduledStart ? `${dt(v.job.scheduledStart)}${v.job.technician ? ` · ${v.job.technician}` : " · no technician yet"}` : "waiting to be scheduled"}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {!v.job && v.state !== "COMPLETED" && v.state !== "SKIPPED" && (
                    <>
                      <button onClick={() => act(v, "create_job")} disabled={!!busy} className="px-3 py-2 rounded-lg bg-[#1B3FA8] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
                        {busy === v.id ? <Loader2 size={13} className="animate-spin" /> : <PlusCircle size={13} />} Create job
                      </button>
                      <button onClick={() => act(v, "text")} disabled={!!busy} title="Text the member to book" className="px-2.5 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1"><MessageSquare size={13} /> Text</button>
                      <button onClick={() => act(v, "skip")} disabled={!!busy} title="Skip (manager)" className="px-2.5 py-2 rounded-lg border border-gray-200 text-gray-500 text-xs font-bold flex items-center gap-1"><Ban size={13} /> Skip</button>
                    </>
                  )}
                  {v.job && (
                    <Link href={`/dispatcher/board?job=${v.job.id}`} className="px-3 py-2 rounded-lg border border-gray-200 text-[#1B3FA8] text-xs font-bold flex items-center gap-1.5"><ExternalLink size={13} /> Open job</Link>
                  )}
                  {v.state === "SKIPPED" && (
                    <button onClick={() => act(v, "reopen")} disabled={!!busy} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5"><RotateCcw size={13} /> Reopen</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
