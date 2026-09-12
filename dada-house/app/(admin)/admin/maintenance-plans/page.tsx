"use client";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Plan = {
  id: string; name: string; monthlyPrice: number; annualPrice: number;
  isActive: boolean; sortOrder: number; contractHtml: string;
};

export default function AdminMaintenancePlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({ name: "", monthlyPrice: "", annualPrice: "", contractHtml: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/admin/maintenance-plans").then(r => r.json()).then(d => { setPlans(d.plans ?? []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  function startEdit(plan: Plan) {
    setEditing(plan);
    setForm({ name: plan.name, monthlyPrice: String(plan.monthlyPrice), annualPrice: String(plan.annualPrice), contractHtml: plan.contractHtml });
    setShowForm(true);
  }

  function resetForm() { setEditing(null); setForm({ name: "", monthlyPrice: "", annualPrice: "", contractHtml: "" }); setShowForm(false); setError(""); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = editing
        ? await fetch(`/api/admin/maintenance-plans/${editing.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: form.name, contractHtml: form.contractHtml }),
          })
        : await fetch("/api/admin/maintenance-plans", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to save");
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this plan? This will fail if any customers are already subscribed to it.")) return;
    await fetch(`/api/admin/maintenance-plans/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Plans</h1>
          <p className="text-gray-500 text-sm mt-0.5">Plans sent as e-signable contracts from a customer's profile</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7921A] text-white rounded-lg text-sm font-semibold hover:bg-[#E07F10]">
          <Plus className="w-4 h-4" />New Plan
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Plan Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Standard" />
          </div>
          {!editing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Monthly Price ($)</label>
                <input type="number" step="0.01" value={form.monthlyPrice} onChange={e => setForm(f => ({ ...f, monthlyPrice: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Annual Price ($)</label>
                <input type="number" step="0.01" value={form.annualPrice} onChange={e => setForm(f => ({ ...f, annualPrice: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          )}
          {editing && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">
              Pricing can't be changed after a plan is created (existing subscriptions are tied to the original Stripe price). Create a new plan for a different price.
            </p>
          )}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Contract Terms (HTML — sections 2 through 9 of the agreement)</label>
            <textarea value={form.contractHtml} onChange={e => setForm(f => ({ ...f, contractHtml: e.target.value }))} required rows={10}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono" />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#1B3FA8] text-white rounded-lg text-sm font-semibold disabled:opacity-60">
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Plan"}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {plans.map(plan => (
            <div key={plan.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-gray-900">{plan.name}</p>
                <p className="text-sm text-gray-500">{formatCurrency(plan.monthlyPrice)}/mo · {formatCurrency(plan.annualPrice)}/yr</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(plan)} className="p-2 text-gray-400 hover:text-[#1B3FA8]"><Edit className="w-4 h-4" /></button>
                <button onClick={() => deletePlan(plan.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {plans.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No maintenance plans yet</p>}
        </div>
      )}
    </div>
  );
}
