"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";

type SystemType = { id: string; name: string; isActive: boolean };

export default function AdminSystemTypesPage() {
  const [types, setTypes] = useState<SystemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/admin/system-types").then((r) => r.json()).then((d) => { setTypes(d.types ?? []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function addType(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/admin/system-types", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setName("");
    setSaving(false);
    load();
  }

  async function removeType(id: string) {
    if (!confirm("Remove this system type?")) return;
    await fetch(`/api/admin/system-types/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Types</h1>
        <p className="text-gray-500 text-sm mt-0.5">HVAC system types technicians choose from on the Performance Plan Contract (Heat Pump, Straight Cool, Package Unit, ...)</p>
      </div>

      <form onSubmit={addType} className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mini Split"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <button type="submit" disabled={saving || !name.trim()} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F7921A] text-white rounded-lg text-sm font-semibold disabled:opacity-60">
          <Plus className="w-4 h-4" />Add
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {types.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3">
              <span className="text-sm text-gray-800">{t.name}</span>
              <button onClick={() => removeType(t.id)} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {types.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No system types yet</p>}
        </div>
      )}
    </div>
  );
}
