"use client";
import { useCallback, useEffect, useState } from "react";
import ValidationTab from "./validation-tab";
import { Gauge, Loader2, ShieldAlert, Download, FileText, CheckCircle2, XCircle } from "lucide-react";

type Dash = {
  days: number;
  kpis: { sessions: number; completed: number; drafts: number; safetyEvents: number; aiScans: number };
  agreement: { confirmedFindings: number; top1: number; top3: number; notSuggested: number; rejectedTopSuggestions: number; top1Pct: number | null; top3Pct: number | null; note: string };
  byCategory: { category: string; sessions: number; confirmed: number; top1: number; top3: number }[];
  faults: { fault: string; n: number }[];
  recurring: { equipment: string; faults: string[]; sessions: number }[];
  safety: { id: string; at: string; code: string; severity: string; message: string; sessionId: string; technician: string | null; customer: string | null; job: string | null; reportNumber: string | null }[];
  sessions: { id: string; status: string; startedAt: string; technician: string | null; customer: string | null; job: string | null; complaint: string | null; equipment: string; refrigerant: string | null; reportNumber: string | null; safety: number; confirmed: string[]; top: string | null }[];
};
type Rule = { key: string; unit: string; min: number; max: number; source: string; value: number; default: number; label: string; pending: number | null };
type RulesData = { rulesetVersion: string; version: number; rules: Rule[]; pending: { values: Record<string, number>; note: string; by: string; byId: string; at: string } | null; history: { values: Record<string, number>; note: string; by: string; approvedBy: string; approvedAt: string; version: number }[]; canApprove: boolean; me: string };
type Model = { id: string; manufacturer: string; modelPrefix: string; description: string | null; specs: Record<string, number>; sourceDocument: string; notes: string | null; status: string; createdById: string; createdByName: string | null; approvedByName: string | null; approvedAt: string | null };

const SPEC_KEYS: [string, string][] = [
  ["targetSubcooling", "Target subcooling °F"], ["targetSuperheat", "Target superheat °F"], ["chargeTolerance", "Charge tolerance ±°F"],
  ["tempRiseMin", "Temp rise min °F"], ["tempRiseMax", "Temp rise max °F"], ["maxTesp", "Max ext. static in.wc"], ["ratedCfm", "Rated airflow CFM"],
  ["manifoldMin", "Manifold min in.wc"], ["manifoldMax", "Manifold max in.wc"], ["inletMin", "Inlet min in.wc"], ["inletMax", "Inlet max in.wc"],
];
const date = (d: string) => new Date(d).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });

