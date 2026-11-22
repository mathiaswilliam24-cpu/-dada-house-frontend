"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Gift, Loader2, Sparkles, CheckCircle2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

type Tx = { id: string; type: string; points: number; description: string; createdAt: string };
type Bill = { kind: "estimate" | "invoice"; id: string; number: string; due: number; loyaltyDiscount: number };
type Data = { linked: boolean; balance: number; value: number; totalEarned?: number; totalSpent?: number; transactions: Tx[]; bills: Bill[] };

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export default function RewardsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/client/loyalty").then((r) => r.json()).then(setData).catch(() => setData({ linked: false, balance: 0, value: 0, transactions: [], bills: [] }));
  }, []);
  useEffect(load, [load]);

  async function apply(b: Bill) {
    if (!data) return;
    setBusy(b.id); setMsg(null);
    const points = Math.min(data.balance, Math.round(b.due * 100));
    const r = await fetch("/api/client/loyalty/redeem", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: b.kind, id: b.id, points }) });
    const d = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) { setMsg({ ok: false, text: d.error ?? "Could not apply your points." }); return; }
    setMsg({ ok: true, text: d.paidInFull
      ? `Done! ${d.points.toLocaleString()} points paid invoice #${b.number} in full.`
      : `${d.points.toLocaleString()} points applied (−${usd(d.discount)}). Left to pay on #${b.number}: ${usd(d.remaining)}.` });
    load();
  }

  if (!data) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Rewards Points</h1>
      <p className="text-gray-500 text-sm mb-6">Every payment you make to DADA HOUSE earns points you can use to pay for your next services.</p>

      {!data.linked ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-sm text-gray-600">
          Your account is not linked to your DADA HOUSE records yet. Open the personal link we texted you after your payment,
          or call us at <a className="text-[#1B3FA8] font-semibold" href="tel:+18449280875">(844) 928-0875</a> and we&apos;ll link it.
        </div>
      ) : (
        <>
          <div className="rounded-2xl p-6 text-white mb-6 bg-gradient-to-br from-[#1B3FA8] to-[#0A1628] shadow-lg">
            <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wider"><Gift className="w-4 h-4" /> Your balance</div>
            <p className="text-5xl font-black mt-2">{data.balance.toLocaleString()} <span className="text-2xl font-bold text-white/70">points</span></p>
            <p className="text-[#F7921A] font-bold text-lg mt-1">Worth {usd(data.value)} toward your next service</p>
            <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
              <div className="bg-white/10 rounded-xl p-3"><p className="text-white/60 text-xs">Earned (lifetime)</p><p className="font-bold">{(data.totalEarned ?? 0).toLocaleString()}</p></div>
              <div className="bg-white/10 rounded-xl p-3"><p className="text-white/60 text-xs">Used (lifetime)</p><p className="font-bold">{(data.totalSpent ?? 0).toLocaleString()}</p></div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 text-sm text-gray-600">
            <p className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#F7921A]" /> How it works</p>
            <ul className="space-y-1.5 list-disc pl-5">
              <li>You earn <strong>1 point for every $1</strong> you pay — repairs, installations, service calls and your maintenance plan.</li>
              <li><strong>100 points = $1</strong> off any DADA HOUSE invoice.</li>
              <li>Use them right here on any unpaid invoice — the points are deducted first, then you pay the rest securely online.</li>
            </ul>
          </div>

          {msg && (
            <div className={`mb-4 p-3 rounded-xl text-sm ${msg.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{msg.text}</div>
          )}

          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Use your points</h2>
          {data.bills.length === 0 ? (
            <p className="bg-white border border-gray-200 rounded-2xl p-5 text-sm text-gray-500 mb-6">No unpaid invoices right now. Your points stay in your account for your next service.</p>
          ) : (
            <div className="space-y-3 mb-6">
              {data.bills.map((b) => {
                const usable = Math.min(data.balance, Math.round(b.due * 100));
                return (
                  <div key={b.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">Invoice #{b.number}</p>
                      <p className="text-sm text-gray-500">Amount due {usd(b.due)}{b.loyaltyDiscount > 0 ? ` (points already applied: −${usd(b.loyaltyDiscount)})` : ""}</p>
                    </div>
                    <button onClick={() => apply(b)} disabled={usable <= 0 || busy === b.id}
                      className="px-4 py-2.5 rounded-xl bg-[#F7921A] hover:bg-[#e07f10] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold">
                      {busy === b.id ? "Applying…" : usable > 0 ? `Use ${usable.toLocaleString()} points (−${usd(usable / 100)})` : "No points to use yet"}
                    </button>
                  </div>
                );
              })}
              <p className="text-xs text-gray-400">After applying points, pay the rest from <Link href="/dashboard/invoices" className="text-[#1B3FA8] underline">My Invoices</Link>.</p>
            </div>
          )}

          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">History</h2>
          <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
            {data.transactions.length === 0 && <p className="p-5 text-sm text-gray-500">Your points will appear here after your next payment.</p>}
            {data.transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-4 text-sm">
                {t.points >= 0 ? <ArrowUpCircle className="w-5 h-5 text-green-500 shrink-0" /> : <ArrowDownCircle className="w-5 h-5 text-[#F7921A] shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900">{t.description}</p>
                  <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
                <span className={`font-bold ${t.points >= 0 ? "text-green-600" : "text-[#F7921A]"}`}>{t.points >= 0 ? "+" : ""}{t.points.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Questions about your points? Call (844) 928-0875.</p>
        </>
      )}
    </div>
  );
}
