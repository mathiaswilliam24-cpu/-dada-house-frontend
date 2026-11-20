"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Loader2, Play, CheckCircle2, XCircle, Upload, AlertTriangle } from "lucide-react";

type Rate = { n: number; hits: number; rate: number | null; low: number | null; high: number | null };
type Group = { group: string; n: number; top1: Rate; top3: Rate };
type SplitMetrics = {
  n: number; top1: Rate; top3: Rate; answered: { n: number; top1: Rate };
  abstention: { n: number; rate: number | null; correct: Rate };
  safety: { cases: number; missed: number; falseNegativeRate: { rate: number | null; low: number | null; high: number | null }; missedCaseIds: string[] };
  perFault: { fault: string; label: string; support: number; tp: number; fp: number; fn: number; precision: number | null; recall: number | null; safetyCritical: boolean }[];
  byCategory: Group[]; byRefrigerant: Group[]; byManufacturer: Group[];
};
type Calib = { category: string; fault: string; status: string; n: number; hits: number; rate: number | null; low: number | null; high: number | null; calibrated: boolean };
type RunResult = {
  caseCount: number; splitCounts: Record<string, number>; metrics: Record<string, SplitMetrics>;
  calibration: { entries: Calib[]; byStatus: { status: string; n: number; hits: number; rate: number | null; low: number | null; high: number | null }[] };
  target: { target: number; minTestCases: number; testCases: number; top1: number | null; lowerBound: number | null; met: boolean; categoriesMet: string[] };
};
type Case = {
  id: string; source: string; status: string; split: string; category: string | null; refrigerant: string | null; manufacturer: string | null;
  groundTruth: string[]; evidence: string | null; reportNumber: string | null; serviceTechnician: string | null; submittedByName: string | null;
  verifiedByName: string | null; verifiedAt: string | null; excludedReason: string | null; createdAt: string; canVerify: boolean; blockedReason: string | null;
};
type Data = {
  me: string; role: string;
  thresholds: { minCalibration: number; minTest: number; target: number };
  faults: { id: string; fault: string; category: string; safetyCritical: boolean }[];
  counts: { PENDING: number; VERIFIED: number; EXCLUDED: number; bySplit: Record<string, number>; unlinkedEquipment: number };
  cases: Case[];
  candidates: { id: string; reportNumber: string | null; completedAt: string; technician: string | null; equipment: string; confirmed: string[]; feedbackFaults: string[]; linkedEquipment: boolean }[];
  latestRun: { id: string; createdAt: string; createdByName: string | null; caseCount: number; engineVersion: string; rulesetVersion: string; ptDataVersion: string; fieldRulesVersion: number; current: boolean; result: RunResult } | null;
  runs: { id: string; createdAt: string; caseCount: number; rulesetVersion: string; fieldRulesVersion: number; testTop1: Rate | null }[];
  versions: { engineVersion: string; rulesetVersion: string; ptDataVersion: string; fieldRulesVersion: number };
  feedback: {
    total: number; engineTop: Record<string, number>; assistant: Record<string, number>; aiReviews: Record<string, number>;
    recent: { id: string; reportNumber: string | null; technician: string | null; at: string; engineTopCorrect: string | null; actualFaults: string[]; otherFault: string | null; comment: string | null }[];
  };
};

