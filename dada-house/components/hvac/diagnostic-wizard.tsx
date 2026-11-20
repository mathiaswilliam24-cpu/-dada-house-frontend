"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2, ChevronLeft, ChevronRight, Moon, Sun, AlertTriangle, ShieldAlert, Info, CheckCircle2, Zap, Wind, Thermometer, Gauge, Flame, ClipboardList, Save, ScanLine, FileText, Search, Wrench,
} from "lucide-react";
import {
  EQUIPMENT_CATEGORIES, METERING_DEVICES, COMPRESSOR_TYPES, HEATING_TYPES, COMPLAINTS, MODES, SAFETY_CHECKS, SAFETY_TAGS,
  FIELDS, buildCtx, visibleFields, isRequired, type Field, type Group, type Ctx,
} from "@/lib/hvac/catalog";
import { refrigerantInfo, REFRIGERANT_KEYS } from "@/lib/hvac/refrigerants";
import { toCanonical, fromCanonical, unitLabel, type TempUnit, type PressureUnit, type StaticUnit, type Kind } from "@/lib/hvac/units";
import type { CalcValue } from "@/lib/hvac/engine";
import type { AnalysisResult } from "@/lib/hvac/server";
import { FAULT_CATALOG, type Hypothesis } from "@/lib/hvac/rules";
import ScanPanel from "./scan-panel";

type Prefs = { temp: TempUnit; pressure: PressureUnit; static: StaticUnit };
type Measurement = { circuit: number; key: string; value: number | null; text: string | null };
type Equip = Record<string, unknown> & { specs?: Record<string, number | null> | null };
type Session = {
  id: string; status: string; step: number; complaint: string | null; complaintOther: string | null; mode: string | null; stage: string | null;
  circuits: number; equipment: Equip | null; equipmentId: string | null; safety: Record<string, boolean> | null; notes: string | null;
  measurements: Measurement[]; results: AnalysisResult | null;
  decisions: Record<string, { decision: string; note?: string | null }> | null;
  findings: Record<string, string | boolean | null> | null;
  reportNumber: string | null; reportToken: string | null;
  appointment: { id: string; appointmentNumber: string; name: string; address: string; city: string; service: string; description: string | null } | null;
};
type EquipmentRow = Record<string, unknown> & { id: string; type: string; makeModel: string | null; specsVerifiedAt: string | null };
type HistoryRow = { id: string; date: string; mode: string | null; complaint: string | null; status: string; technician: string | null; reportNumber: string | null; values: Record<string, number>; confirmed: string[] };
type ModelSpec = { id: string; manufacturer: string; modelPrefix: string; description: string | null; specs: Record<string, number | null>; sourceDocument: string; approvedByName: string | null; approvedAt: string | null };
type Suggestion = { id: string; name: string; description: string | null; category: string; price: number; unit: string | null; hasPrice: boolean };

const STEPS = [
  { n: 1, label: "Equipment", icon: ClipboardList },
  { n: 2, label: "Complaint", icon: ClipboardList },
  { n: 3, label: "Mode", icon: Gauge },
  { n: 4, label: "Safety", icon: ShieldAlert },
  { n: 5, label: "Refrigeration", icon: Thermometer, group: "refrigeration" as Group },
  { n: 6, label: "Air", icon: Wind, group: "air" as Group },
  { n: 7, label: "Electrical", icon: Zap, group: "electrical" as Group },
  { n: 8, label: "System checks", icon: Flame, group: "system" as Group },
  { n: 9, label: "Analysis", icon: CheckCircle2 },
  { n: 10, label: "Causes", icon: Search },
  { n: 11, label: "Findings", icon: Wrench },
  { n: 12, label: "Report", icon: FileText },
];
const GROUP_STEP: Record<Group, number> = { refrigeration: 5, air: 6, electrical: 7, system: 8 };

const SPEC_FIELDS: { key: string; label: string; kind: Kind; unit?: string; hint?: string }[] = [
  { key: "targetSubcooling", label: "Target subcooling", kind: "tempDiff", hint: "TXV/EEV — from the unit label or installation instructions" },
  { key: "targetSuperheat", label: "Target superheat (today's conditions)", kind: "tempDiff", hint: "Fixed orifice — from the manufacturer charging chart at today's indoor WB / outdoor DB" },
  { key: "chargeTolerance", label: "Manufacturer charge tolerance ±", kind: "tempDiff" },
  { key: "tempRiseMin", label: "Temperature rise min (furnace nameplate)", kind: "tempDiff" },
  { key: "tempRiseMax", label: "Temperature rise max (furnace nameplate)", kind: "tempDiff" },
  { key: "maxTesp", label: "Rated max external static", kind: "static" },
  { key: "ratedCfm", label: "Manufacturer airflow (blower table / required)", kind: "plain", unit: "CFM" },
  { key: "manifoldMin", label: "Manifold gas pressure min", kind: "plain", unit: "in. w.c." },
  { key: "manifoldMax", label: "Manifold gas pressure max", kind: "plain", unit: "in. w.c." },
  { key: "inletMin", label: "Inlet gas pressure min", kind: "plain", unit: "in. w.c." },
  { key: "inletMax", label: "Inlet gas pressure max", kind: "plain", unit: "in. w.c." },
];
const NUM_EQ: { key: string; label: string; unit?: string }[] = [
  { key: "capacityTons", label: "Nominal capacity", unit: "tons" }, { key: "minVoltage", label: "Min volts (nameplate)", unit: "V" },
  { key: "maxVoltage", label: "Max volts (nameplate)", unit: "V" }, { key: "rla", label: "Compressor RLA", unit: "A" },
  { key: "lra", label: "Compressor LRA", unit: "A" }, { key: "mca", label: "MCA", unit: "A" }, { key: "mocp", label: "MOCP", unit: "A" },
];

const STATUS_TXT: Record<string, string> = { CONFIRMED: "Confirmed by technician", STRONGLY_SUSPECTED: "Strongly suspected", POSSIBLE: "Possible", INSUFFICIENT_DATA: "Insufficient data", RULED_OUT: "Ruled out" };
const LEAVING: Record<string, string> = { OPERATING_NORMALLY: "Operating normally", OPERATING_TEMPORARILY: "Operating temporarily", NOT_OPERATIONAL: "Not operational", SHUT_DOWN_FOR_SAFETY: "Shut down for safety", DIAGNOSTIC_ONLY: "Diagnostic only" };
const fmt = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString();

