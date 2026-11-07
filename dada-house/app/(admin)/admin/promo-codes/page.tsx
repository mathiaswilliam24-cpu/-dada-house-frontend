"use client";

import { useEffect, useState } from "react";
import { Tag, Plus, X, Loader2, CheckCircle, Copy, Check, Percent, DollarSign, Trash2 } from "lucide-react";

type PromoCode = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  type: "percent" | "fixed";
  amount: number;
  timesRedeemed: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
  createdAt: string;
};

export default function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "percent" as "percent" | "fixed",
    amount: "",
    maxUses: "",
    expiresAt: "",
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promo-codes");
      const d = await res.json();
      setCodes(d.codes ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.toUpperCase().trim(),
          name: form.name.trim(),
          type: form.type,
          amount: parseFloat(form.amount),
          maxUses: form.maxUses ? parseInt(form.maxUses) : null,
          expiresAt: form.expiresAt || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to create");
      setSaved(true);
      setForm({ code: "", name: "", type: "percent", amount: "", maxUses: "", expiresAt: "" });
      load();
      setTimeout(() => { setSaved(false); setShowForm(false); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/admin/promo-codes/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promo Codes</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Codes de réduction pour le plan de maintenance HVAC — appliqués automatiquement lors du paiement Stripe
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B3FA8] hover:bg-[#0D1D5E] text-white text-sm font-bold rounded-xl transition-colors"
        >
          <Plus size={16} />
          Nouveau Code
        </button>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">Créer un code promo</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Code *</label>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="ex: FRIEND20, AMIS15"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Lettres majuscules, chiffres et tirets uniquement</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ex: Réduction parrainage ami"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
                  required
                />
              </div>

              {/* Type + Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Type de réduction *</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: "percent" }))}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${form.type === "percent" ? "border-[#1B3FA8] bg-[#1B3FA8]/5 text-[#1B3FA8]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                  >
                    <Percent size={15} />
                    Pourcentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: "fixed" }))}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${form.type === "fixed" ? "border-[#F7921A] bg-[#F7921A]/5 text-[#F7921A]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                  >
                    <DollarSign size={15} />
                    Montant fixe
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-bold">{form.type === "percent" ? "%" : "$"}</span>
                  <input
                    type="number"
                    min="0.01"
                    max={form.type === "percent" ? "100" : undefined}
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder={form.type === "percent" ? "ex: 10 (= 10%)" : "ex: 20 (= $20 off)"}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
                    required
                  />
                </div>
              </div>

              {/* Optional fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Utilisations max</label>
                  <input
                    type="number"
                    min="1"
                    value={form.maxUses}
                    onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                    placeholder="Illimité"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Expire le</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
                  />
                </div>
              </div>

              {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button
                type="submit"
                disabled={saving || saved}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#1B3FA8] hover:bg-[#0D1D5E] disabled:opacity-60 text-white font-bold rounded-xl transition-colors"
              >
                {saved ? <><CheckCircle size={16} /> Créé !</> : saving ? <><Loader2 size={16} className="animate-spin" /> Création...</> : <><Plus size={16} /> Créer le code</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Comment ça fonctionne</p>
        <p>Le champ de code promo est affiché automatiquement lors du paiement Stripe. Le client entre le code et la réduction s&apos;applique immédiatement. Les codes sont gérés directement dans Stripe.</p>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Tag size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Aucun code promo créé</p>
          <p className="text-sm mt-1">Cliquez sur &quot;Nouveau Code&quot; pour commencer</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map(c => (
            <div key={c.id} className={`bg-white border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${c.active ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
              {/* Code badge */}
              <div className="flex items-center gap-3 flex-1">
                <div className={`px-3 py-1.5 rounded-lg font-mono font-black text-sm tracking-wide ${c.active ? "bg-[#1B3FA8]/10 text-[#1B3FA8]" : "bg-gray-100 text-gray-400"}`}>
                  {c.code}
                </div>
                <button
                  onClick={() => copyCode(c.code)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copier le code"
                >
                  {copied === c.code ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
              </div>

              {/* Details */}
              <div className="flex-[2]">
                <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                <div className="flex flex-wrap gap-3 mt-1">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${c.type === "percent" ? "bg-purple-50 text-purple-700" : "bg-orange-50 text-orange-700"}`}>
                    {c.type === "percent" ? <Percent size={10} /> : <DollarSign size={10} />}
                    {c.type === "percent" ? `${c.amount}% off` : `$${c.amount} off`}
                  </span>
                  <span className="text-xs text-gray-400">
                    {c.timesRedeemed} utilisation{c.timesRedeemed !== 1 ? "s" : ""}
                    {c.maxRedemptions ? ` / ${c.maxRedemptions} max` : ""}
                  </span>
                  {c.expiresAt && (
                    <span className="text-xs text-gray-400">Expire le {fmtDate(c.expiresAt)}</span>
                  )}
                  {!c.active && <span className="text-xs text-red-500 font-semibold">Désactivé</span>}
                </div>
              </div>

              {/* Created */}
              <div className="text-xs text-gray-400 hidden sm:block">
                Créé le {fmtDate(c.createdAt)}
              </div>

              {/* Delete */}
              {c.active && (
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={deleting === c.id}
                  className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                  title="Désactiver"
                >
                  {deleting === c.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
