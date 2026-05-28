"use client";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, CheckCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Plan = { id: string; name: string; description: string | null; price: number; interval: string; features: string[]; isActive: boolean; sortOrder: number; };

export default function AdminServicePlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", interval: "monthly", features: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/admin/service-plans").then(r => r.json()).then(d => { setPlans(d.plans ?? []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  function startEdit(plan: Plan) {
    setEditing(plan);
    setForm({ name: plan.name, description: plan.description ?? "", price: plan.price.toString(), interval: plan.interval, features: plan.features.join("\n") });
    setShowForm(true);
  }

  function resetForm() { setEditing(null); setForm({ name: "", description: "", price: "", interval: "monthly", features: "" }); setShowForm(false); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const payload = { ...form, price: parseFloat(form.price), features: form.features.split("\n").map(f => f.trim()).filter(Boolean) };
    if (editing) {
      await fetch(`/api/admin/service-plans/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/admin/service-plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setSaving(false); resetForm(); load();
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this plan?")) return;
    await fetch(`/api/admin/service-plans/${id}`, { method: "DELETE" });
    setPlans(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Plans</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage recurring maintenance plans</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7921A] text-white rounded-lg text-sm font-semibold hover:bg-[#E07F10]">
          <Plus className="w-4 h-4" />New Plan
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">{editing ? "Edit Plan" : "New Service Plan"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Price *</label><input required type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Billing Interval</label>
              <select value={form.interval} onChange={e => setForm({...form, interval: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><input value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Features (one per line)</label><textarea rows={4} value={form.features} onChange={e => setForm({...form, features: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Annual AC tune-up&#10;Priority scheduling&#10;10% parts discount" /></div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#1B3FA8] text-white rounded-lg text-sm font-semibold disabled:opacity-60">{saving ? "Saving…" : editing ? "Update" : "Create"}</button>
            <button type="button" onClick={resetForm} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-xs text-gray-500 capitalize">{plan.interval} billing</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(plan)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => deletePlan(plan.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-2xl font-black text-[#1B3FA8] mb-1">{formatCurrency(plan.price)}<span className="text-sm font-normal text-gray-400">/{plan.interval.slice(0, 2)}</span></p>
              {plan.description && <p className="text-sm text-gray-500 mb-3">{plan.description}</p>}
              <ul className="space-y-1.5 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {plan.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
          {plans.length === 0 && <div className="col-span-full py-12 text-center text-gray-400 text-sm">No service plans yet</div>}
        </div>
      )}
    </div>
  );
}
