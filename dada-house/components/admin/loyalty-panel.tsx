"use client";

import { useEffect, useState } from "react";
import { Star, Plus, Minus, Loader2, CheckCircle, ChevronDown, ChevronUp, Gift } from "lucide-react";

type Transaction = {
  id: string;
  type: string;
  points: number;
  description: string;
  invoiceId: string | null;
  createdAt: string;
};

type Account = {
  id: string;
  balance: number;
  dollarValue: string;
  totalEarned: number;
  totalSpent: number;
};

export default function LoyaltyPanel({ customerId }: { customerId: string }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjPoints, setAdjPoints] = useState("");
  const [adjDesc, setAdjDesc] = useState("");
  const [adjType, setAdjType] = useState<"add" | "remove">("add");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/loyalty/${customerId}`);
      const d = await res.json();
      setAccount(d.account);
      setTransactions(d.transactions ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [customerId]);

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const pts = parseInt(adjPoints);
      const res = await fetch(`/api/admin/loyalty/${customerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust",
          points: adjType === "add" ? pts : -pts,
          description: adjDesc || (adjType === "add" ? "Ajustement manuel (ajout)" : "Ajustement manuel (retrait)"),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error");
      setSaved(true);
      setAdjPoints("");
      setAdjDesc("");
      load();
      setTimeout(() => { setSaved(false); setShowAdjust(false); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading) return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-center">
      <Loader2 size={18} className="animate-spin text-slate-300" />
    </div>
  );

  const balance = account?.balance ?? 0;
  const dollarValue = account?.dollarValue ?? "0.00";

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
            <Gift size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Points de fidélité</p>
            <p className="text-xs text-slate-500">1 pt par $1 payé · 100 pts = $1</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xl font-black text-amber-600">{balance.toLocaleString()}</p>
            <p className="text-xs text-slate-400">pts = <span className="font-semibold text-slate-600">${dollarValue}</span></p>
          </div>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-5 space-y-4">
          {/* Stats */}
          {account && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Solde", value: balance.toLocaleString(), color: "text-amber-600" },
                { label: "Total gagné", value: account.totalEarned.toLocaleString(), color: "text-green-600" },
                { label: "Total utilisé", value: account.totalSpent.toLocaleString(), color: "text-red-500" },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Adjust button */}
          {!showAdjust ? (
            <button
              onClick={() => setShowAdjust(true)}
              className="flex items-center gap-2 text-xs font-bold text-[#1B3FA8] hover:text-[#0D1D5E] transition-colors"
            >
              <Star size={13} />
              Ajustement manuel
            </button>
          ) : (
            <form onSubmit={handleAdjust} className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-amber-800">Ajustement manuel de points</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setAdjType("add")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border-2 transition-all ${adjType === "add" ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-400"}`}>
                  <Plus size={12} /> Ajouter
                </button>
                <button type="button" onClick={() => setAdjType("remove")}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border-2 transition-all ${adjType === "remove" ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 text-slate-400"}`}>
                  <Minus size={12} /> Retirer
                </button>
              </div>
              <input type="number" min="1" value={adjPoints} onChange={e => setAdjPoints(e.target.value)}
                placeholder="Nombre de points" required
                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
              <input value={adjDesc} onChange={e => setAdjDesc(e.target.value)}
                placeholder="Raison (optionnel)"
                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
              {error && <p className="text-red-600 text-xs">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={saving || saved}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-60">
                  {saved ? <><CheckCircle size={12} /> Appliqué</> : saving ? <><Loader2 size={12} className="animate-spin" /> ...</> : "Confirmer"}
                </button>
                <button type="button" onClick={() => setShowAdjust(false)}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 font-semibold">
                  Annuler
                </button>
              </div>
            </form>
          )}

          {/* Transaction history */}
          {transactions.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Historique</p>
              <div className="space-y-1">
                {transactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                    <div>
                      <p className="text-xs text-slate-700">{t.description}</p>
                      <p className="text-xs text-slate-400">{fmtDate(t.createdAt)}</p>
                    </div>
                    <span className={`text-sm font-black ${t.points > 0 ? "text-green-600" : "text-red-500"}`}>
                      {t.points > 0 ? "+" : ""}{t.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {transactions.length === 0 && !account && (
            <p className="text-xs text-slate-400 text-center py-2">Aucune transaction — les points s&apos;accumulent dès la première facture payée</p>
          )}
        </div>
      )}
    </div>
  );
}
