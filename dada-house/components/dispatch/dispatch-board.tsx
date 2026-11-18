"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Plus, RefreshCw, Search, AlertTriangle, Crown, Users, Loader2, X, Inbox, Calendar, Map as MapIcon,
} from "lucide-react";
import { ctParts, ctInstant, hm, fmtTimeCT } from "@/lib/dispatch-time";
import { STATUS_STYLE, TECH_STATUS_STYLE, type BoardData, type BoardJob, type BoardTech, type Conflict } from "./types";
import JobPanel from "./job-panel";

const PX = 1.6; // px per minute (96 px per hour)
const ROW_H = 84;
const TECH_W = 210;
const SNAP = 15;

type DropTarget =
  | { kind: "slot"; techId: string; ymd: string; minutes: number }
  | { kind: "queue" }
  | null;

type DragState = {
  job: BoardJob; x0: number; y0: number; grabMin: number; moved: boolean; duration: number;
};

export type ScheduleFn = (
  job: BoardJob,
  body: { technicianId: string | null; start: string | null; end?: string | null; crew?: { technicianId: string; role: string }[]; force?: boolean; notifyCustomer?: boolean }
) => Promise<boolean>;

const addDays = (ymd: string, n: number) => ctParts(new Date(ctInstant(ymd, 720).getTime() + n * 86400000)).ymd;
const dayLabel = (ymd: string, opts: Intl.DateTimeFormatOptions) => ctInstant(ymd, 720).toLocaleDateString("en-US", { timeZone: "America/New_York", ...opts });
const minsOf = (iso: string) => ctParts(new Date(iso)).minutes;
const durationOf = (j: BoardJob, cfg: BoardData["config"]) =>
  j.scheduledStart && j.scheduledEnd
    ? Math.max(15, (new Date(j.scheduledEnd).getTime() - new Date(j.scheduledStart).getTime()) / 60000)
    : j.estimatedMinutes ?? cfg.defaultMinutes[j.jobType] ?? 60;