export default function DiagnosticWizard({ id }: { id: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [equipmentList, setEquipmentList] = useState<EquipmentRow[]>([]);
  const [step, setStep] = useState(1);
  const [circuit, setCircuit] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [dark, setDark] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ temp: "F", pressure: "psig", static: "inwc" });
  const [vals, setVals] = useState<Record<string, string>>({});
  const [eqVals, setEqVals] = useState<Record<string, string>>({});
  const editing = useRef<string | null>(null);
  const [savedEquipment, setSavedEquipment] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [modelSpec, setModelSpec] = useState<ModelSpec | null>(null);
  const [estGroups, setEstGroups] = useState<{ hypothesisId: string; fault: string; items: Suggestion[] }[] | null>(null);
  const [estPick, setEstPick] = useState<Record<string, number>>({});
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const [estBusy, setEstBusy] = useState(false);
  const [calibration, setCalibration] = useState<Record<string, { n: number; hits: number; rate: number; low: number; high: number }>>({});
  const [ai, setAi] = useState<AiReview | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const [fb, setFb] = useState<Feedback | null>(null);
  const [fbSaved, setFbSaved] = useState(false);

  useEffect(() => {
    try {
      setDark(localStorage.getItem("hvac.dark") === "1");
      const p = JSON.parse(localStorage.getItem("hvac.units") ?? "null");
      if (p?.temp && p?.pressure && p?.static) setPrefs(p);
    } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("hvac.dark", dark ? "1" : "0"); } catch { /* */ } }, [dark]);
  useEffect(() => { try { localStorage.setItem("hvac.units", JSON.stringify(prefs)); } catch { /* */ } }, [prefs]);

  const load = useCallback(async () => {
    const r = await fetch(`/api/technician/hvac-diagnostic/${id}`, { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(d.error ?? "Could not load the diagnostic."); return; }
    setSession(d.session); setEquipmentList(d.equipment ?? []);
    setHistory(d.history ?? []); setModelSpec(d.modelSpec ?? null);
    setCalibration(d.calibration ?? {}); setFb(d.feedback ?? null);
    fetch(`/api/technician/hvac-diagnostic/${id}/assistant`, { cache: "no-store" }).then((x) => x.json()).then((x) => setAi(x.review ?? null)).catch(() => {});
    setStep(Math.min(12, Math.max(1, d.session.step ?? 1)));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // Display strings in the technician's units, rebuilt when data or units change (except the field being typed in).
  useEffect(() => {
    if (!session) return;
    const next: Record<string, string> = {};
    for (const m of session.measurements) {
      const f = visibleFieldsAll().find((x) => x.key === m.key);
      const k = `${m.circuit}|${m.key}`;
      if (m.value != null) next[k] = f ? fmt(fromCanonical(f.kind, m.value, prefs), 2) : String(m.value);
      else if (m.text != null) next[k] = m.text;
    }
    setVals((cur) => (editing.current && editing.current in cur ? { ...next, [editing.current]: cur[editing.current] } : next));
    const e = session.equipment ?? {};
    const ev: Record<string, string> = {};
    for (const [k, v] of Object.entries(e)) if (k !== "specs" && v != null) ev[k] = String(v);
    for (const sf of SPEC_FIELDS) {
      const v = e.specs?.[sf.key];
      if (v != null) ev[`specs.${sf.key}`] = fmt(fromCanonical(sf.kind, v, prefs), 2);
    }
    setEqVals((cur) => (editing.current && editing.current in cur ? { ...ev, [editing.current]: cur[editing.current] } : ev));
  }, [session, prefs]);

  const patch = useCallback(async (body: Record<string, unknown>) => {
    setSaving(true); setErr("");
    const r = await fetch(`/api/technician/hvac-diagnostic/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setErr(d.error ?? "Save failed"); return false; }
    setSession(d.session);
    if ("history" in d) setHistory(d.history ?? []);
    if ("modelSpec" in d) setModelSpec(d.modelSpec ?? null);
    if ("calibration" in d) setCalibration(d.calibration ?? {});
    return true;
  }, [id]);

  const eq = (session?.equipment ?? {}) as Equip;
  const ctx: Ctx = useMemo(() => buildCtx({
    category: (eq.category as string) ?? null, complaint: session?.complaint ?? null, mode: session?.mode ?? null,
    phase: (eq.phase as number) ?? null, compressorType: (eq.compressorType as string) ?? null,
  }), [eq.category, eq.phase, eq.compressorType, session?.complaint, session?.mode]);
  const results = session?.results ?? null;
  const ref = refrigerantInfo(eq.refrigerant as string);
  const circuits = session?.circuits ?? 1;
  const steps = STEPS.filter((s) => !(s.n === 5 && !ctx.refrigeration));
  const locked = session?.status === "COMPLETED";

  const c = dark
    ? { bg: "bg-[#0b1220] text-gray-100", card: "bg-[#111a2e] border-[#22304d]", muted: "text-gray-400", input: "bg-[#0b1220] border-[#2b3b5c] text-white placeholder-gray-500", chip: "bg-[#1a2540] text-gray-200", active: "bg-orange-500 text-white" }
    : { bg: "bg-gray-50 text-gray-900", card: "bg-white border-gray-200", muted: "text-gray-500", input: "bg-white border-gray-300 text-gray-900", chip: "bg-gray-100 text-gray-700", active: "bg-[#1B3FA8] text-white" };

  async function go(n: number) {
    setStep(n);
    if (session && n > session.step && !locked) await patch({ step: n });
    window.scrollTo({ top: 0 });
  }

  function saveMeasurement(f: Field, circ: number) {
    const k = `${circ}|${f.key}`;
    editing.current = null;
    if (locked) return;
    const raw = (vals[k] ?? "").trim();
    const existing = session?.measurements.find((m) => m.circuit === (f.perCircuit ? circ : 1) && m.key === f.key);
    if (f.input === "number") {
      const n = raw === "" ? null : Number(raw.replace(",", "."));
      if (n != null && !Number.isFinite(n)) { setErr(`${f.label}: not a number`); return; }
      const canonical = n == null ? null : toCanonical(f.kind, n, prefs);
      if ((existing?.value ?? null) === canonical) return;
      patch({ measurements: [{ circuit: circ, key: f.key, value: canonical, enteredValue: n, enteredUnit: unitLabel(f.kind, prefs, f.unit) }] });
    } else {
      if ((existing?.text ?? "") === raw) return;
      patch({ measurements: [{ circuit: circ, key: f.key, text: raw || null }] });
    }
  }

  function saveEq(key: string, kind?: Kind) {
    editing.current = null;
    if (locked) return;
    const raw = (eqVals[key] ?? "").trim();
    if (key.startsWith("specs.")) {
      const sk = key.slice(6);
      const n = raw === "" ? null : Number(raw.replace(",", "."));
      if (n != null && !Number.isFinite(n)) { setErr("Not a number"); return; }
      patch({ equipment: { specs: { [sk]: n == null ? null : toCanonical(kind ?? "plain", n, prefs) } } });
      return;
    }
    const numeric = NUM_EQ.some((x) => x.key === key);
    if (numeric) {
      const n = raw === "" ? null : Number(raw.replace(",", "."));
      if (n != null && !Number.isFinite(n)) { setErr("Not a number"); return; }
      patch({ equipment: { [key]: n } });
    } else {
      patch({ equipment: { [key]: raw || null } });
    }
    setSavedEquipment(false);
  }

  if (!session) {
    return <div className="flex justify-center py-20">{err ? <p className="text-sm text-red-600">{err}</p> : <Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" />}</div>;
  }

  const inputCls = `w-full rounded-xl border px-3 py-3 text-base ${c.input} disabled:opacity-60`;
  const Label = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
    <span className={`block text-xs font-semibold mb-1 ${c.muted}`}>{children}{req && <span className="text-orange-500"> *</span>}</span>
  );

  const renderField = (f: Field) => {
    const circ = f.perCircuit ? circuit : 1;
    const k = `${circ}|${f.key}`;
    const req = isRequired(f, ctx);
    const unit = f.input === "number" ? unitLabel(f.kind, prefs, f.unit) : "";
    return (
      <div key={k} className={`rounded-xl border p-3 ${c.card}`}>
        <div className="flex items-start justify-between gap-2">
          <Label req={req}>{f.label}</Label>
          {f.safety && (
            <span title={SAFETY_TAGS[f.safety].text} className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${f.safety === "LIVE" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
              {SAFETY_TAGS[f.safety].label}
            </span>
          )}
        </div>
        {f.input === "number" && (
          <div className="flex items-center gap-2">
            <input
              inputMode="decimal" value={vals[k] ?? ""} disabled={locked}
              onFocus={() => { editing.current = k; }}
              onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))}
              onBlur={() => saveMeasurement(f, circ)}
              className={inputCls}
            />
            <span className={`w-16 text-sm font-semibold ${c.muted}`}>{unit}</span>
          </div>
        )}
        {f.input === "text" && (
          <input value={vals[k] ?? ""} disabled={locked} onFocus={() => { editing.current = k; }}
            onChange={(e) => setVals((v) => ({ ...v, [k]: e.target.value }))} onBlur={() => saveMeasurement(f, circ)} className={inputCls} />
        )}
        {(f.input === "select" || f.input === "yesno") && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(f.input === "yesno" ? { YES: "Yes", NO: "No" } : f.options ?? {}).map(([val, lab]) => {
              const on = vals[k] === val;
              return (
                <button key={val} disabled={locked}
                  onClick={() => { const nv = on ? "" : val; setVals((v) => ({ ...v, [k]: nv })); patch({ measurements: [{ circuit: circ, key: f.key, text: nv || null }] }); }}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold ${on ? c.active : c.chip}`}>{lab}</button>
              );
            })}
          </div>
        )}
        {f.hint && <p className={`text-[11px] mt-1 ${c.muted}`}>{f.hint}</p>}
      </div>
    );
  };

  const calc = (key: string, circ?: number) => results?.calculated.find((x) => x.key === key && (circ == null || x.circuit === circ || x.circuit == null));
  const showCalc = (cv: CalcValue | undefined) => (cv ? `${fmt(fromCanonical(cv.kind, cv.value, prefs))} ${cv.kind === "plain" ? cv.unit : unitLabel(cv.kind, prefs)}` : "—");
  const raw = (key: string, circ: number, kind: Kind) => {
    const m = session.measurements.find((x) => x.key === key && x.circuit === circ);
    return m?.value != null ? `${fmt(fromCanonical(kind, m.value, prefs))} ${unitLabel(kind, prefs)}` : "—";
  };

  const RefDashboard = ({ circ }: { circ: number }) => (
    <div className="grid grid-cols-3 gap-2">
      {[
        ["Suction", raw("suction_psig", circ, "pressure"), "measured"],
        ["High side", raw("high_psig", circ, "pressure"), "measured"],
        ["Comp. ratio", showCalc(calc("compression_ratio", circ)), "calc"],
        ["Evap sat.", showCalc(calc("evap_sat_f", circ) ?? calc("standing_sat_f", circ)), "calc"],
        ["Cond sat.", showCalc(calc("cond_sat_bubble_f", circ)), "calc"],
        ["Discharge SH", showCalc(calc("discharge_superheat_f", circ)), "calc"],
        ["Superheat", showCalc(calc("superheat_f", circ)), "calc"],
        ["Subcooling", showCalc(calc("subcooling_f", circ)), "calc"],
        ["Evap TD", showCalc(calc("evap_td_f", circ)), "calc"],
      ].map(([l, v, kind]) => (
        <div key={l} className={`rounded-xl border p-2.5 ${c.card}`}>
          <p className={`text-[10px] uppercase font-bold ${c.muted}`}>{l} <span className={kind === "calc" ? "text-orange-500" : "text-sky-500"}>{kind === "calc" ? "calc" : "meas"}</span></p>
          <p className="text-lg font-black leading-tight">{v}</p>
        </div>
      ))}
    </div>
  );

  const aiOut = ai?.output ?? null;
  const aiStale = !!(ai && results && ai.resultsAt && results.computedAt && ai.resultsAt !== results.computedAt);
  const aiFor = (hid: string) => (aiStale ? null : aiOut?.hypotheses.find((x) => x.id === hid) ?? null);
  const askAi = async () => {
    setAiBusy(true); setAiErr("");
    const r = await fetch(`/api/technician/hvac-diagnostic/${id}/assistant`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setAiBusy(false);
    if (!r.ok) { setAiErr(d.error ?? "The AI assistant could not answer."); return; }
    setAi(d.review);
  };
  const rateAi = async (helpful: boolean) => {
    if (!ai) return;
    const r = await fetch(`/api/technician/hvac-diagnostic/${id}/assistant`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewId: ai.id, helpful }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) setAi(d.review);
  };
  const saveFb = async (body: Partial<Feedback>) => {
    setFb((f) => ({ ...(f ?? EMPTY_FB), ...body }));
    setFbSaved(false);
    const r = await fetch(`/api/technician/hvac-diagnostic/${id}/feedback`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(d.error ?? "Feedback not saved"); return; }
    setFb(d.feedback); setFbSaved(true);
  };

  const HypCard = ({ h }: { h: Hypothesis }) => {
    const dec = session.decisions?.[h.id];
    const col = h.status === "CONFIRMED" ? "bg-emerald-600 text-white" : h.status === "STRONGLY_SUSPECTED" ? "bg-orange-500 text-white" : h.status === "RULED_OUT" ? "bg-gray-400 text-white" : c.chip;
    return (
      <div className={`rounded-xl border p-3 space-y-1.5 ${c.card} ${h.safetyCritical ? "border-red-500" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-black">{h.fault}</p>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded ${col}`}>{STATUS_TXT[h.status]}</span>
        </div>
        {calibration[h.id] && h.status !== "CONFIRMED" && h.status !== "RULED_OUT" && (
          <p className={`text-xs rounded-lg px-2 py-1.5 ${dark ? "bg-indigo-950 text-indigo-100" : "bg-indigo-50 text-indigo-900"}`}>
            <b>Validated history:</b> with this status on this equipment type, the cause was verified in {calibration[h.id].hits} of {calibration[h.id].n} independently verified cases
            ({Math.round(calibration[h.id].rate * 100)} %, 95 % range {Math.round(calibration[h.id].low * 100)}–{Math.round(calibration[h.id].high * 100)} %). Still run the confirmation test.
          </p>
        )}
        {aiFor(h.id) && (
          <div className={`text-sm rounded-lg px-2 py-1.5 ${dark ? "bg-violet-950 text-violet-100" : "bg-violet-50 text-violet-900"}`}>
            <p className="text-[10px] font-bold uppercase">AI explanation</p>
            <p>{aiFor(h.id)!.explanation}</p>
            {aiFor(h.id)!.contradictions && <p className="text-xs mt-0.5 opacity-90">Contradictions: {aiFor(h.id)!.contradictions}</p>}
          </div>
        )}
        {h.support.length > 0 && <div className="text-sm"><p className="text-xs font-bold text-emerald-600">Supporting evidence</p>{h.support.map((x) => <p key={x}>✓ {x}</p>)}</div>}
        {h.contradict.length > 0 && <div className="text-sm"><p className="text-xs font-bold text-amber-600">Contradicting evidence</p>{h.contradict.map((x) => <p key={x}>✗ {x}</p>)}</div>}
        {h.missing.length > 0 && <div className="text-sm"><p className={`text-xs font-bold ${c.muted}`}>Missing evidence</p>{h.missing.map((x) => <p key={x} className={c.muted}>? {x}</p>)}</div>}
        <p className="text-sm"><b>Confirmation test:</b> {h.confirmationTest}</p>
        {h.safety && <p className="text-sm text-red-500"><b>Safety:</b> {h.safety}</p>}
        {h.fieldRules.length > 0 && <p className={`text-[11px] ${c.muted}`}>Field rule (company, not manufacturer): {h.fieldRules.join("; ")}</p>}
        {h.status === "CONFIRMED" && (
          <div className={`text-sm rounded-lg p-2 ${c.chip}`}>
            {h.corrective.repair && <p>• Repair: {h.corrective.repair}</p>}
            {h.corrective.clean && <p>• Clean: {h.corrective.clean}</p>}
            {h.corrective.adjust && <p>• Adjust: {h.corrective.adjust}</p>}
            {h.corrective.replace && <p>• Replace: {h.corrective.replace}</p>}
            <p>• Verify afterwards: {h.corrective.verify}</p>
          </div>
        )}
        {!locked && (
          <>
            <input value={noteDraft[h.id] ?? dec?.note ?? ""} onChange={(e) => setNoteDraft((d) => ({ ...d, [h.id]: e.target.value }))} placeholder="Note (what the confirmation test showed)" className={`${inputCls} text-sm py-2`} />
            <div className="flex gap-1.5">
              <button onClick={() => patch({ decisions: { [h.id]: dec?.decision === "CONFIRMED" ? null : { decision: "CONFIRMED", note: noteDraft[h.id] ?? dec?.note ?? null } } })}
                className={`flex-1 py-2 rounded-lg text-sm font-bold ${dec?.decision === "CONFIRMED" ? "bg-emerald-600 text-white" : c.chip}`}>{dec?.decision === "CONFIRMED" ? "✓ Confirmed" : "Confirm"}</button>
              <button onClick={() => patch({ decisions: { [h.id]: dec?.decision === "REJECTED" ? null : { decision: "REJECTED", note: noteDraft[h.id] ?? dec?.note ?? null } } })}
                className={`flex-1 py-2 rounded-lg text-sm font-bold ${dec?.decision === "REJECTED" ? "bg-gray-500 text-white" : c.chip}`}>{dec?.decision === "REJECTED" ? "Ruled out" : "Rule out"}</button>
            </div>
          </>
        )}
      </div>
    );
  };

  const alerts = results?.alerts ?? [];
  const critical = alerts.filter((a) => a.severity === "CRITICAL");
  const curStep = steps.find((s) => s.n === step) ?? steps[0];
  const idx = steps.findIndex((s) => s.n === curStep.n);

  return (
    <div className={`-mx-4 -mt-4 min-h-screen px-4 pt-4 pb-28 ${c.bg}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Link href="/technician/hvac-diagnostic" className={`p-2 rounded-lg ${c.chip}`}><ChevronLeft className="w-4 h-4" /></Link>
        <div className="flex-1 min-w-0">
          <p className="font-black truncate">{session.appointment?.name ?? "Diagnostic"} {session.appointment && <span className={`text-xs font-semibold ${c.muted}`}>#{session.appointment.appointmentNumber}</span>}</p>
          <p className={`text-xs truncate ${c.muted}`}>{session.appointment ? `${session.appointment.address}, ${session.appointment.city}` : ""}</p>
        </div>
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className={`w-4 h-4 ${c.muted}`} />}
        {!locked && <button onClick={() => setScanOpen(true)} className="px-2.5 py-2 rounded-lg bg-orange-500 text-white text-xs font-bold flex items-center gap-1" title="Scan nameplate / gauges with AI"><ScanLine className="w-4 h-4" /> Scan</button>}
        <button onClick={() => setDark((d) => !d)} className={`p-2 rounded-lg ${c.chip}`} title="Dark mode">{dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
      </div>

      {/* Units */}
      <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
        {([["temp", ["F", "C"], ["°F", "°C"]], ["pressure", ["psig", "kPag", "barg"], ["psig", "kPa", "bar"]], ["static", ["inwc", "Pa"], ["in.wc", "Pa"]]] as const).map(([k, opts, labels]) => (
          <div key={k} className={`flex rounded-lg overflow-hidden ${c.chip}`}>
            {opts.map((o, i) => (
              <button key={o} onClick={() => setPrefs((p) => ({ ...p, [k]: o }))} className={`px-2.5 py-1.5 font-bold ${prefs[k] === o ? c.active : ""}`}>{labels[i]}</button>
            ))}
          </div>
        ))}
      </div>

      {/* Critical banner — always visible */}
      {critical.length > 0 && (
        <div className="mb-3 rounded-xl bg-red-600 text-white p-3 space-y-1.5">
          <p className="font-black flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> SAFETY — STOP</p>
          {critical.map((a) => <p key={a.code} className="text-sm"><b>{a.message}.</b> {a.action}</p>)}
        </div>
      )}

      {/* Stepper */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        {steps.map((s, i) => (
          <button key={s.n} onClick={() => go(s.n)} className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold ${s.n === curStep.n ? c.active : c.chip}`}>{i + 1}. {s.label}</button>
        ))}
      </div>
      {err && <p className="mb-3 text-sm text-red-500">{err}</p>}
      {locked && <p className="mb-3 text-sm text-amber-600">This diagnostic is completed and locked.</p>}

      {/* ── Step 1: equipment ── */}
      {curStep.n === 1 && (
        <div className="space-y-3">
          {modelSpec && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 text-sm space-y-1.5">
              <p className="font-bold">Approved manufacturer data on file — {modelSpec.manufacturer} {modelSpec.modelPrefix}*</p>
              <p className="text-xs">{Object.entries(modelSpec.specs).filter(([, v]) => v != null).map(([k, v]) => `${SPEC_FIELDS.find((x) => x.key === k)?.label ?? k}: ${v}`).join(" · ")}</p>
              <p className="text-[11px] opacity-80">Source: {modelSpec.sourceDocument}{modelSpec.approvedByName ? ` · approved by ${modelSpec.approvedByName}` : ""}. Check it matches this unit before using it.</p>
              {!locked && <button onClick={() => patch({ equipment: { specs: modelSpec.specs } })} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold">Use these values</button>}
            </div>
          )}
          {equipmentList.length > 0 && (
            <div className={`rounded-xl border p-3 ${c.card}`}>
              <Label>Customer equipment on file</Label>
              <div className="flex flex-wrap gap-1.5">
                {equipmentList.map((e) => (
                  <button key={e.id} disabled={locked} onClick={() => patch({ equipmentId: e.id })}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold text-left ${session.equipmentId === e.id ? c.active : c.chip}`}>
                    {(e.makeModel as string) || e.type}{e.serialNumber ? ` · ${e.serialNumber}` : ""}
                  </button>
                ))}
                <button disabled={locked} onClick={() => patch({ equipmentId: null })} className={`px-3 py-2 rounded-lg text-sm font-semibold ${!session.equipmentId ? c.active : c.chip}`}>+ New equipment</button>
              </div>
            </div>
          )}
          <div className={`rounded-xl border p-3 ${c.card}`}>
            <Label req>Equipment type</Label>
            <select value={(eq.category as string) ?? ""} disabled={locked} onChange={(e) => patch({ equipment: { category: e.target.value || null } })} className={inputCls}>
              <option value="">— Select —</option>
              {["Residential", "Commercial"].map((g) => (
                <optgroup key={g} label={g}>
                  {Object.entries(EQUIPMENT_CATEGORIES).filter(([, v]) => v.group === g).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[["manufacturer", "Manufacturer"], ["modelNumber", "Model number"], ["serialNumber", "Serial number"], ["indoorModel", "Indoor / coil model"], ["age", "Approx. age"], ["location", "Location"], ["ratedVoltage", "Rated voltage"]].map(([k, l]) => (
              <label key={k} className={`rounded-xl border p-3 ${c.card}`}>
                <Label>{l}</Label>
                <input value={eqVals[k] ?? ""} disabled={locked} onFocus={() => { editing.current = k; }} onChange={(e) => setEqVals((v) => ({ ...v, [k]: e.target.value }))} onBlur={() => saveEq(k)} className={inputCls} />
              </label>
            ))}
            <label className={`rounded-xl border p-3 ${c.card}`}>
              <Label>Phase</Label>
              <div className="flex gap-1.5">
                {[1, 3].map((p) => <button key={p} disabled={locked} onClick={() => patch({ equipment: { phase: p } })} className={`flex-1 py-2.5 rounded-lg font-bold ${eq.phase === p ? c.active : c.chip}`}>{p}-phase</button>)}
              </div>
            </label>
          </div>
          {ctx.refrigeration && (
            <div className={`rounded-xl border p-3 space-y-2 ${c.card}`}>
              <Label req>Refrigerant (nameplate)</Label>
              <div className="flex flex-wrap gap-1.5">
                {REFRIGERANT_KEYS.map((k) => {
                  const info = refrigerantInfo(k)!;
                  return (
                    <button key={k} disabled={locked} onClick={() => patch({ equipment: { refrigerant: k } })} className={`px-3 py-2 rounded-lg text-sm font-bold ${eq.refrigerant === k ? c.active : c.chip}`}>
                      {info.label} <span className="text-[10px] opacity-70">{info.safetyClass}{info.verified ? "" : " · verify"}</span>
                    </button>
                  );
                })}
              </div>
              {ref?.hasGlide && <p className={`text-[11px] ${c.muted}`}>{ref.label} has temperature glide: superheat uses the dew point, subcooling the bubble point.</p>}
              <div className="grid grid-cols-2 gap-2">
                <div><Label req>Metering device</Label>
                  <select value={(eq.meteringDevice as string) ?? ""} disabled={locked} onChange={(e) => patch({ equipment: { meteringDevice: e.target.value || null } })} className={inputCls}>
                    <option value="">—</option>{Object.entries(METERING_DEVICES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div><Label>Compressor type</Label>
                  <select value={(eq.compressorType as string) ?? ""} disabled={locked} onChange={(e) => patch({ equipment: { compressorType: e.target.value || null } })} className={inputCls}>
                    <option value="">—</option>{Object.entries(COMPRESSOR_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div><Label>Refrigeration circuits</Label>
                  <select value={String(circuits)} disabled={locked} onChange={(e) => patch({ circuits: Number(e.target.value), equipment: { circuits: Number(e.target.value) } })} className={inputCls}>
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select></div>
                <div><Label>Heating type</Label>
                  <select value={(eq.heatingType as string) ?? ""} disabled={locked} onChange={(e) => patch({ equipment: { heatingType: e.target.value || null } })} className={inputCls}>
                    <option value="">—</option>{Object.entries(HEATING_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {NUM_EQ.map((x) => (
              <label key={x.key} className={`rounded-xl border p-3 ${c.card}`}>
                <Label>{x.label}</Label>
                <div className="flex items-center gap-1.5">
                  <input inputMode="decimal" value={eqVals[x.key] ?? ""} disabled={locked} onFocus={() => { editing.current = x.key; }} onChange={(e) => setEqVals((v) => ({ ...v, [x.key]: e.target.value }))} onBlur={() => saveEq(x.key)} className={inputCls} />
                  <span className={`text-xs font-semibold ${c.muted}`}>{x.unit}</span>
                </div>
              </label>
            ))}
          </div>
          <details className={`rounded-xl border p-3 ${c.card}`}>
            <summary className="font-bold text-sm cursor-pointer">Manufacturer specifications (charging targets, temperature rise, static, gas)</summary>
            <p className={`text-[11px] mt-1 mb-2 ${c.muted}`}>Only enter values from the manufacturer&apos;s label, charging chart or installation instructions. They are never assumed.</p>
            <div className="grid grid-cols-2 gap-2">
              {SPEC_FIELDS.map((sf) => {
                const k = `specs.${sf.key}`;
                return (
                  <label key={k} className="block">
                    <Label>{sf.label}</Label>
                    <div className="flex items-center gap-1.5">
                      <input inputMode="decimal" value={eqVals[k] ?? ""} disabled={locked} onFocus={() => { editing.current = k; }} onChange={(e) => setEqVals((v) => ({ ...v, [k]: e.target.value }))} onBlur={() => saveEq(k, sf.kind)} className={inputCls} />
                      <span className={`text-xs font-semibold ${c.muted}`}>{sf.kind === "plain" ? sf.unit : unitLabel(sf.kind, prefs)}</span>
                    </div>
                    {sf.hint && <span className={`text-[10px] ${c.muted}`}>{sf.hint}</span>}
                  </label>
                );
              })}
            </div>
          </details>
          {!locked && (
            <button onClick={async () => { if (await patch({ saveEquipment: true })) { setSavedEquipment(true); load(); } }}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold">
              {savedEquipment ? "✓ Saved to the customer's equipment" : "I verified these values on the nameplate — save to customer equipment"}
            </button>
          )}
          <p className={`text-[11px] ${c.muted}`}>Nameplate photo reading (OCR) arrives in a later phase — values are typed and verified by the technician.</p>
        </div>
      )}

      {/* ── Step 2: complaint ── */}
      {curStep.n === 2 && (
        <div className="space-y-3">
          {session.appointment?.description && <p className={`text-sm rounded-xl border p-3 ${c.card}`}><b>Customer said:</b> {session.appointment.description}</p>}
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(COMPLAINTS).map(([k, l]) => (
              <button key={k} disabled={locked} onClick={() => patch({ complaint: k })} className={`py-3 px-3 rounded-xl text-sm font-bold text-left ${session.complaint === k ? c.active : c.chip}`}>{l}</button>
            ))}
          </div>
          {session.complaint === "OTHER" && (
            <textarea defaultValue={session.complaintOther ?? ""} disabled={locked} onBlur={(e) => patch({ complaintOther: e.target.value })} rows={3} className={inputCls} placeholder="Describe the complaint" />
          )}
        </div>
      )}

      {/* ── Step 3: mode ── */}
      {curStep.n === 3 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(MODES).map(([k, l]) => (
              <button key={k} disabled={locked} onClick={() => patch({ mode: k })} className={`py-3 px-3 rounded-xl text-sm font-bold text-left ${session.mode === k ? c.active : c.chip}`}>{l}</button>
            ))}
          </div>
          {session.mode === "HEATING_HP" && <p className={`text-xs rounded-xl border p-3 ${c.card}`}>Heat pump in heating: the vapor-line service valve is on the discharge side. Read true suction at the compressor/accumulator port when available, and follow the manufacturer&apos;s heating-mode procedure.</p>}
          {ctx.inverter && <p className={`text-xs rounded-xl border p-3 ${c.card}`}>Inverter equipment: put the unit in the manufacturer&apos;s service / test mode (fixed frequency) before taking readings, if it has one.</p>}
        </div>
      )}

      {/* ── Step 4: safety ── */}
      {curStep.n === 4 && (
        <div className="space-y-2">
          <p className={`text-sm ${c.muted}`}>Check before any measurement. A critical answer stops the diagnostic with instructions.</p>
          {ref && ref.safetyClass.startsWith("A2") && <p className="rounded-xl bg-amber-100 text-amber-900 text-sm p-3"><b>A2L refrigerant ({ref.label}).</b> A2L-rated tools and leak detector, no ignition sources, follow the manufacturer&apos;s A2L instructions.</p>}
          {SAFETY_CHECKS.filter((s) => !("show" in s) || !s.show || s.show(ctx)).map((s) => {
            const on = !!session.safety?.[s.key];
            return (
              <button key={s.key} disabled={locked} onClick={() => patch({ safety: { [s.key]: !on } })}
                className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 ${on ? (s.critical ? "bg-red-600 border-red-600 text-white" : "bg-amber-500 border-amber-500 text-white") : c.card}`}>
                <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${on ? "border-white" : "border-gray-400"}`}>{on ? "✓" : ""}</span>
                <span className="flex-1 text-sm font-semibold">{s.label}{s.critical && <span className="text-[10px] font-black ml-1 opacity-80">CRITICAL</span>}</span>
              </button>
            );
          })}
          <p className={`text-[11px] ${c.muted}`}>None checked = no hazard observed. Never bypass a safety control to test equipment.</p>
        </div>
      )}

      {/* ── Steps 5–8: measurements ── */}
      {"group" in curStep && curStep.group && (
        <div className="space-y-2.5">
          {curStep.group === "refrigeration" && (
            <>
              {!ref && <p className="rounded-xl bg-amber-100 text-amber-900 text-sm p-3">Select the refrigerant in step 1 to calculate saturation, superheat and subcooling.</p>}
              {circuits > 1 && (
                <div className="flex gap-1.5">
                  {Array.from({ length: circuits }, (_, i) => i + 1).map((n) => (
                    <button key={n} onClick={() => setCircuit(n)} className={`flex-1 py-2 rounded-lg font-bold text-sm ${circuit === n ? c.active : c.chip}`}>Circuit {n}</button>
                  ))}
                </div>
              )}
              <RefDashboard circ={circuit} />
            </>
          )}
          {curStep.group !== "refrigeration" && circuits > 1 && visibleFields(ctx, curStep.group).some((f) => f.perCircuit) && (
            <div className="flex gap-1.5">
              {Array.from({ length: circuits }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setCircuit(n)} className={`flex-1 py-2 rounded-lg font-bold text-sm ${circuit === n ? c.active : c.chip}`}>Circuit {n}</button>
              ))}
            </div>
          )}
          {(() => {
            const fields = visibleFields(ctx, curStep.group);
            const req = fields.filter((f) => isRequired(f, ctx));
            const opt = fields.filter((f) => !isRequired(f, ctx));
            return (
              <>
                {req.length > 0 && <p className={`text-xs font-bold uppercase ${c.muted}`}>Needed for this complaint</p>}
                {req.map(renderField)}
                {opt.length > 0 && (
                  <details open={req.length === 0} className="space-y-2">
                    <summary className={`text-xs font-bold uppercase cursor-pointer ${c.muted}`}>Additional measurements ({opt.length})</summary>
                    <div className="space-y-2.5 mt-2">{opt.map(renderField)}</div>
                  </details>
                )}
                {fields.length === 0 && <p className={`text-sm ${c.muted}`}>Nothing to record here for this equipment.</p>}
              </>
            );
          })()}
        </div>
      )}

      {/* ── Step 9: results ── */}
      {curStep.n === 9 && results && (
        <div className="space-y-3">
          <div className={`rounded-xl border p-3 text-xs ${c.card}`}>
            <p><b>Equipment:</b> {[eq.manufacturer, eq.modelNumber].filter(Boolean).join(" ") || "—"} · {EQUIPMENT_CATEGORIES[eq.category as keyof typeof EQUIPMENT_CATEGORIES]?.label ?? "type not set"}{ref ? ` · ${ref.label}` : ""}</p>
            <p><b>Complaint:</b> {session.complaint ? COMPLAINTS[session.complaint as keyof typeof COMPLAINTS] : "—"} · <b>Mode:</b> {session.mode ? MODES[session.mode as keyof typeof MODES] : "—"}</p>
            <p className={c.muted}>{results.engineVersion} · refrigerant data {results.ptDataVersion}</p>
          </div>

          {results.rules && (
            <div className={`rounded-xl border p-3 ${c.card}`}>
              <p className="font-bold text-sm">{results.rules.summary}</p>
              {results.rules.hypotheses.filter((h) => h.status !== "RULED_OUT").slice(0, 3).map((h) => (
                <p key={h.id} className="text-sm mt-1">• {h.fault} — <span className="font-semibold">{STATUS_TXT[h.status]}</span></p>
              ))}
              {results.rules.hypotheses.length > 0 && <button onClick={() => go(10)} className="mt-2 text-sm font-bold text-orange-500">Review causes &amp; confirmation tests →</button>}
            </div>
          )}
          {(results.rules?.nextMeasurements.length ?? 0) > 0 && (
            <div className={`rounded-xl border p-3 ${c.card}`}>
              <p className="font-bold text-sm mb-1.5">Next most useful measurements</p>
              {results.rules.nextMeasurements.map((n) => {
                const f = visibleFieldsAll().find((x) => x.key === n.key);
                return (
                  <button key={n.key} onClick={() => f && go(GROUP_STEP[f.group])} className={`w-full text-left px-2 py-1.5 rounded-lg text-sm mb-1 ${c.chip}`}>
                    <b>{f?.label ?? n.key}</b> <span className={`text-xs ${c.muted}`}>{n.reason}</span>
                  </button>
                );
              })}
            </div>
          )}
          {results.missing.length > 0 && (
            <div className={`rounded-xl border p-3 ${c.card}`}>
              <p className="font-bold text-sm mb-1.5">Still needed for a reliable analysis ({results.missing.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {results.missing.map((m) => {
                  const f = visibleFieldsAll().find((x) => x.key === m.key);
                  return <button key={`${m.key}${m.circuit ?? ""}`} onClick={() => f && go(GROUP_STEP[f.group])} className={`px-2 py-1 rounded-lg text-xs font-semibold ${c.chip}`}>{m.label}{m.circuit ? ` (C${m.circuit})` : ""}</button>;
                })}
              </div>
            </div>
          )}

          {alerts.filter((a) => a.severity !== "CRITICAL").map((a) => (
            <div key={`${a.code}${a.circuit ?? ""}`} className={`rounded-xl p-3 text-sm flex gap-2 ${a.severity === "WARNING" ? "bg-amber-100 text-amber-900" : dark ? "bg-sky-950 text-sky-100" : "bg-sky-50 text-sky-900"}`}>
              {a.severity === "WARNING" ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : <Info className="w-4 h-4 shrink-0 mt-0.5" />}
              <p>{a.circuit && circuits > 1 ? <b>Circuit {a.circuit}: </b> : null}{a.message}{a.action ? <span className="block text-xs mt-0.5 opacity-80">{a.action}</span> : null}</p>
            </div>
          ))}

          {results.charge.map((ch) => (
            <div key={ch.circuit} className={`rounded-xl border p-3 ${c.card}`}>
              <p className="text-xs font-bold uppercase flex items-center gap-2">
                Refrigerant charge check{circuits > 1 ? ` — circuit ${ch.circuit}` : ""}
                <span className={`px-1.5 py-0.5 rounded text-[10px] ${ch.status === "WITHIN_TARGET" ? "bg-emerald-100 text-emerald-800" : ch.status === "OUTSIDE_TARGET" ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-700"}`}>
                  {{ WITHIN_TARGET: "Within manufacturer target", OUTSIDE_TARGET: "Outside manufacturer target", DEVIATION_ONLY: "Deviation only", INSUFFICIENT_DATA: "Insufficient data", NOT_APPLICABLE: "Not applicable" }[ch.status]}
                </span>
              </p>
              <p className="text-sm mt-1">{ch.reason}</p>
            </div>
          ))}

          {ctx.refrigeration && Array.from({ length: circuits }, (_, i) => i + 1).map((n) => (
            <div key={n} className="space-y-1.5">{circuits > 1 && <p className="text-xs font-bold">Circuit {n}</p>}<RefDashboard circ={n} /></div>
          ))}

          {history.length > 0 && (
            <div className={`rounded-xl border overflow-x-auto ${c.card}`}>
              <p className="px-3 py-2 font-bold text-sm">History on this equipment</p>
              <table className="min-w-full text-xs">
                <thead><tr className={c.muted}>
                  <th className="px-2 py-1 text-left">Date</th>
                  {[["superheat_f", "SH"], ["subcooling_f", "SC"], ["evap_sat_f", "Evap"], ["cond_sat_bubble_f", "Cond"], ["air_dt_f", "ΔT"], ["comp_pct_rla", "%RLA"]].map(([, l]) => <th key={l} className="px-2 py-1 text-right">{l}</th>)}
                  <th className="px-2 py-1 text-left">Confirmed</th>
                </tr></thead>
                <tbody>
                  <tr className="font-bold">
                    <td className="px-2 py-1">Today</td>
                    {["superheat_f", "subcooling_f", "evap_sat_f", "cond_sat_bubble_f", "air_dt_f", "comp_pct_rla"].map((k) => { const v = calc(k, 1); return <td key={k} className="px-2 py-1 text-right">{v ? fmt(fromCanonical(v.kind, v.value, prefs)) : "—"}</td>; })}
                    <td className="px-2 py-1">{results.rules.hypotheses.filter((h) => h.status === "CONFIRMED").map((h) => h.fault).join("; ") || "—"}</td>
                  </tr>
                  {history.map((h) => (
                    <tr key={h.id} className={`border-t ${dark ? "border-[#22304d]" : "border-gray-100"}`}>
                      <td className="px-2 py-1 whitespace-nowrap">{new Date(h.date).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "2-digit" })}</td>
                      {[["superheat_f", "tempDiff"], ["subcooling_f", "tempDiff"], ["evap_sat_f", "temp"], ["cond_sat_bubble_f", "temp"], ["air_dt_f", "tempDiff"], ["comp_pct_rla", "plain"]].map(([k, kind]) => (
                        <td key={k} className="px-2 py-1 text-right">{h.values[k] != null ? fmt(fromCanonical(kind as Kind, h.values[k], prefs)) : "—"}</td>
                      ))}
                      <td className="px-2 py-1">{h.confirmed.join("; ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={`rounded-xl border overflow-hidden ${c.card}`}>
            <p className="px-3 py-2 font-bold text-sm">Calculated values</p>
            {results.calculated.length === 0 && <p className={`px-3 pb-3 text-sm ${c.muted}`}>Enter measurements to see calculations.</p>}
            {results.calculated.map((cv) => (
              <div key={`${cv.key}${cv.circuit ?? ""}`} className={`px-3 py-2 border-t ${dark ? "border-[#22304d]" : "border-gray-100"}`}>
                <div className="flex justify-between gap-2"><span className="text-sm">{cv.label}{cv.circuit && circuits > 1 ? ` (C${cv.circuit})` : ""}</span><span className="font-black">{showCalc(cv)}</span></div>
                <p className={`text-[11px] ${c.muted}`}>{cv.formula}{cv.note ? ` — ${cv.note}` : ""}</p>
              </div>
            ))}
          </div>

          <div className={`rounded-xl border p-3 ${c.card}`}>
            <Label>Technician notes</Label>
            <textarea defaultValue={session.notes ?? ""} disabled={locked} onBlur={(e) => patch({ notes: e.target.value })} rows={3} className={inputCls} />
          </div>
          {!locked && session.status !== "ANALYZED" && (
            <button onClick={() => patch({ status: "ANALYZED" })} className="w-full py-3 rounded-xl bg-[#1B3FA8] text-white font-bold">Save analysis</button>
          )}
        </div>
      )}

      {scanOpen && (
        <ScanPanel sessionId={session.id} dark={dark} onClose={() => setScanOpen(false)}
          onApplied={(s) => { setSession(s as Session); setScanOpen(false); setStep(9); window.scrollTo({ top: 0 }); }} />
      )}

      {/* ── Step 10: probable causes ── */}
      {curStep.n === 10 && results && (
        <div className="space-y-3">
          <p className={`text-sm rounded-xl border p-3 ${c.card}`}>{results.rules.summary}</p>
          {results.rules.hypotheses.length > 0 && (
            <div className={`rounded-xl border p-3 space-y-2 ${c.card}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-sm">AI assistant</p>
                <button disabled={aiBusy} onClick={askAi} className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold disabled:opacity-50">
                  {aiBusy ? "Thinking…" : ai ? (aiStale ? "Explain again (data changed)" : "Explain again") : "Explain these results"}
                </button>
              </div>
              <p className={`text-[11px] ${c.muted}`}>Explanations only. The engine's calculations, statuses and ranking are authoritative; the AI cannot add readings, specs or confidence numbers, and anything it writes that is not in your data is removed.</p>
              {aiErr && <p className="text-sm text-red-500">{aiErr}</p>}
              {aiOut && (
                <div className={`space-y-1.5 text-sm ${aiStale ? "opacity-60" : ""}`}>
                  {aiStale && <p className="text-xs font-bold text-amber-600">Measurements changed after this explanation — ask again.</p>}
                  {aiOut.overview && <p>{aiOut.overview}</p>}
                  {aiOut.nextTest && (aiOut.nextTest.key || aiOut.nextTest.why) && (
                    <button onClick={() => { const f = aiOut.nextTest?.key ? visibleFieldsAll().find((x) => x.key === aiOut.nextTest!.key) : null; if (f) go(GROUP_STEP[f.group]); }}
                      className={`w-full text-left rounded-lg px-2 py-1.5 ${c.chip}`}>
                      <b>Next best check{aiOut.nextTest.label ? `: ${aiOut.nextTest.label}` : ""}</b>
                      {aiOut.nextTest.why && <span className="block text-xs">{aiOut.nextTest.why}</span>}
                    </button>
                  )}
                  {aiOut.missingInfo.length > 0 && <div><p className="text-xs font-bold">Still unknown</p>{aiOut.missingInfo.map((x) => <p key={x} className="text-xs">• {x}</p>)}</div>}
                  {aiOut.rankingComment && <p className="text-xs"><b>On the ranking:</b> {aiOut.rankingComment}</p>}
                  {aiOut.cautions.length > 0 && <div className="text-red-500">{aiOut.cautions.map((x) => <p key={x} className="text-xs">⚠ {x}</p>)}</div>}
                  {ai!.removedCount > 0 && <p className={`text-[11px] ${c.muted}`}>{ai!.removedCount} statement(s) removed because they were not supported by your data.</p>}
                  <div className="flex items-center gap-2 pt-1">
                    <span className={`text-xs ${c.muted}`}>Was this useful?</span>
                    <button onClick={() => rateAi(true)} className={`px-2 py-1 rounded text-xs font-bold ${ai!.helpful === true ? "bg-emerald-600 text-white" : c.chip}`}>Yes</button>
                    <button onClick={() => rateAi(false)} className={`px-2 py-1 rounded text-xs font-bold ${ai!.helpful === false ? "bg-gray-500 text-white" : c.chip}`}>No</button>
                  </div>
                </div>
              )}
            </div>
          )}
          {results.rules.hypotheses.length === 0 && <p className={`text-sm ${c.muted}`}>No hypothesis yet — record more measurements (see Analysis).</p>}
          {results.rules.hypotheses.map((h) => <HypCard key={h.id} h={h} />)}
          <p className={`text-[11px] ${c.muted}`}>{results.rules.rulesetVersion}. Statuses come from the evidence. A percentage appears only where the current engine version has been measured on enough independently verified cases for this equipment type, fault and status.</p>
        </div>
      )}

      {/* ── Step 11: verified findings & repairs ── */}
      {curStep.n === 11 && (
        <div className="space-y-2.5">
          {[["verifiedFindings", "Verified findings"], ["repairsPerformed", "Repairs performed"], ["partsUsed", "Parts used"], ["recommendations", "Recommendations to the customer"]].map(([k, l]) => (
            <div key={k} className={`rounded-xl border p-3 ${c.card}`}>
              <Label>{l}</Label>
              <textarea defaultValue={(session.findings?.[k] as string) ?? ""} disabled={locked} rows={3} onBlur={(e) => patch({ findings: { [k]: e.target.value } })} className={inputCls} />
            </div>
          ))}
          <div className={`rounded-xl border p-3 ${c.card}`}>
            <Label req>System status when leaving</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(LEAVING).map(([k, l]) => (
                <button key={k} disabled={locked} onClick={() => patch({ findings: { statusOnLeaving: k } })}
                  className={`py-2.5 px-2 rounded-lg text-sm font-bold ${session.findings?.statusOnLeaving === k ? (k === "SHUT_DOWN_FOR_SAFETY" ? "bg-red-600 text-white" : c.active) : c.chip}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className={`rounded-xl border p-3 space-y-2 ${c.card}`}>
            <Label>Customer acknowledgment</Label>
            <input defaultValue={(session.findings?.customerName as string) ?? session.appointment?.name ?? ""} disabled={locked} onBlur={(e) => patch({ findings: { customerName: e.target.value } })} className={inputCls} placeholder="Customer name" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="w-5 h-5" disabled={locked} checked={!!session.findings?.customerAcknowledged} onChange={(e) => patch({ findings: { customerAcknowledged: e.target.checked } })} />
              The findings and recommendations were reviewed with the customer
            </label>
          </div>
        </div>
      )}

      {/* ── Step 12: report ── */}
      {curStep.n === 12 && (
        <div className="space-y-3">
          <div className={`rounded-xl border p-3 text-sm ${c.card}`}>
            <p className="font-bold mb-1">{session.reportNumber ?? "Not completed yet"}</p>
            <p className={c.muted}>Confirmed findings: {results?.rules.hypotheses.filter((h) => h.status === "CONFIRMED").map((h) => h.fault).join("; ") || "none"}</p>
            <p className={c.muted}>Status when leaving: {session.findings?.statusOnLeaving ? LEAVING[session.findings.statusOnLeaving as string] : "— (set it in Findings)"}</p>
          </div>
          <a href={`/api/technician/hvac-diagnostic/${session.id}/report`} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold ${c.chip}`}>
            <FileText className="w-4 h-4" /> {locked ? "Open the PDF report" : "Preview the PDF (draft)"}
          </a>
          {!locked && (
            <button onClick={async () => { if (await patch({ complete: true })) window.scrollTo({ top: 0 }); }} className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-black">
              Complete &amp; lock the diagnostic
            </button>
          )}
          {locked && session.reportToken && (
            <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/api/hvac-reports/${session.reportToken}`); }} className={`w-full py-3 rounded-xl font-bold ${c.chip}`}>
              Copy the customer report link
            </button>
          )}
          <div className={`rounded-xl border p-3 space-y-2 ${c.card}`}>
            <p className="font-bold text-sm">Repair estimate</p>
            {(estimateId ?? (session.findings?.estimateId as string | undefined)) ? (
              <Link href={`/technician/estimates/${estimateId ?? session.findings?.estimateId}`} className="block text-center py-2.5 rounded-lg bg-[#1B3FA8] text-white font-bold text-sm">Open the draft estimate</Link>
            ) : !results?.rules.hypotheses.some((h) => h.status === "CONFIRMED") ? (
              <p className={`text-xs ${c.muted}`}>Confirm at least one finding (step Causes) to build an estimate from the price book.</p>
            ) : estGroups === null ? (
              <button disabled={estBusy} onClick={async () => {
                setEstBusy(true);
                const r = await fetch(`/api/technician/hvac-diagnostic/${session.id}/estimate`, { cache: "no-store" });
                const d = await r.json().catch(() => ({}));
                setEstBusy(false);
                if (!r.ok) { setErr(d.error ?? "Could not load the price book"); return; }
                setEstGroups(d.groups ?? []);
                if (d.estimateId) setEstimateId(d.estimateId);
              }} className="w-full py-2.5 rounded-lg bg-orange-500 text-white font-bold text-sm">{estBusy ? "Loading…" : "Create repair estimate"}</button>
            ) : (
              <div className="space-y-2">
                {estGroups.map((g) => (
                  <div key={g.hypothesisId}>
                    <p className="text-xs font-bold uppercase">{g.fault}</p>
                    {g.items.length === 0 && <p className={`text-xs ${c.muted}`}>No matching price-book item — add lines in the estimate editor.</p>}
                    {g.items.map((it) => {
                      const q = estPick[it.id] ?? 0;
                      return (
                        <label key={it.id} className={`flex items-center gap-2 py-1.5 text-sm border-b ${dark ? "border-[#22304d]" : "border-gray-100"}`}>
                          <input type="checkbox" className="w-5 h-5" checked={q > 0} onChange={(e) => setEstPick((x) => ({ ...x, [it.id]: e.target.checked ? 1 : 0 }))} />
                          <span className="flex-1">{it.name}<span className={`block text-[10px] ${c.muted}`}>{it.category}</span></span>
                          {q > 0 && <input inputMode="numeric" value={q} onChange={(e) => setEstPick((x) => ({ ...x, [it.id]: Math.max(1, Number(e.target.value) || 1) }))} className={`w-12 rounded border px-1 py-0.5 text-center ${c.input}`} />}
                          <span className={`w-20 text-right font-semibold ${it.hasPrice ? "" : "text-amber-600 text-[11px]"}`}>{it.hasPrice ? `$${it.price.toFixed(2)}` : "no price set"}</span>
                        </label>
                      );
                    })}
                  </div>
                ))}
                <button disabled={estBusy || !Object.values(estPick).some((q) => q > 0)} onClick={async () => {
                  setEstBusy(true); setErr("");
                  const items = Object.entries(estPick).filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty }));
                  const r = await fetch(`/api/technician/hvac-diagnostic/${session.id}/estimate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
                  const d = await r.json().catch(() => ({}));
                  setEstBusy(false);
                  if (!r.ok) { setErr(d.error ?? "Could not create the estimate"); return; }
                  setEstimateId(d.estimateId);
                }} className="w-full py-2.5 rounded-lg bg-orange-500 text-white font-bold text-sm disabled:opacity-40">{estBusy ? "Creating…" : "Create draft estimate"}</button>
                <p className={`text-[11px] ${c.muted}`}>Prices come from the DADA HOUSE price book; items without a price must be priced in the estimate. The estimate is a draft — nothing is sent or charged.</p>
              </div>
            )}
          </div>
          <div className={`rounded-xl border p-3 space-y-2 ${c.card}`}>
            <p className="font-bold text-sm">Help improve the diagnostics</p>
            <div>
              <Label>Was the engine&apos;s top suggestion the real cause?</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {([["YES", "Yes"], ["NO", "No"], ["NOT_SURE", "Not sure"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => saveFb({ engineTopCorrect: k })} className={`py-2 rounded-lg text-sm font-bold ${fb?.engineTopCorrect === k ? c.active : c.chip}`}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <Label>Actual cause(s) found</Label>
              <div className="flex flex-wrap gap-1.5">
                {[...FAULT_CATALOG.map((f) => [f.id, f.fault] as const), ["OTHER", "Other"] as const, ["NO_FAULT", "No fault found"] as const].map(([k, l]) => {
                  const on = fb?.actualFaults?.includes(k);
                  return <button key={k} onClick={() => saveFb({ actualFaults: on ? (fb?.actualFaults ?? []).filter((x) => x !== k) : [...(fb?.actualFaults ?? []), k] })}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold ${on ? c.active : c.chip}`}>{l}</button>;
                })}
              </div>
              {fb?.actualFaults?.includes("OTHER") && (
                <input defaultValue={fb?.otherFault ?? ""} onBlur={(e) => saveFb({ otherFault: e.target.value })} placeholder="Describe the actual cause" className={`${inputCls} mt-1.5 text-sm py-2`} />
              )}
            </div>
            <div>
              <Label>Did the AI assistant help?</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {([["YES", "Yes"], ["NO", "No"], ["NOT_USED", "Not used"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => saveFb({ assistantHelpful: k })} className={`py-2 rounded-lg text-sm font-bold ${fb?.assistantHelpful === k ? c.active : c.chip}`}>{l}</button>
                ))}
              </div>
            </div>
            <textarea defaultValue={fb?.comment ?? ""} onBlur={(e) => saveFb({ comment: e.target.value })} rows={2} placeholder="What did the engine miss or get wrong? (optional)" className={`${inputCls} text-sm`} />
            {fbSaved && <p className="text-xs text-emerald-600 font-semibold">Feedback saved — thank you.</p>}
            <p className={`text-[11px] ${c.muted}`}>Your feedback is reviewed by the office; verified cases are used to measure the engine. It never changes this report.</p>
          </div>
          <p className={`text-[11px] ${c.muted}`}>The report separates technician-confirmed findings from automated hypotheses.</p>
        </div>
      )}

      {/* Bottom nav */}
      <div className={`fixed left-0 right-0 bottom-14 z-20 px-4 py-2 border-t ${dark ? "bg-[#0b1220] border-[#22304d]" : "bg-white border-gray-200"}`}>
        <div className="flex gap-2 max-w-xl mx-auto">
          <button disabled={idx <= 0} onClick={() => go(steps[idx - 1].n)} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-1 disabled:opacity-40 ${c.chip}`}><ChevronLeft className="w-4 h-4" /> Back</button>
          {idx < steps.length - 1 ? (
            <button onClick={() => go(steps[idx + 1].n)} className="flex-[2] py-3 rounded-xl font-bold bg-orange-500 text-white flex items-center justify-center gap-1">{steps[idx + 1].label} <ChevronRight className="w-4 h-4" /></button>
          ) : (
            <Link href={session.appointment ? `/technician/jobs/${session.appointment.id}` : "/technician/hvac-diagnostic"} className="flex-[2] py-3 rounded-xl font-bold bg-orange-500 text-white text-center">Back to job</Link>
          )}
        </div>
      </div>
    </div>
  );
}

// All fields regardless of context (for unit lookups of stored values).
function visibleFieldsAll() { return FIELDS; }

type AiReview = {
  id: string; createdAt: string; helpful: boolean | null; removedCount: number; resultsAt: string | null; model: string;
  output: {
    overview: string;
    hypotheses: { id: string; explanation: string; contradictions: string | null }[];
    missingInfo: string[];
    nextTest: { key: string | null; label: string | null; why: string } | null;
    rankingComment: string | null;
    cautions: string[];
  };
};
type Feedback = { engineTopCorrect: string | null; actualFaults: string[]; otherFault: string | null; assistantHelpful: string | null; comment: string | null };
const EMPTY_FB: Feedback = { engineTopCorrect: null, actualFaults: [], otherFault: null, assistantHelpful: null, comment: null };
