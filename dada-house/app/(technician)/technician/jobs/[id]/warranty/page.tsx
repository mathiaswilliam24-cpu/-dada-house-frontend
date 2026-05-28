"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Shield, CheckCircle, Loader2 } from "lucide-react";

export default function WarrantyPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState({
    equipmentName: "", brand: "", model: "", serialNumber: "",
    installDate: "", expiresAt: "", coveredParts: "", coveredLabor: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  async function save() {
    if (!form.equipmentName.trim()) return alert("Equipment name is required");
    setSaving(true);
    const res = await fetch(`/api/technician/jobs/${id}/warranty`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setSaved(true);
      setForm({ equipmentName: "", brand: "", model: "", serialNumber: "", installDate: "", expiresAt: "", coveredParts: "", coveredLabor: "", notes: "" });
    }
    setSaving(false);
  }

  if (saved) {
    return (
      <div className="space-y-4">
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job Detail</Link>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="font-bold text-green-700 text-lg">Warranty Registered!</h2>
          <p className="text-sm text-green-600 mt-1">The warranty has been saved for the customer.</p>
          <button onClick={() => setSaved(false)} className="mt-4 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold">
            Add Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job Detail</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" /> Add Warranty
        </h1>
      </div>

      <div className="space-y-3">
        <Row label="Equipment Name *">
          <input value={form.equipmentName} onChange={set("equipmentName")} placeholder="e.g. Carrier AC Unit" className={inp} />
        </Row>
        <div className="grid grid-cols-2 gap-3">
          <Row label="Brand">
            <input value={form.brand} onChange={set("brand")} placeholder="Carrier" className={inp} />
          </Row>
          <Row label="Model">
            <input value={form.model} onChange={set("model")} placeholder="Model #" className={inp} />
          </Row>
        </div>
        <Row label="Serial Number">
          <input value={form.serialNumber} onChange={set("serialNumber")} placeholder="Serial #" className={inp} />
        </Row>
        <div className="grid grid-cols-2 gap-3">
          <Row label="Install Date">
            <input type="date" value={form.installDate} onChange={set("installDate")} className={inp} />
          </Row>
          <Row label="Expiry Date">
            <input type="date" value={form.expiresAt} onChange={set("expiresAt")} className={inp} />
          </Row>
        </div>
        <Row label="Parts Covered">
          <input value={form.coveredParts} onChange={set("coveredParts")} placeholder="e.g. Compressor, coils" className={inp} />
        </Row>
        <Row label="Labor Covered">
          <input value={form.coveredLabor} onChange={set("coveredLabor")} placeholder="e.g. 1 year labor" className={inp} />
        </Row>
        <Row label="Notes">
          <textarea value={form.notes} onChange={set("notes")} rows={3} placeholder="Additional warranty details…"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#1B3FA8]" />
        </Row>
      </div>

      <button
        onClick={save}
        disabled={saving || !form.equipmentName.trim()}
        className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Shield className="w-4 h-4" /> Register Warranty</>}
      </button>
    </div>
  );
}

const inp = "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
