"use client";
import { Fragment, useState } from "react";
import { ChevronDown, Grid3x3, Table2, Wind } from "lucide-react";
import { PARAM_INFO, SHSC_MATRIX, SHSC_CELL, type MatrixResult, type ParamStatus, type ShScState } from "@/lib/hvac/matrix";

type Theme = { card: string; muted: string; chip: string };

const STATUS_STYLE: Record<ParamStatus, string> = {
  LOW: "bg-sky-100 text-sky-800", NORMAL: "bg-emerald-100 text-emerald-800", HIGH: "bg-red-100 text-red-700",
  MISSING: "bg-gray-200 text-gray-600", INVALID: "bg-amber-200 text-amber-900", NO_REFERENCE: "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<ParamStatus, string> = { LOW: "LOW", NORMAL: "NORMAL", HIGH: "HIGH", MISSING: "MISSING", INVALID: "INVALID", NO_REFERENCE: "NO REF." };
const GROUP_LABEL = { REFRIGERANT: "Refrigerant", AIR: "Airflow & static", PSYCHRO: "Psychrometrics", ELECTRICAL: "Electrical" } as const;
const SH_LABEL: Record<ShScState, string> = { HIGH: "HIGH", NORMAL: "NORMAL", LOW: "LOW" };

/** Diagnostic matrix views for the Analysis step: parameter table, superheat/subcooling matrix, airflow correlation. */
export default function MatrixPanel({ matrix, circuits, theme, dark }: { matrix: MatrixResult; circuits: number; theme: Theme; dark: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const border = dark ? "border-[#22304d]" : "border-gray-100";
  const active = new Set(matrix.shsc.map((x) => x.cell).filter(Boolean));

  return (
    <div className="space-y-3">
      {matrix.correlations.length > 0 && (
        <div className={`rounded-xl border p-3 ${theme.card}`}>
          <p className="font-bold text-sm mb-1.5 flex items-center gap-1.5"><Wind className="w-4 h-4 text-orange-500" /> Refrigeration + airflow correlation</p>
          <ul className="space-y-1.5">{matrix.correlations.map((x, i) => <li key={i} className="text-sm">• {x}</li>)}</ul>
        </div>
      )}

      {/* Parameter table */}
      <div className={`rounded-xl border overflow-hidden ${theme.card}`}>
        <p className="px-3 py-2 font-bold text-sm flex items-center gap-1.5"><Table2 className="w-4 h-4 text-orange-500" /> Diagnostic table</p>
        <p className={`px-3 pb-2 text-[11px] ${theme.muted}`}>LOW / NORMAL / HIGH only against the manufacturer data entered for this unit (or an approved company rule, shown as such). NO REF. = no verified reference yet. Tap a row for what it means.</p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead><tr className={theme.muted}>
              <th className="px-2 py-1 text-left">Parameter</th><th className="px-2 py-1 text-right">Measured</th><th className="px-2 py-1 text-left">Expected</th><th className="px-2 py-1 text-left">Status</th>
            </tr></thead>
            <tbody>
              {(["REFRIGERANT", "AIR", "PSYCHRO", "ELECTRICAL"] as const).map((g) => {
                const rows = matrix.parameters.filter((r) => r.group === g && (showAll || r.status !== "NO_REFERENCE" || r.value != null));
                if (!rows.length) return null;
                return (
                  <Fragment key={g}>
                    <tr><td colSpan={4} className={`px-2 pt-2 pb-1 font-bold uppercase text-[10px] ${theme.muted}`}>{GROUP_LABEL[g]}</td></tr>
                    {rows.map((r) => {
                      const id = `${r.key}${r.circuit ?? ""}`;
                      const info = PARAM_INFO[r.key];
                      return (
                        <Fragment key={id}>
                          <tr onClick={() => setOpen(open === id ? null : id)} className={`border-t cursor-pointer ${border}`}>
                            <td className="px-2 py-1.5"><span className="flex items-center gap-1"><ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open === id ? "rotate-180" : ""}`} />{r.label}{r.circuit && circuits > 1 ? ` (C${r.circuit})` : ""}</span></td>
                            <td className="px-2 py-1.5 text-right font-bold whitespace-nowrap">{r.value != null ? `${r.value} ${r.unit}` : "—"}</td>
                            <td className={`px-2 py-1.5 whitespace-nowrap ${theme.muted}`}>{r.expected ?? "—"}</td>
                            <td className="px-2 py-1.5"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span></td>
                          </tr>
                          {open === id && (
                            <tr><td colSpan={4} className={`px-3 pb-2 text-xs space-y-1 ${theme.muted}`}>
                              <p className="font-semibold">{r.interpretation}</p>
                              {r.basis && <p>Reference: {r.basis}</p>}
                              {info && <>
                                <p><b>What it is:</b> {info.what}</p>
                                <p><b>How to measure:</b> {info.how}</p>
                                <p><b>Low can mean:</b> {info.low}</p>
                                <p><b>High can mean:</b> {info.high}</p>
                                <p><b>Next test:</b> {info.next}</p>
                              </>}
                            </td></tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <button onClick={() => setShowAll((v) => !v)} className={`w-full py-2 text-xs font-semibold ${theme.muted}`}>{showAll ? "Hide rows without a value" : "Show every row"}</button>
      </div>

      {/* Superheat & subcooling matrix */}
      {matrix.shsc.length > 0 && (
        <div className={`rounded-xl border p-3 space-y-2 ${theme.card}`}>
          <p className="font-bold text-sm flex items-center gap-1.5"><Grid3x3 className="w-4 h-4 text-orange-500" /> Superheat & subcooling diagnostic matrix</p>
          {matrix.shsc.map((x) => (
            <p key={x.circuit} className="text-sm">{circuits > 1 && <b>Circuit {x.circuit}: </b>}
              {x.cell ? <>Superheat <b>{SH_LABEL[x.sh!]}</b> · Subcooling <b>{SH_LABEL[x.sc!]}</b></> : <span className={theme.muted}>{x.reason}</span>}
            </p>
          ))}
          <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
            <div className={theme.muted}>SH ↓ / SC →</div>
            {(["LOW", "NORMAL", "HIGH"] as ShScState[]).map((sc) => <div key={sc} className="font-bold">SC {sc}</div>)}
            {(["HIGH", "NORMAL", "LOW"] as ShScState[]).map((sh) => (
              <Fragment key={sh}>
                <div className="font-bold self-center">SH {sh}</div>
                {(["LOW", "NORMAL", "HIGH"] as ShScState[]).map((sc) => {
                  const cell = SHSC_CELL[`${sh}_${sc}`];
                  const on = active.has(`${sh}_${sc}`);
                  return (
                    <button key={sc} onClick={() => setOpen(open === `cell${sh}${sc}` ? null : `cell${sh}${sc}`)}
                      className={`rounded p-1 min-h-[44px] leading-tight ${on ? "bg-orange-500 text-white font-bold" : theme.chip}`}>
                      {cell.likely.length ? cell.likely.map((l) => l.label.split(" (")[0]).join(" / ") : "Charge & metering consistent"}
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
          {[...SHSC_MATRIX].filter((cell) => active.has(`${cell.sh}_${cell.sc}`) || open === `cell${cell.sh}${cell.sc}`).map((cell) => (
            <div key={`${cell.sh}${cell.sc}`} className={`rounded-lg p-2 text-xs space-y-1 ${theme.chip}`}>
              <p className="font-bold">SH {cell.sh} + SC {cell.sc}{active.has(`${cell.sh}_${cell.sc}`) ? " — this unit" : ""}</p>
              <p>Typical suction: {cell.suction} · high side: {cell.head}</p>
              {cell.likely.length > 0 && <p><b>Likely fault categories:</b> {cell.likely.map((l) => l.label).join("; ")}</p>}
              {cell.evidence.length > 0 && <p><b>Supporting evidence to look for:</b> {cell.evidence.join("; ")}</p>}
              <p><b>Confirmation tests:</b> {cell.tests.join("; ")}</p>
              <p><b>Possible corrective actions:</b> {cell.actions.join("; ")}</p>
            </div>
          ))}
          <p className={`text-[11px] ${theme.muted}`}>General patterns for fixed-speed equipment in cooling, read against the manufacturer targets — not universal rules. Verify indoor airflow first; a pattern is never a confirmed diagnosis.</p>
        </div>
      )}
    </div>
  );
}