export default function DispatchBoard() {
  const [date, setDate] = useState(() => ctParts(new Date()).ymd);
  const [view, setView] = useState<"day" | "week">("day");
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [showQueue, setShowQueue] = useState(true);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [target, setTarget] = useState<DropTarget>(null);
  const [conflict, setConflict] = useState<{ job: BoardJob; body: Parameters<ScheduleFn>[1]; conflicts: Conflict[] } | null>(null);
  const [toast, setToast] = useState<{ text: string; jobId?: string; offerText?: boolean; error?: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  // Resize: drag the right edge of a scheduled card to change its end time.
  const [resize, setResize] = useState<{ job: BoardJob; x0: number; base: number; duration: number } | null>(null);
  const resizeRef = useRef<typeof resize>(null);
  const targetRef = useRef<DropTarget>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const res = await fetch(`/api/dispatch/board?date=${date}${view === "week" ? "&days=7" : ""}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [date, view]);

  // Deep link from the Command Center: /dispatcher/board?job=<id>&date=YYYY-MM-DD
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const d = sp.get("date"), j = sp.get("job");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) setDate(d);
    if (j) setSelected(j);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => { if (!dragRef.current && !resizeRef.current) load(true); }, 20000);
    return () => clearInterval(t);
  }, [load]);

  const flash = (t: NonNullable<typeof toast>) => { setToast(t); setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 9000); };

  const schedule: ScheduleFn = useCallback(async (job, body) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/dispatch/jobs/${job.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "schedule", ...body }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 409) { setConflict({ job, body, conflicts: d.conflicts ?? [] }); return false; }
      if (!res.ok) { flash({ text: d.error ?? "Could not schedule", error: true }); return false; }
      const moved = body.start !== job.scheduledStart;
      flash({
        text: body.technicianId
          ? `#${job.appointmentNumber} → ${data?.technicians.find((t) => t.id === body.technicianId)?.name ?? "technician"}${body.start ? ` at ${fmtTimeCT(new Date(body.start))}` : ""}`
          : `#${job.appointmentNumber} moved to the queue`,
        jobId: job.id,
        offerText: !!body.start && moved && !body.notifyCustomer,
      });
      await load(true);
      return true;
    } finally {
      setSaving(false);
    }
  }, [data, load]);

  // ── Pointer drag & drop (mouse + touch) ──
  const startDrag = (e: React.PointerEvent, job: BoardJob) => {
    if (e.button !== 0 || !data) return;
    if (job.boardStatus === "COMPLETED" || job.boardStatus === "CANCELED") { setSelected(job.id); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const grabMin = job.scheduledStart && view === "day" ? Math.max(0, Math.round((e.clientX - rect.left) / PX / SNAP) * SNAP) : 0;
    const st: DragState = { job, x0: e.clientX, y0: e.clientY, grabMin, moved: false, duration: durationOf(job, data.config) };
    dragRef.current = st;
    setDrag(st);
  };

  useEffect(() => {
    if (!drag || !data) return;
    const boardStart = hm(data.config.boardStart);
    const onMove = (e: PointerEvent) => {
      const st = dragRef.current!;
      if (!st.moved && Math.hypot(e.clientX - st.x0, e.clientY - st.y0) < 6) return;
      st.moved = true;
      setPointer({ x: e.clientX, y: e.clientY });
      const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest("[data-drop]") as HTMLElement | null;
      let t: DropTarget = null;
      if (el?.dataset.drop === "queue") t = { kind: "queue" };
      else if (el?.dataset.drop === "row") {
        const r = el.getBoundingClientRect();
        let m = boardStart + (e.clientX - r.left) / PX - st.grabMin;
        m = Math.max(0, Math.min(1440 - st.duration, Math.round(m / SNAP) * SNAP));
        t = { kind: "slot", techId: el.dataset.tech!, ymd: el.dataset.day!, minutes: m };
      } else if (el?.dataset.drop === "cell") {
        const keep = st.job.scheduledStart ? minsOf(st.job.scheduledStart) : hm(data.technicians.find((x) => x.id === el.dataset.tech)?.hours[el.dataset.day!]?.start ?? "08:00");
        t = { kind: "slot", techId: el.dataset.tech!, ymd: el.dataset.day!, minutes: keep };
      }
      targetRef.current = t;
      setTarget(t);
    };
    const onUp = async () => {
      const st = dragRef.current!;
      const t = targetRef.current;
      dragRef.current = null; targetRef.current = null;
      setDrag(null); setPointer(null); setTarget(null);
      if (!st.moved) { setSelected(st.job.id); return; }
      if (!t) return;
      if (t.kind === "queue") {
        if (!st.job.technicianId && !st.job.scheduledStart) return;
        await schedule(st.job, { technicianId: null, start: null });
        return;
      }
      const start = ctInstant(t.ymd, t.minutes);
      // A long job (e.g. 8 h install/remodel) dropped late in the day is trimmed to the technician's
      // end of day instead of being refused; drag the card's right edge to adjust afterwards.
      let duration = st.duration;
      const dayEnd = data.technicians.find((x) => x.id === t.techId)?.hours[t.ymd]?.end;
      if (dayEnd && t.minutes + duration > hm(dayEnd) && hm(dayEnd) - t.minutes >= 30) duration = hm(dayEnd) - t.minutes;
      const end = new Date(start.getTime() + duration * 60000);
      if (st.job.technicianId === t.techId && st.job.scheduledStart && new Date(st.job.scheduledStart).getTime() === start.getTime()) return;
      // Keep the crew when moving the primary technician's card.
      const crew = st.job.crew.filter((c) => c.technicianId !== t.techId);
      await schedule(st.job, { technicianId: t.techId, start: start.toISOString(), end: end.toISOString(), crew });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [drag, data, schedule]);

  const startResize = (e: React.PointerEvent, job: BoardJob) => {
    if (e.button !== 0 || !data || !job.scheduledStart) return;
    e.stopPropagation();
    const base = durationOf(job, data.config);
    const st = { job, x0: e.clientX, base, duration: base };
    resizeRef.current = st;
    setResize(st);
  };

  useEffect(() => {
    if (!resize) return;
    const onMove = (e: PointerEvent) => {
      const st = resizeRef.current!;
      const startMin = minsOf(st.job.scheduledStart!);
      let d = st.base + (e.clientX - st.x0) / PX;
      d = Math.max(SNAP, Math.min(1440 - startMin, Math.round(d / SNAP) * SNAP));
      if (d !== st.duration) { resizeRef.current = { ...st, duration: d }; setResize(resizeRef.current); }
    };
    const onUp = async () => {
      const st = resizeRef.current!;
      resizeRef.current = null;
      setResize(null);
      if (st.duration === st.base) return;
      const start = new Date(st.job.scheduledStart!);
      const end = new Date(start.getTime() + st.duration * 60000);
      await schedule(st.job, { technicianId: st.job.technicianId, start: start.toISOString(), end: end.toISOString(), crew: st.job.crew });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [resize, schedule]);

  const match = useCallback((j: BoardJob) => {
    if (typeFilter !== "ALL" && j.jobType !== typeFilter) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return [j.name, j.appointmentNumber, j.address, j.city, j.phone, j.service, j.jobCategory].some((v) => v?.toLowerCase().includes(s));
  }, [q, typeFilter]);

  const queue = useMemo(() => (data?.unassigned ?? []).filter(match), [data, match]);
  const jobs = useMemo(() => (data?.jobs ?? []).filter(match), [data, match]);

  if (!data) {
    return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;
  }

  const boardStart = hm(data.config.boardStart), boardEnd = hm(data.config.boardEnd);
  const gridW = (boardEnd - boardStart) * PX;
  const nowParts = ctParts(new Date());
  const k = data.kpis;

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[600px] select-none">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <h1 className="text-xl font-bold text-gray-900 mr-2">Dispatch Board</h1>
        <div className="flex items-center bg-white border border-gray-200 rounded-xl">
          <button onClick={() => setDate(addDays(date, view === "week" ? -7 : -1))} className="p-2 hover:bg-gray-50 rounded-l-xl"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setDate(ctParts(new Date()).ymd)} className="px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Today</button>
          <button onClick={() => setDate(addDays(date, view === "week" ? 7 : 1))} className="p-2 hover:bg-gray-50 rounded-r-xl"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-200 rounded-xl bg-white" />
        <span className="text-sm font-semibold text-gray-700">
          {view === "day" ? dayLabel(date, { weekday: "long", month: "long", day: "numeric" }) : `Week of ${dayLabel(date, { month: "short", day: "numeric" })}`}
        </span>
        <div className="flex bg-white border border-gray-200 rounded-xl p-0.5 ml-1">
          {(["day", "week"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1 text-xs font-bold rounded-lg ${view === v ? "bg-[#0A1628] text-white" : "text-gray-500"}`}>{v === "day" ? "Day" : "Week"}</button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search calls…" className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-xl bg-white w-44" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-2 py-1.5 text-sm border border-gray-200 rounded-xl bg-white">
          <option value="ALL">All job types</option>
          {Object.entries(data.jobTypes).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          {(saving || loading) && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          <button onClick={() => load()} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50" title="Refresh"><RefreshCw className="w-4 h-4 text-gray-600" /></button>
          <Link href="/dispatcher/map" className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50" title="Live map"><MapIcon className="w-4 h-4 text-gray-600" /></Link>
          <Link href={`/dispatcher/appointments/new?date=${date}`} className="flex items-center gap-1.5 px-3 py-2 bg-[#F97316] text-white text-sm font-bold rounded-xl hover:bg-orange-600">
            <Plus className="w-4 h-4" /> New Call
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 pb-3">
        {[
          ["Scheduled", k.scheduled, "text-blue-700"], ["In progress", k.inProgress, "text-yellow-700"], ["Completed", k.completed, "text-green-700"],
          ["Unassigned", k.unassigned, k.unassigned ? "text-gray-900" : "text-gray-400"], ["Emergency", k.emergency, k.emergency ? "text-red-600" : "text-gray-400"],
          ["Canceled", k.canceled, "text-red-500"], ["Techs available", k.techsAvailable, "text-green-700"], ["Techs on job", k.techsOnJob, "text-orange-600"], ["Techs off", k.techsOff, "text-gray-500"],
        ].map(([label, value, color]) => (
          <div key={label as string} className="bg-white border border-gray-200 rounded-xl px-3 py-2">
            <p className={`text-xl font-black ${color}`}>{value as number}</p>
            <p className="text-[11px] text-gray-500 leading-tight">{label as string}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-1 min-h-0 gap-3">
        {/* Unassigned / needs scheduling queue */}
        {showQueue && (
          <aside data-drop="queue" className={`w-72 shrink-0 flex flex-col bg-white border rounded-2xl overflow-hidden ${target?.kind === "queue" ? "border-[#F97316] ring-2 ring-orange-200" : "border-gray-200"}`}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Inbox className="w-4 h-4" /> Unassigned ({queue.length})</p>
              <button onClick={() => setShowQueue(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {queue.length === 0 && <p className="text-xs text-gray-400 text-center py-8">Nothing waiting. Drop a call here to unassign it.</p>}
              {queue.map((j) => (
                <div
                  key={j.id}
                  onPointerDown={(e) => startDrag(e, j)}
                  className={`rounded-xl border-l-4 border border-gray-200 bg-white p-2.5 cursor-grab active:cursor-grabbing touch-none hover:shadow-sm ${selected === j.id ? "ring-2 ring-[#1B3FA8]" : ""} ${drag?.job.id === j.id && drag.moved ? "opacity-40" : ""}`}
                  style={{ borderLeftColor: j.color }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{j.name}</p>
                    <span className="flex items-center gap-1 shrink-0">
                      {j.isEmergency && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
                      {j.member && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 truncate">{j.jobCategory || j.service}</p>
                  <p className="text-[11px] text-gray-400 truncate">{j.address}, {j.city}</p>
                  <div className="flex items-center justify-between mt-1 text-[11px]">
                    <span className="text-gray-500">#{j.appointmentNumber}</span>
                    <span className={j.boardStatus === "HOLD" ? "text-pink-600 font-semibold" : "text-gray-500"}>
                      {j.boardStatus === "HOLD" ? "Reschedule" : j.preferredDate ? `Wants ${dayLabel(ctParts(new Date(j.preferredDate)).ymd, { month: "short", day: "numeric" })}${j.preferredTime ? ` ${j.preferredTime}` : ""}` : "No date"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Board */}
        <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-2xl overflow-auto relative">
          {!showQueue && (
            <button onClick={() => setShowQueue(true)} className="absolute z-30 top-2 left-2 flex items-center gap-1 px-2 py-1 bg-[#0A1628] text-white text-xs font-bold rounded-lg">
              <Inbox className="w-3.5 h-3.5" /> {queue.length}
            </button>
          )}

          {view === "day" ? (
            <div style={{ width: TECH_W + gridW }} className="relative">
              {/* Hours header */}
              <div className="flex sticky top-0 z-20 bg-white border-b border-gray-200">
                <div style={{ width: TECH_W }} className="shrink-0 sticky left-0 z-10 bg-white border-r border-gray-200 px-3 py-2 text-xs font-bold text-gray-500">
                  Technicians ({data.technicians.length})
                </div>
                <div className="relative h-8" style={{ width: gridW }}>
                  {Array.from({ length: Math.ceil((boardEnd - boardStart) / 60) }, (_, i) => (
                    <div key={i} className="absolute top-0 h-full border-l border-gray-200 pl-1 text-[11px] text-gray-500 pt-2" style={{ left: i * 60 * PX }}>
                      {fmtTimeCT(ctInstant(date, boardStart + i * 60)).replace(":00", "")}
                    </div>
                  ))}
                </div>
              </div>

              {data.technicians.map((t) => (
                <TechRow
                  key={t.id} tech={t} date={date} jobs={jobs} boardStart={boardStart} gridW={gridW}
                  config={data.config} selected={selected} drag={drag} target={target}
                  nowMin={nowParts.ymd === date ? nowParts.minutes : null}
                  onPointerDown={startDrag} resize={resize} onResizeStart={startResize}
                />
              ))}
              {data.technicians.length === 0 && (
                <p className="p-8 text-sm text-gray-500">No technicians yet. Add users with the Technician role in Admin → Users.</p>
              )}
            </div>
          ) : (
            <WeekGrid data={data} jobs={jobs} selected={selected} drag={drag} target={target} onPointerDown={startDrag} />
          )}
        </div>

        {/* Job details */}
        {selected && (
          <JobPanel
            key={selected}
            jobId={selected}
            technicians={data.technicians}
            jobTypes={data.jobTypes}
            defaultDate={date}
            onClose={() => setSelected(null)}
            onChanged={() => load(true)}
            schedule={schedule}
          />
        )}
      </div>

      {/* Drag ghost */}
      {drag?.moved && pointer && (
        <div className="fixed z-[60] pointer-events-none px-2 py-1 rounded-lg bg-[#0A1628] text-white text-xs font-semibold shadow-lg" style={{ left: pointer.x + 12, top: pointer.y + 12 }}>
          {drag.job.name}
          {target?.kind === "slot" && ` → ${data.technicians.find((t) => t.id === target.techId)?.name ?? ""} ${fmtTimeCT(ctInstant(target.ymd, target.minutes))}`}
          {target?.kind === "queue" && " → Unassigned"}
        </div>
      )}

      {/* Conflict confirmation */}
      {conflict && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /> Scheduling conflict</h3>
            <ul className="space-y-1.5">
              {conflict.conflicts.map((c, i) => <li key={i} className="text-sm text-gray-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">{c.message}</li>)}
            </ul>
            <p className="text-xs text-gray-500">Scheduling anyway is recorded in the job history.</p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setConflict(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">Cancel</button>
              <button
                onClick={async () => { const c = conflict; setConflict(null); await schedule(c.job, { ...c.body, force: true }); }}
                className="flex-1 py-2.5 bg-[#F97316] text-white rounded-xl text-sm font-bold"
              >
                Schedule anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm ${toast.error ? "bg-red-600 text-white" : "bg-[#0A1628] text-white"}`}>
          <span>{toast.text}</span>
          {toast.offerText && toast.jobId && (
            <button
              onClick={async () => {
                const id = toast.jobId!;
                setToast(null);
                const r = await fetch(`/api/dispatch/jobs/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "notify" }) });
                flash({ text: r.ok ? "Customer texted the new time." : "Text not sent.", error: !r.ok });
              }}
              className="px-2.5 py-1 bg-[#F97316] rounded-lg text-xs font-bold"
            >
              Text customer
            </button>
          )}
          <button onClick={() => setToast(null)}><X className="w-4 h-4 opacity-70" /></button>
        </div>
      )}
    </div>
  );
}

function JobCard({ job, style, selected, faded, crewRole, onPointerDown, onResizeStart, endOverride }: {
  job: BoardJob; style?: React.CSSProperties; selected: boolean; faded: boolean; crewRole?: string;
  onPointerDown: (e: React.PointerEvent, j: BoardJob) => void;
  onResizeStart?: (e: React.PointerEvent, j: BoardJob) => void;
  endOverride?: Date;
}) {
  const st = STATUS_STYLE[job.boardStatus];
  return (
    <div
      onPointerDown={(e) => onPointerDown(e, job)}
      style={{ ...style, borderLeftColor: job.color }}
      className={`relative rounded-lg border border-l-4 pl-2 pr-3 py-1 overflow-hidden cursor-grab active:cursor-grabbing touch-none shadow-sm hover:shadow ${st.card} ${selected ? "ring-2 ring-[#1B3FA8] z-10" : ""} ${faded ? "opacity-40" : ""} ${crewRole ? "border-dashed" : ""}`}
      title={`${job.name} — ${job.jobCategory || job.service}`}
    >
      <div className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
        <p className="text-xs font-bold truncate">{job.name}</p>
        {job.isEmergency && <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />}
        {job.member && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
        {job.crew.length > 0 && !crewRole && <Users className="w-3 h-3 shrink-0 opacity-60" />}
      </div>
      <p className="text-[11px] truncate opacity-80">{crewRole ? `${crewRole.replace("_", " ").toLowerCase()} · ` : ""}{job.jobCategory || job.service}</p>
      {job.scheduledStart && job.scheduledEnd && (
        <p className="text-[10px] opacity-60 truncate">{fmtTimeCT(new Date(job.scheduledStart))}–{fmtTimeCT(endOverride ?? new Date(job.scheduledEnd))} · {job.city}</p>
      )}
      {onResizeStart && job.scheduledStart && (
        <div
          onPointerDown={(e) => onResizeStart(e, job)}
          title="Drag to change the end time"
          className="absolute top-0 right-0 h-full w-2.5 cursor-ew-resize touch-none flex items-center justify-center group/rs"
        >
          <span className="w-1 h-6 rounded-full bg-current opacity-20 group-hover/rs:opacity-60" />
        </div>
      )}
    </div>
  );
}

function TechRow({ tech, date, jobs, boardStart, gridW, config, selected, drag, target, nowMin, onPointerDown, resize, onResizeStart }: {
  tech: BoardTech; date: string; jobs: BoardJob[]; boardStart: number; gridW: number; config: BoardData["config"];
  selected: string | null; drag: DragState | null; target: DropTarget; nowMin: number | null;
  onPointerDown: (e: React.PointerEvent, j: BoardJob) => void;
  resize?: { job: BoardJob; duration: number } | null;
  onResizeStart?: (e: React.PointerEvent, j: BoardJob) => void;
}) {
  const hours = tech.hours[date];
  const mine = jobs.filter((j) => j.scheduledStart && ctParts(new Date(j.scheduledStart)).ymd === date && (j.technicianId === tech.id || j.assignments.some((a) => a.technicianId === tech.id)));
  const ts = TECH_STATUS_STYLE[tech.status];
  const hovering = target?.kind === "slot" && target.techId === tech.id && target.ymd === date;
  const x = (m: number) => (m - boardStart) * PX;

  return (
    <div className="flex border-b border-gray-100" style={{ height: ROW_H }}>
      <div style={{ width: TECH_W }} className="shrink-0 sticky left-0 z-10 bg-white border-r border-gray-200 px-3 py-2 flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-gray-600" style={tech.color ? { boxShadow: `0 0 0 2px ${tech.color}` } : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {tech.image ? <img src={tech.image} alt="" className="w-full h-full object-cover" /> : tech.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{tech.name}</p>
          <p className="text-[11px] text-gray-500 flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${ts.dot}`} />{ts.label}{tech.role ? ` · ${tech.role.replace("_", " ").toLowerCase()}` : ""}</p>
          <p className="text-[10px] text-gray-400">{hours ? `${hours.start}–${hours.end}` : "Day off"} · {Math.round(tech.bookedMinutes / 6) / 10}h booked</p>
        </div>
      </div>
      <div data-drop="row" data-tech={tech.id} data-day={date} className="relative" style={{ width: gridW }}>
        {/* off hours */}
        {!hours ? (
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6_6px,#fafafa_6px,#fafafa_12px)]" />
        ) : (
          <>
            <div className="absolute inset-y-0 left-0 bg-gray-50" style={{ width: Math.max(0, x(hm(hours.start))) }} />
            <div className="absolute inset-y-0 right-0 bg-gray-50" style={{ left: Math.max(0, x(hm(hours.end))) }} />
          </>
        )}
        {Array.from({ length: Math.ceil(gridW / (60 * PX)) }, (_, i) => (
          <div key={i} className="absolute inset-y-0 border-l border-gray-100" style={{ left: i * 60 * PX }} />
        ))}
        {nowMin != null && nowMin >= boardStart && <div className="absolute inset-y-0 w-0.5 bg-red-500 z-[5]" style={{ left: x(nowMin) }} />}
        {hovering && drag && (
          <div className="absolute top-1.5 bottom-1.5 rounded-lg border-2 border-dashed border-[#F97316] bg-orange-100/60 z-[4]" style={{ left: x(target.minutes), width: drag.duration * PX }} />
        )}
        {mine.map((j) => {
          const s = minsOf(j.scheduledStart!);
          const resizing = resize?.job.id === j.id;
          const d = resizing ? resize!.duration : durationOf(j, config);
          const crewRole = j.technicianId === tech.id ? undefined : j.assignments.find((a) => a.technicianId === tech.id)?.role;
          return (
            <JobCard
              key={j.id + tech.id} job={j} crewRole={crewRole}
              selected={selected === j.id} faded={!!drag?.moved && drag.job.id === j.id}
              onPointerDown={onPointerDown}
              onResizeStart={crewRole || j.boardStatus === "COMPLETED" || j.boardStatus === "CANCELED" ? undefined : onResizeStart}
              endOverride={resizing ? new Date(new Date(j.scheduledStart!).getTime() + d * 60000) : undefined}
              style={{ position: "absolute", top: 6, height: ROW_H - 12, left: Math.max(0, x(s)) + 1, width: Math.max(28, d * PX - 2) }}
            />
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({ data, jobs, selected, drag, target, onPointerDown }: {
  data: BoardData; jobs: BoardJob[]; selected: string | null; drag: DragState | null; target: DropTarget;
  onPointerDown: (e: React.PointerEvent, j: BoardJob) => void;
}) {
  return (
    <table className="w-full border-collapse text-left min-w-[1100px]">
      <thead className="sticky top-0 z-20 bg-white">
        <tr>
          <th className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-3 py-2 text-xs font-bold text-gray-500 w-48">Technicians</th>
          {data.days.map((d) => (
            <th key={d} className={`border-b border-gray-200 px-2 py-2 text-xs font-bold ${d === data.today ? "text-[#F97316]" : "text-gray-600"}`}>
              <Calendar className="w-3 h-3 inline mr-1" />{dayLabel(d, { weekday: "short", month: "short", day: "numeric" })}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.technicians.map((t) => (
          <tr key={t.id} className="align-top">
            <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 px-3 py-2">
              <p className="text-sm font-semibold text-gray-900">{t.name}</p>
              <p className="text-[11px] text-gray-500">{TECH_STATUS_STYLE[t.status].label}</p>
            </td>
            {data.days.map((d) => {
              const cell = jobs
                .filter((j) => j.scheduledStart && ctParts(new Date(j.scheduledStart)).ymd === d && (j.technicianId === t.id || j.assignments.some((a) => a.technicianId === t.id)))
                .sort((a, b) => a.scheduledStart!.localeCompare(b.scheduledStart!));
              const hot = target?.kind === "slot" && target.techId === t.id && target.ymd === d && !!drag;
              const off = !t.hours[d];
              return (
                <td key={d} data-drop="cell" data-tech={t.id} data-day={d}
                  className={`border-b border-l border-gray-100 p-1.5 min-w-[140px] h-24 ${off ? "bg-gray-50" : ""} ${hot ? "bg-orange-50 outline outline-2 outline-dashed outline-[#F97316]" : ""}`}>
                  <div className="space-y-1">
                    {cell.map((j) => (
                      <JobCard key={j.id} job={j} selected={selected === j.id} faded={!!drag?.moved && drag.job.id === j.id}
                        crewRole={j.technicianId === t.id ? undefined : j.assignments.find((a) => a.technicianId === t.id)?.role}
                        onPointerDown={onPointerDown} />
                    ))}
                    {off && cell.length === 0 && <p className="text-[10px] text-gray-400">Off</p>}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
