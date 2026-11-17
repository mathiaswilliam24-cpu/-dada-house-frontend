"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FolderKanban, Plus, Loader2, X, Search, Check, ChevronRight, PauseCircle, PlayCircle, XCircle, PlusCircle, MessageSquarePlus, Save, CalendarClock,
} from "lucide-react";
import { PROJECT_STAGES, PROJECT_GROUPS, stageIndex, stageInfo } from "@/lib/projects";
import { JOB_TYPES, JOB_TYPE_KEYS, type JobType } from "@/lib/dispatch-catalog";

const TZ = "America/New_York";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric", year: "numeric" });
const fmtDT = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const money = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" }));
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

type Staff = { id: string; name: string | null; role: string };
type Row = {
  id: string; number: string | null; name: string; stage: string; status: string; stageUpdatedAt: string; updatedAt: string;
  customer: { id: string; name: string; phone: string }; address: string; equipmentSummary: string | null; contractAmount: number | null;
  targetDate: string | null; salesRep: string | null; leadInstaller: string | null; jobs: number;
  nextJob: { id: string; number: string; category: string | null; start: string } | null;
};

const GROUP_COLOR: Record<string, string> = { Sales: "border-t-sky-500", "Permits & equipment": "border-t-amber-500", Installation: "border-t-orange-500", Closeout: "border-t-green-600" };

