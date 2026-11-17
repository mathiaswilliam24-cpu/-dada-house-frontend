"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  X, Phone, MapPin, Mail, Crown, AlertTriangle, Loader2, Sparkles, UserPlus, Trash2, Clock, History, Wrench, FileText, ExternalLink, CheckCircle2,
} from "lucide-react";
import { ctParts, ctInstant, hm, fmtTimeCT } from "@/lib/dispatch-time";
import { formatCurrency } from "@/lib/utils";
import { STATUS_STYLE, type BoardJob, type BoardTech, type BoardStatus } from "./types";
import type { ScheduleFn } from "./dispatch-board";

type Detail = {
  job: BoardJob & {
    adminNotes: string | null; billingAddress: string | null; notes: string | null; photos: string[];
    technicianName: string | null; crew: { technicianId: string; role: string; name: string | null }[];
    events: { id: string; type: string; message: string; userName: string | null; createdAt: string }[];
    customer: null | {
      id: string; firstName: string; lastName: string | null; customerType: string; notes: string | null;
      equipment: { id: string; type: string; makeModel: string | null; serialNumber: string | null; location: string | null; age: string | null }[];
      maintenanceContracts: { id: string; status: string; numberOfSystems: number; planType: { name: string } }[];
    };
    timeLog: null | { enRouteAt: string | null; arrivedAt: string | null; startedAt: string | null; completedAt: string | null };
  };
  history: { id: string; appointmentNumber: string; service: string; status: string; preferredDate: string | null; scheduledStart: string | null; technician: { name: string | null } | null }[];
  estimates: { id: string; estimateNumber: string; total: number; isInvoice: boolean; paidAt: string | null }[];
};

type Rec = {
  technicianId: string; name: string; available: boolean; availabilityNote: string; slotStart: string | null; slotEnd: string | null;
  skillMatch: number | null; skillNote: string; travelMinutes: number | null; travelNote: string;
  workload: string; workloadMinutes: number; jobsThatDay: number; emergencyReady: boolean; score: number;
};