const pct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x * 1000) / 10} %`);
const range = (r: { low: number | null; high: number | null }) => (r.low == null ? "" : `${Math.round(r.low * 100)}–${Math.round((r.high ?? 0) * 100)} %`);
const date = (d: string) => new Date(d).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });
const card = "bg-white rounded-xl border border-gray-200";

const IMPORT_EXAMPLE = `[
  {
    "equipmentKey": "Carrier 24ACC636 SN 1234E56789",
    "equipment": { "category": "STRAIGHT_AC", "manufacturer": "Carrier", "modelNumber": "24ACC636", "refrigerant": "R-410A", "meteringDevice": "TXV", "phase": 1, "rla": 16.7, "specs": { "targetSubcooling": 10, "chargeTolerance": 3 } },
    "mode": "COOLING", "complaint": "AC_NOT_COOLING", "circuits": 1,
    "measurements": [ { "key": "suction_psig", "value": 100 }, { "key": "high_psig", "value": 300 }, { "key": "suction_line_f", "value": 55 }, { "key": "liquid_line_f", "value": 94 } ],
    "groundTruth": ["LOW_CHARGE"],
    "evidence": "Leak found at the service valve (bubble test), repaired, evacuated, weighed in; SC 10 °F after repair. Invoice #1234."
  }
]`;

export default function ValidationTab() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [split, setSplit] = useState("TEST");
  const [open, setOpen] = useState<string | null>(null);
  const [gt, setGt] = useState<string[]>([]);
  const [evidence, setEvidence] = useState("");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [filter, setFilter] = useState("PENDING");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/hvac-diagnostic/validation", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Could not load"); return; }
    setD(j);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(body: Record<string, unknown>, tag: string) {
    setBusy(tag); setErr("");
    const r = await fetch("/api/admin/hvac-diagnostic/validation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy("");
    if (!r.ok) { setErr(j.error ?? "Action failed"); return false; }
    await load();
    return j;
  }

  if (!d) return err ? <p className="text-sm text-red-600">{err}</p> : <div className="flex justify-center p-10"><Loader2 className="animate-spin text-gray-400" /></div>;
  const run = d.latestRun;
  const m = run?.result.metrics[split];
  const faultName = (id: string) => d.faults.find((f) => f.id === id)?.fault ?? id;
  const shown = d.cases.filter((c) => filter === "ALL" || c.status === filter);

  const GroupTable = ({ title, rows }: { title: string; rows: Group[] }) => (
    <div className={`${card} overflow-x-auto`}>
      <p className="px-3 py-2 font-bold text-sm">{title}</p>
      <table className="min-w-full text-xs">
        <thead><tr className="text-gray-500"><th className="px-3 py-1 text-left">Group</th><th className="px-3 py-1 text-right">Cases</th><th className="px-3 py-1 text-right">Top-1</th><th className="px-3 py-1 text-right">Top-3</th></tr></thead>
        <tbody>{rows.map((g) => (
          <tr key={g.group} className="border-t border-gray-100"><td className="px-3 py-1">{g.group}</td><td className="px-3 py-1 text-right">{g.n}</td>
            <td className="px-3 py-1 text-right">{pct(g.top1.rate)} <span className="text-gray-400">{range(g.top1)}</span></td>
            <td className="px-3 py-1 text-right">{pct(g.top3.rate)}</td></tr>
        ))}{rows.length === 0 && <tr><td colSpan={4} className="px-3 py-2 text-gray-400">No case</td></tr>}</tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5">
      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* Target & run */}
      <div className={`${card} p-4 space-y-3`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-bold text-gray-900">Accuracy target — top-1 ≥ {Math.round(d.thresholds.target * 100)} % on independently verified test cases</p>
            {!run ? (
              <p className="text-sm text-gray-500 mt-1">No evaluation yet. Verify cases, then run an evaluation.</p>
            ) : run.result.target.met ? (
              <p className="text-sm text-emerald-700 font-semibold mt-1 flex items-center gap-1"><CheckCircle2 size={15} /> Demonstrated on {run.result.target.testCases} test cases (lower bound {pct(run.result.target.lowerBound)}).</p>
            ) : (
              <p className="text-sm text-amber-700 font-semibold mt-1 flex items-center gap-1"><AlertTriangle size={15} /> Not demonstrated — {run.result.target.testCases} test case(s), top-1 {pct(run.result.target.top1)}{run.result.target.lowerBound != null ? ` (95 % range from ${pct(run.result.target.lowerBound)})` : ""}. Requires at least {d.thresholds.minTest} test cases with the lower bound ≥ {Math.round(d.thresholds.target * 100)} %.</p>
            )}
            {run && run.result.target.categoriesMet.length > 0 && <p className="text-xs text-emerald-700 mt-1">Demonstrated for: {run.result.target.categoriesMet.join(", ")}</p>}
            <p className="text-xs text-gray-500 mt-1">Do not advertise an accuracy figure unless it is shown as demonstrated here.</p>
          </div>
          <button disabled={!!busy || d.counts.VERIFIED === 0} onClick={() => act({ action: "evaluate" }, "eval")} className="px-3 py-2 rounded-lg bg-[#1B3FA8] text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-40">
            {busy === "eval" ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Run evaluation
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[["Pending review", d.counts.PENDING], ["Verified", d.counts.VERIFIED], ["Excluded", d.counts.EXCLUDED], ["Train", d.counts.bySplit.TRAIN], ["Validation", d.counts.bySplit.VALIDATION], ["Test", d.counts.bySplit.TEST]].map(([l, v]) => (
            <span key={l} className="px-2 py-1 rounded-lg bg-gray-100"><b>{v}</b> {l}</span>
          ))}
        </div>
        {run && (
          <p className={`text-xs ${run.current ? "text-gray-500" : "text-amber-700 font-semibold"}`}>
            Last run {date(run.createdAt)}{run.createdByName ? ` by ${run.createdByName}` : ""} · {run.caseCount} verified cases · {run.rulesetVersion} · field rules v{run.fieldRulesVersion}
            {!run.current && " — the engine, rules or field rules changed since: run it again. Technicians see no confidence numbers until then."}
          </p>
        )}
        <p className="text-[11px] text-gray-500">
          Cases are replayed through the engine in use, without the technician&apos;s decisions. Splits are fixed by equipment identity (every visit to the same unit stays in one split, so repeat visits cannot leak between training and test).
          TRAIN = for tuning field rules · VALIDATION = for confidence calibration · TEST = for the headline accuracy only.
          {d.counts.unlinkedEquipment > 0 && ` ${d.counts.unlinkedEquipment} case(s) are not linked to a customer equipment record or serial number — save equipment in the diagnostic to group repeat visits reliably.`}
        </p>
      </div>

      {/* Metrics */}
      {run && m && (
        <div className="space-y-3">
          <div className="flex gap-1">
            {["TEST", "VALIDATION", "TRAIN"].map((s) => (
              <button key={s} onClick={() => setSplit(s)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${split === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>{s} ({run.result.splitCounts[s] ?? 0})</button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ["Top-1 accuracy", pct(m.top1.rate), range(m.top1)],
              ["Top-3 accuracy", pct(m.top3.rate), range(m.top3)],
              ["Top-1 when answering", pct(m.answered.top1.rate), `${m.answered.n} answered`],
              ["Abstained", pct(m.abstention.rate), `${pct(m.abstention.correct.rate)} correctly`],
              ["Safety faults missed", `${m.safety.missed} / ${m.safety.cases}`, m.safety.cases ? `FN rate ${pct(m.safety.falseNegativeRate.rate)}` : "no safety case"],
            ].map(([l, v, sub]) => (
              <div key={l} className={`${card} p-3`}><p className="text-xl font-black">{v}</p><p className="text-xs text-gray-500">{l}</p><p className="text-[11px] text-gray-400">{sub}</p></div>
            ))}
          </div>
          <div className={`${card} overflow-x-auto`}>
            <p className="px-3 py-2 font-bold text-sm">Precision and recall by fault (top-1 prediction)</p>
            <table className="min-w-full text-xs">
              <thead><tr className="text-gray-500"><th className="px-3 py-1 text-left">Fault</th><th className="px-3 py-1 text-right">Cases</th><th className="px-3 py-1 text-right">Precision</th><th className="px-3 py-1 text-right">Recall</th><th className="px-3 py-1 text-right">TP / FP / FN</th></tr></thead>
              <tbody>{m.perFault.map((f) => (
                <tr key={f.fault} className="border-t border-gray-100"><td className="px-3 py-1">{f.label}{f.safetyCritical && <span className="ml-1 text-red-600 font-bold">safety</span>}</td>
                  <td className="px-3 py-1 text-right">{f.support}</td><td className="px-3 py-1 text-right">{pct(f.precision)}</td><td className="px-3 py-1 text-right">{pct(f.recall)}</td>
                  <td className="px-3 py-1 text-right text-gray-500">{f.tp} / {f.fp} / {f.fn}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <GroupTable title="By equipment type" rows={m.byCategory} />
            <GroupTable title="By refrigerant" rows={m.byRefrigerant} />
            <GroupTable title="By manufacturer" rows={m.byManufacturer} />
          </div>
          <div className={`${card} overflow-x-auto`}>
            <p className="px-3 pt-2 font-bold text-sm">Confidence calibration (VALIDATION split)</p>
            <p className="px-3 pb-2 text-[11px] text-gray-500">How often a hypothesis shown with a given status was the verified fault. A percentage is shown to technicians only for groups with at least {d.thresholds.minCalibration} cases, and only while this run matches the engine version in use.</p>
            <div className="px-3 pb-2 flex flex-wrap gap-2 text-xs">
              {run.result.calibration.byStatus.map((s) => <span key={s.status} className="px-2 py-1 rounded-lg bg-gray-100"><b>{s.status.replace(/_/g, " ").toLowerCase()}</b>: {s.hits}/{s.n} = {pct(s.rate)} <span className="text-gray-400">{range(s)}</span></span>)}
            </div>
            <table className="min-w-full text-xs">
              <thead><tr className="text-gray-500"><th className="px-3 py-1 text-left">Equipment</th><th className="px-3 py-1 text-left">Fault</th><th className="px-3 py-1 text-left">Status</th><th className="px-3 py-1 text-right">Verified / shown</th><th className="px-3 py-1 text-right">Rate</th><th className="px-3 py-1 text-left">Shown to techs</th></tr></thead>
              <tbody>{run.result.calibration.entries.slice(0, 60).map((e) => (
                <tr key={`${e.category}${e.fault}${e.status}`} className="border-t border-gray-100">
                  <td className="px-3 py-1">{e.category}</td><td className="px-3 py-1">{faultName(e.fault)}</td><td className="px-3 py-1">{e.status.replace(/_/g, " ").toLowerCase()}</td>
                  <td className="px-3 py-1 text-right">{e.hits} / {e.n}</td><td className="px-3 py-1 text-right">{pct(e.rate)} <span className="text-gray-400">{range(e)}</span></td>
                  <td className="px-3 py-1">{e.calibrated ? <span className="text-emerald-700 font-semibold">Yes</span> : <span className="text-gray-400">No (n &lt; {d.thresholds.minCalibration})</span>}</td>
                </tr>
              ))}{run.result.calibration.entries.length === 0 && <tr><td colSpan={6} className="px-3 py-2 text-gray-400">No validation-split case yet.</td></tr>}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Candidates */}
      <div className={`${card} overflow-x-auto`}>
        <p className="px-3 pt-2 font-bold text-sm">Completed diagnostics to add</p>
        <p className="px-3 pb-2 text-[11px] text-gray-500">Diagnostics with a technician-confirmed fault or feedback. Adding one creates a pending case; another person must then verify the real cause.</p>
        <table className="min-w-full text-xs">
          <tbody>{d.candidates.map((c) => (
            <tr key={c.id} className="border-t border-gray-100">
              <td className="px-3 py-1.5 whitespace-nowrap">{c.reportNumber ?? "—"}</td><td className="px-3 py-1.5">{date(c.completedAt)}</td><td className="px-3 py-1.5">{c.technician}</td>
              <td className="px-3 py-1.5">{c.equipment}{!c.linkedEquipment && <span className="text-amber-600"> · not linked to equipment</span>}</td>
              <td className="px-3 py-1.5">{[...new Set([...c.confirmed, ...c.feedbackFaults])].map(faultName).join("; ")}</td>
              <td className="px-3 py-1.5 text-right"><button disabled={!!busy} onClick={() => act({ action: "addSession", sessionId: c.id }, c.id)} className="px-2 py-1 rounded bg-gray-900 text-white font-semibold disabled:opacity-40">{busy === c.id ? "…" : "Add"}</button></td>
            </tr>
          ))}{d.candidates.length === 0 && <tr><td className="px-3 py-2 text-gray-400">Nothing to add.</td></tr>}</tbody>
        </table>
      </div>

      {/* Cases */}
      <div className={`${card} overflow-x-auto`}>
        <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold text-sm">Validation cases</p>
          <div className="flex gap-1">
            {["PENDING", "VERIFIED", "EXCLUDED", "ALL"].map((f) => <button key={f} onClick={() => setFilter(f)} className={`px-2 py-1 rounded text-xs font-bold ${filter === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>{f.toLowerCase()}</button>)}
            <button onClick={() => setShowImport((x) => !x)} className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600 flex items-center gap-1"><Upload size={12} /> Import historical</button>
          </div>
        </div>
        {showImport && (
          <div className="px-3 pb-3 space-y-2">
            <p className="text-[11px] text-gray-500">Paste a JSON array of past service cases. Values must be in °F, psig and in. w.c.; measurement keys and fault ids are the ones used by the diagnostic. Imported cases stay pending until someone else verifies them.</p>
            <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={8} placeholder={IMPORT_EXAMPLE} className="w-full border border-gray-200 rounded-lg p-2 font-mono text-[11px]" />
            <button disabled={!!busy || !importText.trim()} onClick={async () => {
              let cases: unknown;
              try { cases = JSON.parse(importText); } catch { setErr("Invalid JSON"); return; }
              const r = await act({ action: "import", cases }, "import");
              if (r) { setImportText(""); setShowImport(false); }
            }} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold disabled:opacity-40">{busy === "import" ? "Importing…" : "Import"}</button>
          </div>
        )}
        <table className="min-w-full text-xs">
          <thead><tr className="text-gray-500"><th className="px-3 py-1 text-left">Case</th><th className="px-3 py-1 text-left">Split</th><th className="px-3 py-1 text-left">Equipment</th><th className="px-3 py-1 text-left">Verified cause</th><th className="px-3 py-1 text-left">Status</th><th /></tr></thead>
          <tbody>{shown.map((c) => (
            <Fragment key={c.id}>
              <tr className="border-t border-gray-100 align-top">
                <td className="px-3 py-1.5">{c.reportNumber ?? (c.source === "HISTORICAL" ? "Historical" : "—")}<span className="block text-gray-400">{date(c.createdAt)}{c.serviceTechnician ? ` · ${c.serviceTechnician}` : ""}</span></td>
                <td className="px-3 py-1.5">{c.split.toLowerCase()}</td>
                <td className="px-3 py-1.5">{[c.category, c.manufacturer, c.refrigerant].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-3 py-1.5">{c.groundTruth.map(faultName).join("; ") || <span className="text-gray-400">not labelled</span>}{c.evidence && <span className="block text-gray-500">{c.evidence}</span>}</td>
                <td className="px-3 py-1.5">{c.status === "VERIFIED" ? <span className="text-emerald-700 font-semibold">verified{c.verifiedByName ? ` by ${c.verifiedByName}` : ""}</span> : c.status === "EXCLUDED" ? <span className="text-gray-500">excluded{c.excludedReason ? `: ${c.excludedReason}` : ""}</span> : "pending"}</td>
                <td className="px-3 py-1.5 text-right">
                  {c.status !== "VERIFIED" && (
                    <button onClick={() => { setOpen(open === c.id ? null : c.id); setGt(c.groundTruth); setEvidence(c.evidence ?? ""); }} className="px-2 py-1 rounded bg-gray-900 text-white font-semibold">{open === c.id ? "Close" : "Review"}</button>
                  )}
                </td>
              </tr>
              {open === c.id && (
                <tr className="bg-gray-50">
                  <td colSpan={6} className="px-3 py-3 space-y-2">
                    <p className="font-bold">Verified cause(s)</p>
                    <div className="flex flex-wrap gap-1.5">
                      {d.faults.map((f) => (
                        <button key={f.id} onClick={() => setGt((g) => (g.includes(f.id) ? g.filter((x) => x !== f.id) : [...g, f.id]))}
                          className={`px-2 py-1 rounded-lg font-semibold ${gt.includes(f.id) ? "bg-[#1B3FA8] text-white" : "bg-white border border-gray-200"}`}>{f.fault}</button>
                      ))}
                    </div>
                    <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={3} placeholder="How was the cause verified? (repair performed and result after repair, test readings, part returned, invoice…)" className="w-full border border-gray-200 rounded-lg p-2" />
                    {c.blockedReason && <p className="text-amber-700 font-semibold">{c.blockedReason}</p>}
                    <div className="flex gap-2">
                      <button disabled={!!busy || !c.canVerify || gt.length === 0 || evidence.trim().length < 10} onClick={async () => { if (await act({ action: "verify", id: c.id, groundTruth: gt, evidence }, "v")) setOpen(null); }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1 disabled:opacity-40"><CheckCircle2 size={13} /> Verify</button>
                      <button disabled={!!busy} onClick={async () => { const reason = prompt("Why exclude this case? (e.g. cause never verified, incomplete readings)"); if (reason && (await act({ action: "exclude", id: c.id, reason }, "x"))) setOpen(null); }}
                        className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 font-bold flex items-center gap-1"><XCircle size={13} /> Exclude</button>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}{shown.length === 0 && <tr><td colSpan={6} className="px-3 py-2 text-gray-400">No case.</td></tr>}</tbody>
        </table>
      </div>

      {/* Feedback */}
      <div className={`${card} p-4 space-y-3`}>
        <p className="font-bold text-gray-900">Technician feedback</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded-lg bg-gray-100"><b>{d.feedback.total}</b> responses</span>
          <span className="px-2 py-1 rounded-lg bg-gray-100">Engine top suggestion right: <b>{d.feedback.engineTop.YES}</b> yes · <b>{d.feedback.engineTop.NO}</b> no · <b>{d.feedback.engineTop.NOT_SURE}</b> not sure</span>
          <span className="px-2 py-1 rounded-lg bg-gray-100">AI assistant helpful: <b>{d.feedback.assistant.YES}</b> yes · <b>{d.feedback.assistant.NO}</b> no · <b>{d.feedback.assistant.NOT_USED}</b> not used</span>
          <span className="px-2 py-1 rounded-lg bg-gray-100">AI explanations rated: <b>{d.feedback.aiReviews.true ?? 0}</b> useful · <b>{d.feedback.aiReviews.false ?? 0}</b> not useful · <b>{d.feedback.aiReviews.null ?? 0}</b> unrated</span>
        </div>
        <p className="text-[11px] text-gray-500">Feedback is the technician&apos;s own opinion and is not ground truth: use it to find cases worth verifying and rules worth reviewing.</p>
        <div className="divide-y divide-gray-100 text-xs">
          {d.feedback.recent.map((f) => (
            <div key={f.id} className="py-2">
              <p><b>{f.reportNumber ?? "—"}</b> · {f.technician} · {date(f.at)}{f.engineTopCorrect && <> · engine top: <b className={f.engineTopCorrect === "NO" ? "text-red-600" : ""}>{f.engineTopCorrect.replace("_", " ").toLowerCase()}</b></>}</p>
              {(f.actualFaults.length > 0 || f.otherFault) && <p className="text-gray-600">Actual: {[...f.actualFaults.filter((x) => x !== "OTHER").map(faultName), f.otherFault].filter(Boolean).join("; ")}</p>}
              {f.comment && <p className="text-gray-600">“{f.comment}”</p>}
            </div>
          ))}
          {d.feedback.recent.length === 0 && <p className="text-gray-400 py-2">No comment or disagreement yet.</p>}
        </div>
      </div>
    </div>
  );
}