export default function ProjectsPipeline() {
  const [view, setView] = useState<"open" | "closed">("open");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/dispatch/projects?view=${view}`, { cache: "no-store" });
    if (!r.ok) return;
    const d = await r.json();
    setRows(d.projects); setStaff(d.staff);
  }, [view]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("project");
    if (id) setOpenId(id);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => !s || `${r.number} ${r.name} ${r.customer.name} ${r.customer.phone} ${r.address}`.toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><FolderKanban size={24} className="text-[#1B3FA8]" /> Installation Projects</h1>
          <p className="text-sm text-gray-500 mt-1">From first visit to warranty registration — 17 stages. Jobs created from a project go to the Dispatch Board.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects" className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm w-56" />
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-semibold">
            {(["open", "closed"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-2 ${view === v ? "bg-gray-900 text-white" : "bg-white text-gray-600"}`}>{v === "open" ? "Active" : "Closed / canceled"}</button>
            ))}
          </div>
          <button onClick={() => setCreating(true)} className="px-3 py-2 rounded-lg bg-[#F7921A] text-white text-sm font-bold flex items-center gap-2"><Plus size={16} /> New project</button>
        </div>
      </div>

      {!rows ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-gray-400" /></div>
      ) : view === "closed" ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.length === 0 && <p className="p-8 text-center text-gray-500 text-sm">No closed projects.</p>}
          {filtered.map((r) => <ProjectCard key={r.id} r={r} onOpen={() => setOpenId(r.id)} wide />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {PROJECT_GROUPS.map((g) => {
            const items = filtered.filter((r) => stageInfo(r.stage).group === g);
            return (
              <div key={g} className={`bg-gray-100/70 rounded-xl border-t-4 ${GROUP_COLOR[g]} p-3`}>
                <p className="font-bold text-gray-800 text-sm mb-2">{g} <span className="text-gray-400 font-semibold">({items.length})</span></p>
                <div className="space-y-2">
                  {items.length === 0 && <p className="text-xs text-gray-400 py-4 text-center">No projects</p>}
                  {items.map((r) => <ProjectCard key={r.id} r={r} onOpen={() => setOpenId(r.id)} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {creating && <NewProject staff={staff} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); load(); setOpenId(id); }} />}
      {openId && <ProjectDrawer key={openId} id={openId} staff={staff} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}

function ProjectCard({ r, onOpen, wide }: { r: Row; onOpen: () => void; wide?: boolean }) {
  const st = stageInfo(r.stage);
  const idle = daysSince(r.stageUpdatedAt);
  return (
    <button onClick={onOpen} className={`w-full text-left bg-white ${wide ? "p-4" : "rounded-lg border border-gray-200 p-3 hover:shadow-sm"}`}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-gray-400">{r.number}</span>
        {r.status === "ON_HOLD" && <span className="text-[10px] font-bold px-1.5 rounded bg-yellow-100 text-yellow-800">ON HOLD</span>}
        {r.status === "CANCELED" && <span className="text-[10px] font-bold px-1.5 rounded bg-gray-200 text-gray-600">CANCELED</span>}
        {r.status === "COMPLETED" && <span className="text-[10px] font-bold px-1.5 rounded bg-green-100 text-green-700">CLOSED</span>}
      </div>
      <p className="font-bold text-sm text-gray-900 truncate">{r.customer.name || "Customer"}</p>
      <p className="text-xs text-gray-600 truncate">{r.name}</p>
      <p className="text-xs font-semibold text-[#1B3FA8] mt-1">{stageIndex(r.stage) + 1}/17 · {st.label}</p>
      <div className="w-full h-1 bg-gray-100 rounded mt-1"><div className="h-1 bg-[#1B3FA8] rounded" style={{ width: `${((stageIndex(r.stage) + 1) / 17) * 100}%` }} /></div>
      <p className="text-[11px] text-gray-500 mt-1.5 flex flex-wrap gap-x-2">
        {r.contractAmount != null && <span>{money(r.contractAmount)}</span>}
        {r.nextJob && <span className="text-purple-700">Next: {fmtDT(r.nextJob.start)}</span>}
        {r.status === "OPEN" && idle >= 7 && <span className="text-amber-700">{idle} days in this stage</span>}
      </p>
    </button>
  );
}

const input = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30";
const label = "block text-xs font-bold text-gray-600 mb-1";

function NewProject({ staff, onClose, onCreated }: { staff: Staff[]; onClose: () => void; onCreated: (id: string) => void }) {
  const [f, setF] = useState({ name: "", cname: "", phone: "", email: "", address: "", city: "", zip: "", equipment: "", amount: "", target: "", salesRepId: "", leadInstallerId: "", description: "" });
  const [hits, setHits] = useState<{ name: string; phone: string; email: string | null; address: string | null; city: string | null; zipCode: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const q = f.cname.trim().length >= 2 ? f.cname.trim() : f.phone.replace(/\D/g, "").length >= 4 ? f.phone.replace(/\D/g, "") : "";
    if (!q) { setHits([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/dispatcher/clients?q=${encodeURIComponent(q)}`);
      if (r.ok) setHits(((await r.json()).clients ?? []).slice(0, 6));
    }, 300);
    return () => clearTimeout(t);
  }, [f.cname, f.phone]);

  async function save() {
    setSaving(true); setErr("");
    const r = await fetch("/api/dispatch/projects", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name || `HVAC installation — ${f.cname}`,
        customer: { name: f.cname, phone: f.phone, email: f.email, address: f.address, city: f.city, zipCode: f.zip },
        equipmentSummary: f.equipment || undefined, description: f.description || undefined,
        contractAmount: f.amount ? Number(f.amount) : null, targetDate: f.target || null,
        salesRepId: f.salesRepId || null, leadInstallerId: f.leadInstallerId || null,
      }),
    });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setErr(d.error ? `${d.error}${d.path ? ` (${d.path.join(".")})` : ""}` : "Could not create project"); return; }
    onCreated(d.id);
  }

  const techs = staff.filter((s) => s.role === "TECHNICIAN");
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-black text-lg">New installation project</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="relative"><label className={label}>Customer name *</label><input className={input} value={f.cname} onChange={(e) => set("cname", e.target.value)} />
              {hits.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {hits.map((h, i) => (
                    <button key={i} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                      onClick={() => { setF((p) => ({ ...p, cname: h.name, phone: h.phone, email: h.email ?? "", address: h.address ?? "", city: h.city ?? "", zip: h.zipCode ?? "" })); setHits([]); }}>
                      <span className="font-semibold">{h.name}</span> <span className="text-gray-500">{h.phone}</span>
                      {h.address && <span className="block text-xs text-gray-400">{h.address}{h.city ? `, ${h.city}` : ""}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div><label className={label}>Phone *</label><input className={input} value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div><label className={label}>Email</label><input className={input} value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div><label className={label}>Job site address *</label><input className={input} value={f.address} onChange={(e) => set("address", e.target.value)} /></div>
            <div><label className={label}>City</label><input className={input} value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div><label className={label}>ZIP</label><input className={input} value={f.zip} onChange={(e) => set("zip", e.target.value)} /></div>
          </div>
          <div><label className={label}>Project name</label><input className={input} placeholder="e.g. 3-ton heat pump + air handler replacement" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div><label className={label}>Equipment</label><input className={input} placeholder="Brand, model, tonnage, SEER…" value={f.equipment} onChange={(e) => set("equipment", e.target.value)} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className={label}>Contract amount ($)</label><input className={input} inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value.replace(/[^0-9.]/g, ""))} /></div>
            <div><label className={label}>Target install date</label><input type="date" className={input} value={f.target} onChange={(e) => set("target", e.target.value)} /></div>
            <div><label className={label}>Sales rep</label>
              <select className={input} value={f.salesRepId} onChange={(e) => set("salesRepId", e.target.value)}>
                <option value="">—</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name || s.role}</option>)}
              </select></div>
            <div><label className={label}>Lead installer</label>
              <select className={input} value={f.leadInstallerId} onChange={(e) => set("leadInstallerId", e.target.value)}>
                <option value="">—</option>{techs.map((s) => <option key={s.id} value={s.id}>{s.name || "Technician"}</option>)}
              </select></div>
          </div>
          <div><label className={label}>Notes</label><textarea className={input} rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></div>
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
        <div className="px-5 py-3 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>
          <button onClick={save} disabled={saving || !f.cname || !f.phone || !f.address} className="px-4 py-2 rounded-lg bg-[#1B3FA8] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
            {saving && <Loader2 size={15} className="animate-spin" />} Create project
          </button>
        </div>
      </div>
    </div>
  );
}

type Detail = {
  id: string; projectNumber: string | null; name: string; description: string | null; stage: string; status: string;
  address: string | null; city: string | null; zipCode: string | null; equipmentSummary: string | null;
  contractAmount: number | null; depositAmount: number | null; permitNumber: string | null; targetDate: string | null;
  salesRepId: string | null; leadInstallerId: string | null; createdAt: string;
  customer: { id: string; name: string; phone: string; email: string | null };
  events: { id: string; type: string; message: string; userName: string | null; createdAt: string }[];
  appointments: { id: string; appointmentNumber: string; jobCategory: string | null; status: string; techStatus: string | null; scheduledStart: string | null; technician: { name: string | null } | null; assignments: { role: string; technicianId: string }[] }[];
};

function ProjectDrawer({ id, staff, onClose, onChanged }: { id: string; staff: Staff[]; onClose: () => void; onChanged: () => void }) {
  const [p, setP] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean; jobId?: string } | null>(null);
  const [note, setNote] = useState("");
  const [edit, setEdit] = useState<Record<string, string> | null>(null);
  const [jobForm, setJobForm] = useState<{ jobType: JobType; category: string; minutes: string; notes: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/dispatch/projects/${id}`, { cache: "no-store" });
    if (r.ok) setP((await r.json()).project);
    else setMsg({ text: "Project not found", error: true });
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const staffName = (sid: string | null) => (sid ? staff.find((s) => s.id === sid)?.name ?? "—" : "—");

  async function post(body: Record<string, unknown>) {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/dispatch/projects/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ text: d.error ?? "Action failed", error: true }); return false; }
      if (d.jobId) setMsg({ text: `Job #${d.appointmentNumber} created — it's in "Needs scheduling" on the board.`, jobId: d.jobId });
      await load(); onChanged();
      return true;
    } finally { setBusy(false); }
  }

  async function saveEdit() {
    if (!edit) return;
    setBusy(true);
    const num = (s: string) => (s.trim() === "" ? null : Number(s));
    const r = await fetch(`/api/dispatch/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: edit.name, equipmentSummary: edit.equipmentSummary || null, address: edit.address || null, city: edit.city || null, zipCode: edit.zipCode || null,
        contractAmount: num(edit.contractAmount), depositAmount: num(edit.depositAmount), permitNumber: edit.permitNumber || null,
        targetDate: edit.targetDate || null, salesRepId: edit.salesRepId || null, leadInstallerId: edit.leadInstallerId || null, description: edit.description || null,
      }),
    });
    setBusy(false);
    if (!r.ok) { setMsg({ text: (await r.json().catch(() => ({}))).error ?? "Could not save", error: true }); return; }
    setEdit(null); load(); onChanged();
  }

  if (!p) return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white h-full flex items-center justify-center">{msg ? <p className="text-red-600">{msg.text}</p> : <Loader2 className="animate-spin" />}</div>
    </div>
  );

  const idx = stageIndex(p.stage);
  const next = PROJECT_STAGES[idx + 1];
  const closed = p.status === "CANCELED";
  const stageJob = (k: string) => (PROJECT_STAGES.find((s) => s.key === k) as { job?: { jobType: string; category: string; minutes: number } } | undefined)?.job;
  const suggested = stageJob(next?.key ?? "") ?? stageJob(p.stage);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-start justify-between z-10">
          <div>
            <p className="text-xs font-mono text-gray-400">{p.projectNumber} · {p.status.replace("_", " ")}</p>
            <h2 className="font-black text-lg text-gray-900">{p.customer.name}</h2>
            <p className="text-sm text-gray-600">{p.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-6">
          {msg && (
            <p className={`text-sm rounded-lg px-3 py-2 ${msg.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`}>
              {msg.text} {msg.jobId && <Link href={`/dispatcher/board?job=${msg.jobId}`} className="font-bold underline">Schedule it now</Link>}
            </p>
          )}

          {/* Stage */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900">Stage {idx + 1} of 17</h3>
              {!closed && next && (
                <button disabled={busy} onClick={() => post({ action: "stage", stage: next.key })} className="px-3 py-1.5 rounded-lg bg-[#1B3FA8] text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50">
                  Mark &quot;{next.label}&quot; <ChevronRight size={14} />
                </button>
              )}
            </div>
            <ol className="space-y-0.5">
              {PROJECT_STAGES.map((s, i) => {
                const done = i < idx, cur = i === idx;
                return (
                  <li key={s.key}>
                    <button disabled={busy || closed} onClick={() => { if (!cur && confirm(`Move this project to "${s.label}"?`)) post({ action: "stage", stage: s.key }); }}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-left text-sm ${cur ? "bg-blue-50 font-bold text-[#1B3FA8]" : done ? "text-gray-500" : "text-gray-700 hover:bg-gray-50"}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${done ? "bg-green-600 text-white" : cur ? "bg-[#1B3FA8] text-white" : "bg-gray-200 text-gray-500"}`}>
                        {done ? <Check size={11} /> : i + 1}
                      </span>
                      {s.label}
                      {"optional" in s && s.optional && <span className="text-[10px] text-gray-400">(optional)</span>}
                      {i === 0 || PROJECT_STAGES[i - 1].group !== s.group ? <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400">{s.group}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Jobs */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900">Jobs ({p.appointments.length})</h3>
              {!closed && (
                <button onClick={() => setJobForm({ jobType: (suggested?.jobType as JobType) ?? "INSTALLATION", category: suggested?.category ?? "Complete HVAC System Installation", minutes: String(suggested?.minutes ?? 480), notes: "" })}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-[#1B3FA8] flex items-center gap-1"><PlusCircle size={13} /> Create job</button>
              )}
            </div>
            {jobForm && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-2 mb-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={label}>Job type</label>
                    <select className={input} value={jobForm.jobType} onChange={(e) => setJobForm({ ...jobForm, jobType: e.target.value as JobType })}>
                      {JOB_TYPE_KEYS.map((k) => <option key={k} value={k}>{JOB_TYPES[k].label}</option>)}
                    </select></div>
                  <div><label className={label}>Duration (minutes)</label><input className={input} inputMode="numeric" value={jobForm.minutes} onChange={(e) => setJobForm({ ...jobForm, minutes: e.target.value.replace(/\D/g, "") })} /></div>
                </div>
                <div><label className={label}>What is this visit?</label><input className={input} value={jobForm.category} onChange={(e) => setJobForm({ ...jobForm, category: e.target.value })} /></div>
                <div><label className={label}>Notes for the crew</label><input className={input} value={jobForm.notes} onChange={(e) => setJobForm({ ...jobForm, notes: e.target.value })} /></div>
                <p className="text-[11px] text-gray-500">The job goes to &quot;Needs scheduling&quot;. Assign the lead installer and helpers on the Dispatch Board (crew).</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setJobForm(null)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold bg-white">Cancel</button>
                  <button disabled={busy || jobForm.category.trim().length < 2} onClick={async () => { if (await post({ action: "create_job", jobType: jobForm.jobType, category: jobForm.category, minutes: jobForm.minutes ? Number(jobForm.minutes) : undefined, notes: jobForm.notes || undefined })) setJobForm(null); }}
                    className="px-3 py-1.5 rounded-lg bg-[#1B3FA8] text-white text-xs font-bold disabled:opacity-50">Create job</button>
                </div>
              </div>
            )}
            {p.appointments.length === 0 ? <p className="text-sm text-gray-500">No jobs yet.</p> : (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                {p.appointments.map((a) => (
                  <li key={a.id} className="px-3 py-2 text-sm flex items-center gap-2">
                    <CalendarClock size={14} className="text-gray-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/dispatcher/board?job=${a.id}`} className="font-semibold text-[#1B3FA8] hover:underline">#{a.appointmentNumber}</Link> {a.jobCategory}
                      <p className="text-xs text-gray-500">
                        {a.scheduledStart ? fmtDT(a.scheduledStart) : "Not scheduled"}
                        {a.technician?.name ? ` · ${a.technician.name}` : ""}
                        {a.assignments.filter((x) => x.role !== "PRIMARY").map((x) => ` · ${staffName(x.technicianId)} (${x.role.replace("_", " ").toLowerCase()})`).join("")}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{a.status.replace("_", " ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Details */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900">Details</h3>
              {!edit ? (
                <button onClick={() => setEdit({
                  name: p.name, equipmentSummary: p.equipmentSummary ?? "", address: p.address ?? "", city: p.city ?? "", zipCode: p.zipCode ?? "",
                  contractAmount: p.contractAmount?.toString() ?? "", depositAmount: p.depositAmount?.toString() ?? "", permitNumber: p.permitNumber ?? "",
                  targetDate: p.targetDate ? p.targetDate.slice(0, 10) : "", salesRepId: p.salesRepId ?? "", leadInstallerId: p.leadInstallerId ?? "", description: p.description ?? "",
                })} className="text-xs font-semibold text-[#1B3FA8]">Edit</button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEdit(null)} className="text-xs font-semibold text-gray-500">Cancel</button>
                  <button onClick={saveEdit} disabled={busy} className="text-xs font-bold text-white bg-[#1B3FA8] px-2.5 py-1 rounded flex items-center gap-1"><Save size={12} /> Save</button>
                </div>
              )}
            </div>
            {!edit ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Item k="Customer" v={`${p.customer.name} · ${p.customer.phone}`} />
                <Item k="Job site" v={[p.address, p.city, p.zipCode].filter(Boolean).join(", ") || "—"} />
                <Item k="Equipment" v={p.equipmentSummary || "—"} />
                <Item k="Permit #" v={p.permitNumber || "—"} />
                <Item k="Contract" v={money(p.contractAmount)} />
                <Item k="Deposit" v={money(p.depositAmount)} />
                <Item k="Target date" v={p.targetDate ? fmtDate(p.targetDate) : "—"} />
                <Item k="Sales rep" v={staffName(p.salesRepId)} />
                <Item k="Lead installer" v={staffName(p.leadInstallerId)} />
                <Item k="Created" v={fmtDate(p.createdAt)} />
                {p.description && <div className="col-span-2"><Item k="Notes" v={p.description} /></div>}
              </dl>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {([["name", "Project name"], ["equipmentSummary", "Equipment"], ["address", "Address"], ["city", "City"], ["zipCode", "ZIP"], ["permitNumber", "Permit #"], ["contractAmount", "Contract ($)"], ["depositAmount", "Deposit ($)"]] as const).map(([k, l]) => (
                  <div key={k}><label className={label}>{l}</label><input className={input} value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></div>
                ))}
                <div><label className={label}>Target date</label><input type="date" className={input} value={edit.targetDate} onChange={(e) => setEdit({ ...edit, targetDate: e.target.value })} /></div>
                <div><label className={label}>Sales rep</label>
                  <select className={input} value={edit.salesRepId} onChange={(e) => setEdit({ ...edit, salesRepId: e.target.value })}>
                    <option value="">—</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name || s.role}</option>)}
                  </select></div>
                <div><label className={label}>Lead installer</label>
                  <select className={input} value={edit.leadInstallerId} onChange={(e) => setEdit({ ...edit, leadInstallerId: e.target.value })}>
                    <option value="">—</option>{staff.filter((s) => s.role === "TECHNICIAN").map((s) => <option key={s.id} value={s.id}>{s.name || "Technician"}</option>)}
                  </select></div>
                <div className="col-span-2"><label className={label}>Notes</label><textarea className={input} rows={3} value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
              </div>
            )}
          </section>

          {/* Status actions */}
          <section className="flex flex-wrap gap-2">
            {p.status === "OPEN" && <button disabled={busy} onClick={() => post({ action: "hold" })} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold flex items-center gap-1"><PauseCircle size={13} /> Put on hold</button>}
            {p.status === "ON_HOLD" && <button disabled={busy} onClick={() => post({ action: "resume" })} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold flex items-center gap-1"><PlayCircle size={13} /> Resume</button>}
            {(p.status === "OPEN" || p.status === "ON_HOLD") && (
              <button disabled={busy} onClick={() => { const reason = prompt("Why is this project canceled?"); if (reason) post({ action: "cancel", reason }); }} className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-bold flex items-center gap-1"><XCircle size={13} /> Cancel project</button>
            )}
          </section>

          {/* Activity */}
          <section>
            <h3 className="font-bold text-gray-900 mb-2">Activity</h3>
            <div className="flex gap-2 mb-3">
              <input className={input} placeholder="Add a note (customer call, permit update…)" value={note} onChange={(e) => setNote(e.target.value)} />
              <button disabled={busy || !note.trim()} onClick={async () => { if (await post({ action: "note", note })) setNote(""); }} className="px-3 rounded-lg bg-gray-900 text-white disabled:opacity-40"><MessageSquarePlus size={16} /></button>
            </div>
            <ul className="space-y-2">
              {p.events.map((e) => (
                <li key={e.id} className="text-sm flex gap-2">
                  <span className="text-xs text-gray-400 w-28 shrink-0">{fmtDT(e.createdAt)}</span>
                  <span className={e.type === "NOTE" ? "text-gray-900" : "text-gray-600"}>{e.message}{e.userName && <span className="text-gray-400"> · {e.userName}</span>}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return <div><dt className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{k}</dt><dd className="text-gray-900 whitespace-pre-line">{v}</dd></div>;
}
