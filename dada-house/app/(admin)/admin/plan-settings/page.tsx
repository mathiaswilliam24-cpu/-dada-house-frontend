"use client";

import { useEffect, useState } from "react";
import {
  Settings, Plus, Pencil, Trash2, Check, X, Loader2,
  Eye, EyeOff, DollarSign, ChevronUp, ChevronDown,
} from "lucide-react";

type Plan = {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  isActive: boolean;
  sortOrder: number;
  stripeMonthlyPriceId: string | null;
  stripeAnnualPriceId: string | null;
};

function PlanRow({
  plan,
  onUpdated,
  onDeleted,
}: {
  plan: Plan;
  onUpdated: (p: Plan) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState({
    name:         plan.name,
    monthlyPrice: String(plan.monthlyPrice),
    annualPrice:  String(plan.annualPrice),
  });

  const addlAnnual  = (parseFloat(form.annualPrice)  * 0.8).toFixed(0);
  const addlMonthly = (parseFloat(form.monthlyPrice) * 0.8).toFixed(2);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/maintenance-plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         form.name,
          monthlyPrice: parseFloat(form.monthlyPrice),
          annualPrice:  parseFloat(form.annualPrice),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      onUpdated(d.plan);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    const res = await fetch(`/api/admin/maintenance-plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    const d = await res.json();
    if (res.ok) onUpdated(d.plan);
  }

  async function deletePlan() {
    if (!confirm(`Delete "${plan.name}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/maintenance-plans/${plan.id}`, { method: "DELETE" });
    onDeleted(plan.id);
  }

  return (
    <div className={`bg-white border rounded-2xl p-5 transition-all ${plan.isActive ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Plan Name</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Monthly Price ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={form.monthlyPrice}
                  onChange={e => setForm(f => ({ ...f, monthlyPrice: e.target.value }))}
                  className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Additional system: ${addlMonthly}/mo</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Annual Price ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                <input
                  type="number" min="0" step="1"
                  value={form.annualPrice}
                  onChange={e => setForm(f => ({ ...f, annualPrice: e.target.value }))}
                  className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Additional system: ${addlAnnual}/yr</p>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1B3FA8] hover:bg-[#0D1D5E] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </button>
            <button onClick={() => { setEditing(false); setError(""); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-colors">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-gray-900 text-base">{plan.name}</span>
              {!plan.isActive && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-bold text-[#F7921A]">${plan.annualPrice}/yr</span>
              <span className="text-gray-400">·</span>
              <span className="font-bold text-gray-600">${plan.monthlyPrice}/mo</span>
              <span className="text-gray-400">·</span>
              <span className="text-xs text-gray-400">
                +${(plan.annualPrice * 0.8).toFixed(0)}/yr each additional system
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={toggleActive} title={plan.isActive ? "Deactivate" : "Activate"}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
              {plan.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button onClick={() => setEditing(true)} title="Edit"
              className="p-2 text-gray-400 hover:text-[#1B3FA8] rounded-lg hover:bg-blue-50 transition-colors">
              <Pencil size={16} />
            </button>
            <button onClick={deletePlan} title="Delete"
              className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlanSettingsPage() {
  const [plans, setPlans]   = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({
    name: "", monthlyPrice: "", annualPrice: "",
  });
  const [createError, setCreateError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/maintenance-plans");
    const d   = await res.json();
    setPlans(d.plans ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/maintenance-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:         newForm.name,
          monthlyPrice: parseFloat(newForm.monthlyPrice),
          annualPrice:  parseFloat(newForm.annualPrice),
          contractHtml: `<p>${newForm.name} HVAC Maintenance Plan Agreement</p>`,
          sortOrder:    plans.length,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setPlans(prev => [...prev, d.plan]);
      setNewForm({ name: "", monthlyPrice: "", annualPrice: "" });
      setShowNew(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Settings size={22} className="text-[#1B3FA8]" />
            Maintenance Plan Settings
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Changes to prices and names are reflected immediately on the public site and enrollment page.
          </p>
        </div>
        <button
          onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B3FA8] hover:bg-[#0D1D5E] text-white text-sm font-bold rounded-xl transition-colors"
        >
          <Plus size={15} />
          New Plan
        </button>
      </div>

      {/* New plan form */}
      {showNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Create New Plan</h3>
          <form onSubmit={createPlan} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Plan Name *</label>
              <input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Standard, Premium, Commercial" required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Monthly Price ($) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input type="number" min="0" step="0.01" value={newForm.monthlyPrice}
                    onChange={e => setNewForm(f => ({ ...f, monthlyPrice: e.target.value }))} required
                    placeholder="21.00"
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Annual Price ($) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input type="number" min="0" step="1" value={newForm.annualPrice}
                    onChange={e => setNewForm(f => ({ ...f, annualPrice: e.target.value }))} required
                    placeholder="199"
                    className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
                </div>
              </div>
            </div>
            {createError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{createError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={creating}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#1B3FA8] hover:bg-[#0D1D5E] disabled:opacity-60 text-white text-sm font-bold rounded-xl">
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Plan
              </button>
              <button type="button" onClick={() => setShowNew(false)}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 text-sm font-bold rounded-xl border border-gray-200">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
        <div className="flex items-start gap-2">
          <DollarSign size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold mb-0.5">Price changes</p>
            <p>Updating a price creates new Stripe prices automatically. Existing subscribers keep their current rate until renewal. The public enrollment page reflects the new price immediately.</p>
          </div>
        </div>
      </div>

      {/* Plan list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Settings size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No plans yet</p>
          <p className="text-sm">Click &quot;New Plan&quot; to create your first plan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((plan, i) => (
              <div key={plan.id} className="flex items-start gap-2">
                <div className="flex flex-col gap-1 mt-5">
                  <button
                    disabled={i === 0}
                    className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-20"
                    onClick={async () => {
                      const prev = plans[i - 1];
                      await Promise.all([
                        fetch(`/api/admin/maintenance-plans/${plan.id}`,  { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: prev.sortOrder }) }),
                        fetch(`/api/admin/maintenance-plans/${prev.id}`,  { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: plan.sortOrder }) }),
                      ]);
                      load();
                    }}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    disabled={i === plans.length - 1}
                    className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-20"
                    onClick={async () => {
                      const next = plans[i + 1];
                      await Promise.all([
                        fetch(`/api/admin/maintenance-plans/${plan.id}`,  { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: next.sortOrder }) }),
                        fetch(`/api/admin/maintenance-plans/${next.id}`,  { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: plan.sortOrder }) }),
                      ]);
                      load();
                    }}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div className="flex-1">
                  <PlanRow
                    plan={plan}
                    onUpdated={updated => setPlans(prev => prev.map(p => p.id === updated.id ? updated : p))}
                    onDeleted={id => setPlans(prev => prev.filter(p => p.id !== id))}
                  />
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