const ROLES = ["HELPER", "LEAD_INSTALLER", "SUPERVISOR"];
const pad = (n: number) => String(n).padStart(2, "0");
const toHHMM = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export default function JobPanel({ jobId, technicians, jobTypes, defaultDate, onClose, onChanged, schedule }: {
  jobId: string; technicians: BoardTech[]; jobTypes: Record<string, { label: string; color: string; minutes: number; categories: string[] }>;
  defaultDate: string; onClose: () => void; onChanged: () => void; schedule: ScheduleFn;
}) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // Editable details
  const [form, setForm] = useState({ jobType: "", jobCategory: "", priority: "NORMAL", isEmergency: false, estimatedMinutes: 60, description: "", adminNotes: "", customerType: "" });
  // Scheduling
  const [techId, setTechId] = useState<string>("");
  const [day, setDay] = useState(defaultDate);
  const [time, setTime] = useState("08:00");
  const [crew, setCrew] = useState<{ technicianId: string; role: string }[]>([]);
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/dispatch/jobs/${jobId}`);
    if (!r.ok) { setErr("Could not load this call"); return; }
    const data: Detail = await r.json();
    setD(data);
    const j = data.job;
    setForm({
      jobType: j.jobType, jobCategory: j.jobCategory ?? "", priority: j.priority, isEmergency: j.isEmergency,
      estimatedMinutes: j.estimatedMinutes ?? jobTypes[j.jobType]?.minutes ?? 60, description: j.description ?? "", adminNotes: j.adminNotes ?? "",
      customerType: j.customerType ?? "",
    });
    setTechId(j.technicianId ?? "");
    setCrew(j.crew.map((c) => ({ technicianId: c.technicianId, role: c.role })));
    if (j.scheduledStart) {
      const p = ctParts(new Date(j.scheduledStart));
      setDay(p.ymd); setTime(toHHMM(p.minutes));
    } else if (j.preferredDate) {
      setDay(ctParts(new Date(j.preferredDate)).ymd);
    }
  }, [jobId, jobTypes]);

  useEffect(() => { load(); }, [load]);

  if (!d) {
    return (
      <aside className="w-[400px] shrink-0 bg-white border border-gray-200 rounded-2xl flex items-center justify-center max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:w-auto max-lg:rounded-none">
        {err ? <p className="text-sm text-red-600">{err}</p> : <Loader2 className="w-5 h-5 animate-spin text-[#1B3FA8]" />}
      </aside>
    );
  }
  const j = d.job;
  const st = STATUS_STYLE[j.boardStatus as BoardStatus];
  const closed = j.boardStatus === "COMPLETED" || j.boardStatus === "CANCELED";

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action); setErr("");
    const r = await fetch(`/api/dispatch/jobs/${jobId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
    const res = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) { setErr(res.error ?? "Action failed"); return; }
    await load(); onChanged();
  }

  async function saveDetails() {
    setBusy("details"); setErr("");
    const r = await fetch(`/api/dispatch/jobs/${jobId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobType: form.jobType, jobCategory: form.jobCategory || null, priority: form.priority, isEmergency: form.isEmergency,
        estimatedMinutes: Number(form.estimatedMinutes) || null, description: form.description || null, adminNotes: form.adminNotes || null,
        customerType: form.customerType || null,
      }),
    });
    const res = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) { setErr(res.error ?? "Save failed"); return; }
    await load(); onChanged();
  }

  async function doSchedule(override?: { technicianId: string; start: string; end: string }) {
    setBusy("schedule"); setErr("");
    const start = override ? override.start : ctInstant(day, hm(time)).toISOString();
    const end = override ? override.end : new Date(new Date(start).getTime() + (Number(form.estimatedMinutes) || 60) * 60000).toISOString();
    const primary = override?.technicianId ?? techId;
    if (!primary) { setBusy(null); setErr("Choose a technician."); return; }
    const ok = await schedule(j, { technicianId: primary, start, end, crew: crew.filter((c) => c.technicianId && c.technicianId !== primary), notifyCustomer });
    setBusy(null);
    if (ok) await load();
  }

  async function loadRecs() {
    setRecLoading(true);
    const start = ctInstant(day, hm(time)).toISOString();
    const r = await fetch(`/api/dispatch/jobs/${jobId}/recommend${start ? `?start=${encodeURIComponent(start)}` : ""}`);
    const data = await r.json().catch(() => ({}));
    setRecs(data.recommendations ?? []);
    setRecLoading(false);
  }

  const timeOptions = Array.from({ length: (21 - 6) * 4 }, (_, i) => 6 * 60 + i * 15);
  const categories = jobTypes[form.jobType]?.categories ?? [];

  return (
    <aside className="w-[400px] shrink-0 bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:w-auto max-lg:rounded-none">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-start gap-2" style={{ borderTop: `4px solid ${j.color}` }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-gray-500">#{j.appointmentNumber}</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${st.card}`}>{st.label}</span>
            {j.isEmergency && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Emergency</span>}
            {j.member && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1"><Crown className="w-3 h-3" />Member</span>}
          </div>
          <h2 className="text-lg font-bold text-gray-900 truncate mt-0.5">{j.name}</h2>
          <p className="text-xs text-gray-500">{j.jobTypeLabel}{j.jobCategory ? ` · ${j.jobCategory}` : ` · ${j.service}`}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
        {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

        {/* Customer */}
        <section className="space-y-1.5">
          <a href={`tel:${j.phone}`} className="flex items-center gap-2 text-gray-800"><Phone className="w-4 h-4 text-gray-400" />{j.phone}</a>
          {j.email && <p className="flex items-center gap-2 text-gray-600 truncate"><Mail className="w-4 h-4 text-gray-400" />{j.email}</p>}
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${j.address}, ${j.city} ${j.zipCode}`)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[#1B3FA8]">
            <MapPin className="w-4 h-4" />{j.address}, {j.city} {j.zipCode}
          </a>
          <p className="text-xs text-gray-400">Source: {j.source} · Created {new Date(j.createdAt).toLocaleString("en-US", { timeZone: "America/New_York" })}</p>
        </section>

        {/* Schedule */}
        <section className="rounded-xl border border-gray-200 p-3 space-y-2.5">
          <h3 className="font-bold text-gray-900 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Schedule</h3>
          {j.scheduledStart ? (
            <p className="text-xs text-gray-600">
              Now: {j.technicianName ?? "Unassigned"} · {ctParts(new Date(j.scheduledStart)).ymd} {fmtTimeCT(new Date(j.scheduledStart))}–{fmtTimeCT(new Date(j.scheduledEnd!))}
              {j.arrivalWindow ? ` · window ${j.arrivalWindow}` : ""}
            </p>
          ) : (
            <p className="text-xs text-gray-500">Customer asked for: {j.preferredDate ? `${ctParts(new Date(j.preferredDate)).ymd}${j.preferredTime ? ` ${j.preferredTime}` : ""}` : "no date"}</p>
          )}
          <select value={techId} onChange={(e) => setTechId(e.target.value)} disabled={closed} className="w-full border border-gray-200 rounded-lg px-2 py-2">
            <option value="">— Choose technician —</option>
            {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}{t.hours[day] === null ? " (day off)" : ""}</option>)}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} disabled={closed} className="col-span-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
            <select value={time} onChange={(e) => setTime(e.target.value)} disabled={closed} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
              {timeOptions.map((m) => <option key={m} value={toHHMM(m)}>{fmtTimeCT(ctInstant(day, m))}</option>)}
            </select>
            <select value={form.estimatedMinutes} onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: Number(e.target.value) }))} disabled={closed} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
              {[30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480, 600].map((m) => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`}</option>)}
            </select>
          </div>

          {/* Crew */}
          <div className="space-y-1.5">
            {crew.map((c, i) => (
              <div key={i} className="flex gap-1.5">
                <select value={c.technicianId} onChange={(e) => setCrew((cs) => cs.map((x, k) => (k === i ? { ...x, technicianId: e.target.value } : x)))} className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                  <option value="">— Technician —</option>
                  {technicians.filter((t) => t.id !== techId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={c.role} onChange={(e) => setCrew((cs) => cs.map((x, k) => (k === i ? { ...x, role: e.target.value } : x)))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                  {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ").toLowerCase()}</option>)}
                </select>
                <button onClick={() => setCrew((cs) => cs.filter((_, k) => k !== i))} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {!closed && (
              <button onClick={() => setCrew((cs) => [...cs, { technicianId: "", role: "HELPER" }])} className="text-xs font-semibold text-[#1B3FA8] flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" /> Add technician (helper, lead installer…)
              </button>
            )}
          </div>

          {!closed && (
            <>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={notifyCustomer} onChange={(e) => setNotifyCustomer(e.target.checked)} />
                Text the customer the appointment time
              </label>
              <div className="flex gap-2">
                <button onClick={() => doSchedule()} disabled={!!busy} className="flex-1 py-2 bg-[#1B3FA8] text-white rounded-lg font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {busy === "schedule" && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {j.technicianId ? "Update schedule" : "Assign & schedule"}
                </button>
                {(j.technicianId || j.scheduledStart) && (
                  <button onClick={() => schedule(j, { technicianId: null, start: null }).then((ok) => { if (ok) load(); })} className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600">
                    Unassign
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        {/* Recommendations */}
        {!closed && (
          <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-[#1B3FA8]" /> Recommended technician</h3>
              <button onClick={loadRecs} disabled={recLoading} className="text-xs font-bold text-[#1B3FA8] flex items-center gap-1">
                {recLoading && <Loader2 className="w-3 h-3 animate-spin" />} {recs ? "Refresh" : "Find best match"}
              </button>
            </div>
            {recs && recs.length === 0 && <p className="text-xs text-gray-500">No technicians found.</p>}
            {recs?.slice(0, 5).map((r, i) => (
              <div key={r.technicianId} className={`rounded-lg border bg-white p-2.5 ${i === 0 && r.available ? "border-[#1B3FA8]" : "border-gray-200"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-gray-900">{i === 0 && r.available && "★ "}{r.name}</p>
                  <span className="text-xs font-bold text-gray-500">Score {r.score}</span>
                </div>
                <ul className="mt-1 text-xs text-gray-600 space-y-0.5">
                  <li>Available: <b className={r.available ? "text-green-700" : "text-red-600"}>{r.available ? "Yes" : "No"}</b> — {r.availabilityNote}</li>
                  <li>Skill match: {r.skillMatch == null ? <span className="text-gray-400">unavailable ({r.skillNote})</span> : `${r.skillMatch}% (${r.skillNote})`}</li>
                  <li>Travel: {r.travelMinutes != null ? `${r.travelMinutes} min` : <span className="text-gray-400">{r.travelNote}</span>}{r.travelMinutes != null ? ` (${r.travelNote.replace(/^\d+ min /, "")})` : ""}</li>
                  <li>Workload: {r.workload} ({r.jobsThatDay} job{r.jobsThatDay === 1 ? "" : "s"}, {Math.round(r.workloadMinutes / 6) / 10}h)</li>
                  {r.slotStart && <li>Recommended arrival: <b>{fmtTimeCT(new Date(r.slotStart))}</b></li>}
                </ul>
                {r.available && r.slotStart && (
                  <button
                    onClick={() => doSchedule({ technicianId: r.technicianId, start: r.slotStart!, end: r.slotEnd! })}
                    className={`mt-2 w-full py-1.5 rounded-lg text-xs font-bold ${i === 0 ? "bg-[#F97316] text-white" : "border border-gray-200 text-gray-700"}`}
                  >
                    {i === 0 ? "Assign recommended technician" : `Assign ${r.name}`}
                  </button>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Details */}
        <section className="space-y-2">
          <h3 className="font-bold text-gray-900">Call details</h3>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.jobType} onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value, jobCategory: "", estimatedMinutes: jobTypes[e.target.value]?.minutes ?? f.estimatedMinutes }))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
              {Object.entries(jobTypes).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
            </select>
            <select value={form.jobCategory} onChange={(e) => setForm((f) => ({ ...f, jobCategory: e.target.value }))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
              <option value="">— Category —</option>
              {[...categories, ...(form.jobCategory && !categories.includes(form.jobCategory) ? [form.jobCategory] : [])].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
              {["LOW", "NORMAL", "HIGH", "EMERGENCY"].map((p) => <option key={p} value={p}>Priority: {p.toLowerCase()}</option>)}
            </select>
            <select value={form.customerType} onChange={(e) => setForm((f) => ({ ...f, customerType: e.target.value }))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
              <option value="">Residential / Commercial</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
            </select>
          </div>
          {j.inferredType && <p className="text-[11px] text-amber-700">Job type was guessed from “{j.service}”. Confirm it and save.</p>}
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={form.isEmergency} onChange={(e) => setForm((f) => ({ ...f, isEmergency: e.target.checked }))} /> Emergency call
          </label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Problem description (customer)" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
          <textarea value={form.adminNotes} onChange={(e) => setForm((f) => ({ ...f, adminNotes: e.target.value }))} rows={2} placeholder="Internal notes (not shown to the customer)" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-yellow-50/50" />
          <button onClick={saveDetails} disabled={!!busy} className="w-full py-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 disabled:opacity-60">
            {busy === "details" ? "Saving…" : "Save call details"}
          </button>
        </section>

        {/* Actions */}
        <section className="flex flex-wrap gap-2">
          {!closed && !j.status.includes("CONFIRMED") && (
            <button onClick={() => act("confirm")} className="px-3 py-1.5 border border-purple-200 text-purple-700 rounded-lg text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Customer confirmed</button>
          )}
          {!closed && j.scheduledStart && (
            <button onClick={() => { const reason = prompt("Why does this call need to be rescheduled?") ?? undefined; act("hold", { reason }); }} className="px-3 py-1.5 border border-pink-200 text-pink-700 rounded-lg text-xs font-bold">Needs reschedule</button>
          )}
          {!closed && (
            <button
              onClick={() => {
                const reason = prompt("Cancellation reason:");
                if (!reason || reason.trim().length < 2) return;
                act("cancel", { reason: reason.trim(), notifyCustomer: confirm("Text the customer that the appointment is canceled?") });
              }}
              className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-bold"
            >
              Cancel call
            </button>
          )}
          {j.boardStatus === "CANCELED" && <button onClick={() => act("reopen")} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold">Reopen</button>}
          <Link href={`/admin/appointments/${j.id}`} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> Full job</Link>
        </section>

        {/* Progress */}
        {d.job.timeLog && (
          <section className="text-xs text-gray-600 space-y-0.5">
            <h3 className="font-bold text-gray-900 text-sm mb-1">Technician progress</h3>
            {(["enRouteAt", "arrivedAt", "startedAt", "completedAt"] as const).map((k) => d.job.timeLog![k] && (
              <p key={k}>{{ enRouteAt: "On the way", arrivedAt: "Arrived", startedAt: "Started", completedAt: "Completed" }[k]}: {new Date(d.job.timeLog![k]!).toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" })}</p>
            ))}
          </section>
        )}

        {/* Membership & equipment */}
        {d.job.customer && (
          <section className="space-y-2">
            <h3 className="font-bold text-gray-900 flex items-center gap-1.5"><Wrench className="w-4 h-4" /> Customer & equipment</h3>
            {d.job.customer.maintenanceContracts.map((c) => (
              <p key={c.id} className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">{c.planType.name} plan — {c.status.toLowerCase()} · {c.numberOfSystems} system{c.numberOfSystems === 1 ? "" : "s"}</p>
            ))}
            {d.job.customer.equipment.length === 0 && <p className="text-xs text-gray-400">No equipment recorded.</p>}
            {d.job.customer.equipment.map((e) => (
              <p key={e.id} className="text-xs text-gray-700">{e.type}{e.makeModel ? ` — ${e.makeModel}` : ""}{e.location ? ` (${e.location})` : ""}{e.serialNumber ? ` · SN ${e.serialNumber}` : ""}</p>
            ))}
            {d.job.customer.notes && <p className="text-xs text-gray-500 italic">{d.job.customer.notes}</p>}
          </section>
        )}

        {d.estimates.length > 0 && (
          <section className="space-y-1">
            <h3 className="font-bold text-gray-900 flex items-center gap-1.5"><FileText className="w-4 h-4" /> Estimates & invoices</h3>
            {d.estimates.map((e) => (
              <p key={e.id} className="text-xs text-gray-700">#{e.estimateNumber} · {e.isInvoice ? "Invoice" : "Estimate"} · {formatCurrency(e.total)} {e.paidAt ? <b className="text-green-700">paid</b> : ""}</p>
            ))}
          </section>
        )}

        {d.history.length > 0 && (
          <section className="space-y-1">
            <h3 className="font-bold text-gray-900 flex items-center gap-1.5"><History className="w-4 h-4" /> Customer history</h3>
            {d.history.map((h) => (
              <p key={h.id} className="text-xs text-gray-600">
                #{h.appointmentNumber} · {h.service} · {h.status.toLowerCase()}
                {(h.scheduledStart || h.preferredDate) && ` · ${ctParts(new Date((h.scheduledStart || h.preferredDate)!)).ymd}`}
                {h.technician?.name ? ` · ${h.technician.name}` : ""}
              </p>
            ))}
          </section>
        )}

        <section className="space-y-1.5">
          <h3 className="font-bold text-gray-900">Activity</h3>
          {d.job.events.length === 0 && <p className="text-xs text-gray-400">No activity recorded yet.</p>}
          {d.job.events.map((e) => (
            <div key={e.id} className="text-xs border-l-2 border-gray-200 pl-2">
              <p className="text-gray-800">{e.message}</p>
              <p className="text-gray-400">{new Date(e.createdAt).toLocaleString("en-US", { timeZone: "America/New_York" })}{e.userName ? ` · ${e.userName}` : ""}</p>
            </div>
          ))}
        </section>
      </div>
    </aside>
  );
}