export default function HvacAdminDashboard() {
  const [tab, setTab] = useState<"overview" | "sessions" | "safety" | "rules" | "models" | "validation">("overview");
  const [days, setDays] = useState(90);
  const [d, setD] = useState<Dash | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/hvac-diagnostic?days=${days}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Could not load"); return; }
    setD(j);
  }, [days]);
  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    if (!d) return;
    const head = ["Date", "Report", "Status", "Technician", "Customer", "Job", "Complaint", "Equipment", "Refrigerant", "Top automated hypothesis", "Technician-confirmed", "Safety events"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = d.sessions.map((s) => [date(s.startedAt), s.reportNumber, s.status, s.technician, s.customer, s.job, s.complaint, s.equipment, s.refrigerant, s.top, s.confirmed.join("; "), s.safety].map(esc).join(","));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[head.map(esc).join(","), ...rows].join("\n")], { type: "text/csv" }));
    a.download = `hvac-diagnostics_${days}d.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1500px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Gauge className="text-[#1B3FA8]" /> HVAC Diagnostics</h1>
          <p className="text-sm text-gray-500 mt-1">Diagnostic sessions, safety audit, technician-confirmed faults, field rules, manufacturer data, validation and technician feedback.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="border border-gray-200 rounded-lg px-2 py-2">
            {[30, 90, 365, 730].map((n) => <option key={n} value={n}>Last {n} days</option>)}
          </select>
          <button onClick={exportCsv} disabled={!d?.sessions.length} className="px-3 py-2 rounded-lg bg-gray-900 text-white font-semibold flex items-center gap-1.5 disabled:opacity-40"><Download size={15} /> CSV</button>
        </div>
      </div>
      <div className="flex gap-1 border-b border-gray-200">
        {([["overview", "Overview"], ["sessions", "Sessions"], ["safety", "Safety audit"], ["rules", "Field rules"], ["models", "Manufacturer data"], ["validation", "Validation & feedback"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === k ? "border-[#1B3FA8] text-[#1B3FA8]" : "border-transparent text-gray-500"}`}>{l}</button>
        ))}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!d && !err && <div className="flex justify-center p-10"><Loader2 className="animate-spin text-gray-400" /></div>}

      {d && tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[["Diagnostics", d.kpis.sessions], ["Completed", d.kpis.completed], ["In progress", d.kpis.drafts], ["Safety events", d.kpis.safetyEvents], ["AI photo scans", d.kpis.aiScans]].map(([l, v]) => (
              <div key={l} className="bg-white rounded-xl border border-gray-200 p-3"><p className="text-2xl font-black">{v}</p><p className="text-xs text-gray-500">{l}</p></div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="font-bold text-gray-900">Engine vs technician-confirmed faults</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 text-sm">
              <div><p className="text-xl font-black">{d.agreement.confirmedFindings}</p><p className="text-xs text-gray-500">Confirmed findings</p></div>
              <div><p className="text-xl font-black">{d.agreement.top1Pct == null ? "—" : `${d.agreement.top1Pct}%`}</p><p className="text-xs text-gray-500">Ranked #1 by the engine ({d.agreement.top1})</p></div>
              <div><p className="text-xl font-black">{d.agreement.top3Pct == null ? "—" : `${d.agreement.top3Pct}%`}</p><p className="text-xs text-gray-500">In the engine&apos;s top 3 ({d.agreement.top3})</p></div>
              <div><p className="text-xl font-black">{d.agreement.notSuggested}</p><p className="text-xs text-gray-500">Not suggested at all</p></div>
              <div><p className="text-xl font-black">{d.agreement.rejectedTopSuggestions}</p><p className="text-xs text-gray-500">#1 suggestions ruled out</p></div>
            </div>
            <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mt-3">{d.agreement.note}</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-5">
            <Box title="Most common confirmed faults">
              {d.faults.length === 0 && <Empty />}
              {d.faults.map((f) => <Row key={f.fault} l={f.fault} r={String(f.n)} />)}
            </Box>
            <Box title="By equipment type">
              {d.byCategory.length === 0 && <Empty />}
              {d.byCategory.map((c) => <Row key={c.category} l={c.category} r={`${c.sessions} diag. · ${c.confirmed} confirmed${c.confirmed ? ` · #1 ${Math.round((c.top1 / c.confirmed) * 100)}%` : ""}`} />)}
            </Box>
            <Box title="Recurring failures (same equipment)">
              {d.recurring.length === 0 && <Empty />}
              {d.recurring.map((e, i) => <Row key={i} l={e.equipment} r={e.faults.join("; ")} />)}
            </Box>
          </div>
        </div>
      )}

      {d && tab === "sessions" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{["Date", "Customer / job", "Technician", "Equipment", "Complaint", "Automated #1", "Confirmed", "Status", ""].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {d.sessions.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-gray-500">No diagnostics in this period.</td></tr>}
              {d.sessions.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{date(s.startedAt)}</td>
                  <td className="px-3 py-2">{s.customer ?? "—"}<span className="block text-xs text-gray-400">{s.job ? `#${s.job}` : ""}</span></td>
                  <td className="px-3 py-2">{s.technician ?? "—"}</td>
                  <td className="px-3 py-2">{s.equipment}<span className="block text-xs text-gray-400">{s.refrigerant ?? ""}</span></td>
                  <td className="px-3 py-2">{s.complaint ?? "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{s.top ?? "—"}</td>
                  <td className="px-3 py-2 text-emerald-700">{s.confirmed.join("; ") || "—"}</td>
                  <td className="px-3 py-2"><span className={`text-xs font-bold px-2 py-0.5 rounded ${s.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{s.status.toLowerCase()}</span>{s.safety > 0 && <ShieldAlert size={14} className="inline ml-1 text-red-600" />}</td>
                  <td className="px-3 py-2"><a href={`/api/technician/hvac-diagnostic/${s.id}/report`} target="_blank" rel="noopener noreferrer" className="text-[#1B3FA8] flex items-center gap-1 text-xs font-semibold"><FileText size={13} /> {s.reportNumber ?? "draft"}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {d && tab === "safety" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{["Date", "Severity", "Finding", "Customer / job", "Technician", "Report"].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {d.safety.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-500">No safety-critical finding recorded.</td></tr>}
              {d.safety.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-500">{date(e.at)}</td>
                  <td className="px-3 py-2"><span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">{e.severity}</span></td>
                  <td className="px-3 py-2">{e.message}</td>
                  <td className="px-3 py-2">{e.customer ?? "—"}{e.job && <span className="block text-xs text-gray-400">#{e.job}</span>}</td>
                  <td className="px-3 py-2">{e.technician ?? "—"}</td>
                  <td className="px-3 py-2"><a href={`/api/technician/hvac-diagnostic/${e.sessionId}/report`} target="_blank" rel="noopener noreferrer" className="text-[#1B3FA8] text-xs font-semibold">{e.reportNumber ?? "draft"}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "rules" && <RulesTab />}
      {tab === "models" && <ModelsTab />}
      {tab === "validation" && <ValidationTab />}
    </div>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-gray-200"><p className="px-4 py-3 font-bold text-gray-900 border-b border-gray-100">{title}</p><div className="divide-y divide-gray-100">{children}</div></div>;
}
const Row = ({ l, r }: { l: string; r: string }) => <div className="px-4 py-2 flex justify-between gap-3 text-sm"><span className="text-gray-800">{l}</span><span className="text-gray-500 text-right">{r}</span></div>;
const Empty = () => <p className="px-4 py-4 text-sm text-gray-400">Nothing yet.</p>;

function RulesTab() {
  const [d, setD] = useState<RulesData | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/hvac-diagnostic/rules", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setD(j); else setErr(j.error ?? "Could not load");
  }, []);
  useEffect(() => { load(); }, [load]);
  async function post(body: unknown) {
    setErr("");
    const r = await fetch("/api/admin/hvac-diagnostic/rules", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Failed"); return; }
    setDraft({}); setNote(""); load();
  }
  if (!d) return <div className="flex justify-center p-10">{err ? <p className="text-sm text-red-600">{err}</p> : <Loader2 className="animate-spin text-gray-400" />}</div>;
  const changes = Object.fromEntries(Object.entries(draft).filter(([, v]) => v.trim() !== "").map(([k, v]) => [k, Number(v)]));
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Company thresholds used by the rule engine ({d.rulesetVersion}, field-rule set v{d.version}). They are <b>not manufacturer data</b> and are shown to technicians as such. A change is proposed, then approved by a different administrator before it applies.</p>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {d.pending && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm space-y-2">
          <p className="font-bold">Pending change — proposed by {d.pending.by} on {date(d.pending.at)}</p>
          <p>{Object.entries(d.pending.values).map(([k, v]) => `${k}: ${d.rules.find((r) => r.key === k)?.value} → ${v}`).join(" · ")}</p>
          <p className="text-gray-600">Reason: {d.pending.note}</p>
          {d.canApprove && (
            <div className="flex gap-2">
              <button onClick={() => post({ action: "approve" })} className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold flex items-center gap-1"><CheckCircle2 size={15} /> Approve</button>
              <button onClick={() => post({ action: "reject" })} className="px-3 py-2 rounded-lg bg-white border border-gray-300 font-semibold flex items-center gap-1"><XCircle size={15} /> Reject</button>
            </div>
          )}
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {d.rules.map((r) => (
          <div key={r.key} className="p-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[260px]">
              <p className="text-sm font-semibold text-gray-900">{r.label}</p>
              <p className="text-xs text-gray-500">Source: {r.source} · default {r.default}{r.unit === ":1" ? ":1" : ` ${r.unit}`} · allowed {r.min}–{r.max}</p>
            </div>
            <span className="text-lg font-black w-20 text-right">{r.value}<span className="text-xs text-gray-500"> {r.unit}</span></span>
            <input placeholder="new value" inputMode="decimal" value={draft[r.key] ?? ""} onChange={(e) => setDraft((x) => ({ ...x, [r.key]: e.target.value }))} disabled={!!d.pending} className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
          </div>
        ))}
      </div>
      {!d.pending && Object.keys(changes).length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason / source for the change (required)" className="flex-1 min-w-[260px] border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button onClick={() => post({ action: "propose", values: changes, note })} className="px-4 py-2 rounded-lg bg-[#1B3FA8] text-white font-semibold text-sm">Propose change</button>
        </div>
      )}
      {d.history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm">
          <p className="font-bold mb-2">History</p>
          {d.history.map((h) => <p key={h.version} className="text-gray-600">v{h.version} · {date(h.approvedAt)} · {Object.entries(h.values).map(([k, v]) => `${k}=${v}`).join(", ")} · proposed by {h.by}, approved by {h.approvedBy} — {h.note}</p>)}
        </div>
      )}
    </div>
  );
}

function ModelsTab() {
  const [models, setModels] = useState<Model[] | null>(null);
  const [canApprove, setCanApprove] = useState(false);
  const [me, setMe] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const r = await fetch("/api/admin/hvac-diagnostic/models", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setModels(j.models); setCanApprove(j.canApprove); setMe(j.me); } else setErr(j.error ?? "Could not load");
  }, []);
  useEffect(() => { load(); }, [load]);
  async function post(body: unknown) {
    setErr("");
    const r = await fetch("/api/admin/hvac-diagnostic/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Failed"); return false; }
    load(); return true;
  }
  async function save() {
    const specs = Object.fromEntries(SPEC_KEYS.map(([k]) => [k, form[k]?.trim() ? Number(form[k]) : null]));
    if (await post({ action: "save", id: form.id || undefined, manufacturer: form.manufacturer ?? "", modelPrefix: form.modelPrefix ?? "", description: form.description || null, sourceDocument: form.sourceDocument ?? "", notes: form.notes || null, specs })) setForm({});
  }
  const edit = (m: Model) => setForm({ id: m.id, manufacturer: m.manufacturer, modelPrefix: m.modelPrefix, description: m.description ?? "", sourceDocument: m.sourceDocument, notes: m.notes ?? "", ...Object.fromEntries(Object.entries(m.specs).map(([k, v]) => [k, String(v)])) });
  const inp = "border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-full";
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Values from manufacturer documents (installation instructions, charging charts, blower tables, rating plates). Technicians see a banner when the equipment&apos;s manufacturer and model number match an <b>approved</b> entry and choose to use it. Any edit sends the entry back for approval by a different administrator.</p>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <p className="font-bold">{form.id ? "Edit entry" : "Add manufacturer data"}</p>
        <div className="grid md:grid-cols-4 gap-2">
          <label className="text-xs text-gray-500">Manufacturer<input className={inp} value={form.manufacturer ?? ""} onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))} /></label>
          <label className="text-xs text-gray-500">Model prefix (e.g. 24ACC636)<input className={inp} value={form.modelPrefix ?? ""} onChange={(e) => setForm((f) => ({ ...f, modelPrefix: e.target.value }))} /></label>
          <label className="text-xs text-gray-500 md:col-span-2">Description<input className={inp} value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></label>
          <label className="text-xs text-gray-500 md:col-span-4">Source document (title / URL) — required<input className={inp} value={form.sourceDocument ?? ""} onChange={(e) => setForm((f) => ({ ...f, sourceDocument: e.target.value }))} /></label>
          {SPEC_KEYS.map(([k, l]) => (
            <label key={k} className="text-xs text-gray-500">{l}<input inputMode="decimal" className={inp} value={form[k] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} /></label>
          ))}
          <label className="text-xs text-gray-500 md:col-span-4">Notes<input className={inp} value={form.notes ?? ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></label>
        </div>
        <div className="flex gap-2">
          <button onClick={save} className="px-4 py-2 rounded-lg bg-[#1B3FA8] text-white font-semibold text-sm">{form.id ? "Save (needs re-approval)" : "Submit for approval"}</button>
          {form.id && <button onClick={() => setForm({})} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold">Cancel</button>}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>{["Manufacturer / model", "Values", "Source", "Status", ""].map((h) => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {models?.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No manufacturer data yet.</td></tr>}
            {models?.map((m) => (
              <tr key={m.id}>
                <td className="px-3 py-2"><b>{m.manufacturer}</b> {m.modelPrefix}*<span className="block text-xs text-gray-400">{m.description}</span></td>
                <td className="px-3 py-2 text-xs text-gray-600">{Object.entries(m.specs).map(([k, v]) => `${SPEC_KEYS.find(([x]) => x === k)?.[1] ?? k}: ${v}`).join(" · ")}</td>
                <td className="px-3 py-2 text-xs text-gray-600 max-w-xs">{m.sourceDocument}</td>
                <td className="px-3 py-2 text-xs">
                  <span className={`font-bold px-2 py-0.5 rounded ${m.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : m.status === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-500"}`}>{m.status.toLowerCase()}</span>
                  <span className="block text-gray-400 mt-0.5">by {m.createdByName ?? "—"}{m.approvedByName ? ` · approved by ${m.approvedByName}` : ""}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap space-x-2 text-xs font-semibold">
                  <button onClick={() => edit(m)} className="text-[#1B3FA8]">Edit</button>
                  {canApprove && m.status === "PENDING" && m.createdById !== me && <button onClick={() => post({ action: "approve", id: m.id })} className="text-emerald-700">Approve</button>}
                  {canApprove && m.status !== "RETIRED" && <button onClick={() => post({ action: "retire", id: m.id })} className="text-gray-500">Retire</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
