"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calculator, Loader2, Download, AlertTriangle } from "lucide-react";
import { ctParts, ctInstant } from "@/lib/dispatch-time";
import type { JobCostRow } from "@/lib/job-costing";

type Sum = { key?: string; jobs: number; collected: number; billed: number; parts: number; labor: number; commission: number; profit: number; margin: number | null; avgTicket: number | null; incomplete: number };
type Data = { from: string; to: string; totals: Sum; byTechnician: Sum[]; byJobType: Sum[]; rows: JobCostRow[] };

const money = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD" }));
const today = () => ctParts(new Date()).ymd;
const shift = (ymd: string, months: number) => {
  const [y, m] = ymd.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
};
const monthEnd = (ymd: string) => ctParts(new Date(ctInstant(shift(ymd, 1), 0).getTime() - 3600000)).ymd;

export default function JobCosting() {
  const [from, setFrom] = useState(() => `${today().slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const r = await fetch(`/api/dispatch/job-costing?from=${from}&to=${to}`, { cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    setLoading(false);
    if (!r.ok) { setErr(d.error ?? "Could not load the report."); setData(null); return; }
    setData(d);
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    if (!data) return;
    const head = ["Job", "Completed", "Customer", "Type", "Technician", "Collected", "Billed", "Parts", "Labor", "Commission", "Labor minutes", "Profit", "Margin %", "Missing data"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = data.rows.map((r) => [r.number, ctParts(new Date(r.doneAt)).ymd, r.customer, r.jobTypeLabel, r.technician, r.collected, r.billed, r.parts, r.labor ?? "", r.commission ?? "", r.laborMinutes ?? "", r.profit, r.margin ?? "", r.flags.join("; ")].map(esc).join(","));
    const blob = new Blob([[head.map(esc).join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `job-costing_${data.from}_${data.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const t = data?.totals;
  const preset = (f: string, tt: string) => { setFrom(f); setTo(tt); };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Calculator size={24} className="text-[#1B3FA8]" /> Job Costing</h1>
          <p className="text-sm text-gray-500 mt-1">Completed jobs: money collected minus parts, labor (time on job × hourly rate) and commission. Missing data is flagged, never estimated.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button onClick={() => preset(`${today().slice(0, 8)}01`, today())} className="px-3 py-2 rounded-lg border border-gray-200 bg-white font-semibold">This month</button>
          <button onClick={() => { const f = shift(today(), -1); preset(f, monthEnd(f)); }} className="px-3 py-2 rounded-lg border border-gray-200 bg-white font-semibold">Last month</button>
          <button onClick={() => preset(`${today().slice(0, 4)}-01-01`, today())} className="px-3 py-2 rounded-lg border border-gray-200 bg-white font-semibold">This year</button>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-2 py-2 rounded-lg border border-gray-200" />
          <span className="text-gray-400">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-2 py-2 rounded-lg border border-gray-200" />
          <button onClick={exportCsv} disabled={!data?.rows.length} className="px-3 py-2 rounded-lg bg-gray-900 text-white font-semibold flex items-center gap-1.5 disabled:opacity-40"><Download size={15} /> CSV</button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {loading && !data && <div className="flex justify-center p-10"><Loader2 className="animate-spin text-gray-400" /></div>}

      {data && t && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              ["Jobs completed", String(t.jobs)], ["Collected", money(t.collected)], ["Parts", money(t.parts)], ["Labor", money(t.labor)],
              ["Commission", money(t.commission)], ["Gross profit", money(t.profit)], ["Margin", t.margin == null ? "—" : `${t.margin}%`], ["Avg. ticket", money(t.avgTicket)],
            ].map(([l, v]) => (
              <div key={l} className="bg-white rounded-xl border border-gray-200 p-3">
                <p className="text-lg font-black text-gray-900">{v}</p>
                <p className="text-[11px] text-gray-500">{l}</p>
              </div>
            ))}
          </div>
          {t.incomplete > 0 && (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={15} /> {t.incomplete} of {t.jobs} jobs are missing data (time, hourly rate or payment) — their profit is overstated until it&apos;s filled in. Hourly rates and commissions are set in Technician Profiles.
            </p>
          )}

          <div className="grid lg:grid-cols-2 gap-5">
            <SumTable title="By technician" rows={data.byTechnician} />
            <SumTable title="By job type" rows={data.byJobType} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>{["Job", "Completed", "Customer / type", "Technician", "Collected", "Parts", "Labor", "Commission", "Profit", "Margin", ""].map((h) => <th key={h} className={`px-3 py-2 ${["Collected", "Parts", "Labor", "Commission", "Profit", "Margin"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.rows.length === 0 && <tr><td colSpan={11} className="p-8 text-center text-gray-500">No completed jobs in this period.</td></tr>}
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2"><Link href={`/dispatcher/board?job=${r.id}`} className="font-semibold text-[#1B3FA8] hover:underline">#{r.number}</Link></td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{new Date(r.doneAt).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric" })}</td>
                    <td className="px-3 py-2"><p className="text-gray-900">{r.customer}</p><p className="text-xs text-gray-500">{r.category || r.jobTypeLabel}</p></td>
                    <td className="px-3 py-2 text-gray-700">{r.technician ?? "—"}{r.laborMinutes ? <span className="block text-xs text-gray-400">{Math.floor(r.laborMinutes / 60)}h{String(r.laborMinutes % 60).padStart(2, "0")} on job</span> : null}</td>
                    <td className="px-3 py-2 text-right">{money(r.collected)}{r.billed > r.collected && <span className="block text-xs text-amber-700">billed {money(r.billed)}</span>}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{money(r.parts)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{money(r.labor)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{money(r.commission)}</td>
                    <td className={`px-3 py-2 text-right font-bold ${r.profit < 0 ? "text-red-600" : "text-gray-900"}`}>{money(r.profit)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{r.margin == null ? "—" : `${r.margin}%`}</td>
                    <td className="px-3 py-2">{r.flags.length > 0 && <span title={r.flags.join("\n")} className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 whitespace-nowrap">{r.flags[0]}{r.flags.length > 1 ? ` +${r.flags.length - 1}` : ""}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-500">Labor: every crew member on a job is counted for the job&apos;s logged time at their own hourly rate. Overhead (fuel, insurance, office) is not included — this is gross profit per job.</p>
        </>
      )}
    </div>
  );
}

function SumTable({ title, rows }: { title: string; rows: Sum[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <p className="px-4 py-3 font-bold text-gray-900 border-b border-gray-100">{title}</p>
      <table className="min-w-full text-sm">
        <thead className="text-xs text-gray-500 uppercase"><tr>{["", "Jobs", "Collected", "Costs", "Profit", "Margin"].map((h) => <th key={h} className={`px-3 py-2 ${h ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100">
          {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-400">—</td></tr>}
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="px-3 py-2 font-semibold text-gray-900">{r.key}</td>
              <td className="px-3 py-2 text-right">{r.jobs}</td>
              <td className="px-3 py-2 text-right">{money(r.collected)}</td>
              <td className="px-3 py-2 text-right text-gray-600">{money(r.parts + r.labor + r.commission)}</td>
              <td className={`px-3 py-2 text-right font-bold ${r.profit < 0 ? "text-red-600" : ""}`}>{money(r.profit)}</td>
              <td className="px-3 py-2 text-right">{r.margin == null ? "—" : `${r.margin}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
