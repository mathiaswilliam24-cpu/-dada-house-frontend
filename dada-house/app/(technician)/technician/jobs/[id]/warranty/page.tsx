"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Shield, ShieldCheck, CheckCircle, Loader2, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type WarrantyItem = {
  id: string;
  equipmentName: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  installDate: string | null;
  expiresAt: string | null;
};

export default function WarrantyPage() {
  const { id } = useParams<{ id: string }>();
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [form, setForm] = useState({
    equipmentName: "", brand: "", model: "", serialNumber: "",
    installDate: "", expiresAt: "", coveredParts: "", coveredLabor: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const loadWarranties = useCallback(() => {
    fetch(`/api/technician/jobs/${id}/warranty`)
      .then((r) => r.json())
      .then((d) => setWarranties(d.warranties ?? []))
      .finally(() => setLoadingList(false));
  }, [id]);

  useEffect(() => { loadWarranties(); }, [loadWarranties]);

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
      setForm({ equipmentName: "", brand: "", model: "", serialNumber: "", installDate: "", expiresAt: "", coveredParts: "", coveredLabor: "", notes: "" });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
      loadWarranties();
    }
    setSaving(false);
  }

  async function remove(warrantyId: string) {
    if (!confirm("Remove this warranty?")) return;
    await fetch(`/api/technician/jobs/${id}/warranty?warrantyId=${warrantyId}`, { method: "DELETE" });
    loadWarranties();
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job Detail</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" /> Warranties
        </h1>
      </div>

      {loadingList ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : warranties.length > 0 ? (
        <div className="space-y-2">
          {warranties.map((w) => (
            <div key={w.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{w.equipmentName}</p>
                {(w.brand || w.model) && (
                  <p className="text-xs text-gray-500">{[w.brand, w.model].filter(Boolean).join(" ")}</p>
                )}
                {w.serialNumber && <p className="text-xs text-gray-400">S/N: {w.serialNumber}</p>}
                {(w.installDate || w.expiresAt) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {w.installDate && `Installed: ${formatDate(w.installDate)}`}
                    {w.installDate && w.expiresAt && " · "}
                    {w.expiresAt && `Expires: ${formatDate(w.expiresAt)}`}
                  </p>
                )}
              </div>
              <button onClick={() => remove(w.id)} className="text-gray-300 hover:text-red-500 shrink-0 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-sm text-gray-400">
          No warranties registered for this job yet
        </div>
      )}

      {justSaved && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-2 text-green-700 text-sm font-medium">
          <CheckCircle className="w-4 h-4" /> Warranty registered!
        </div>
      )}

      <div className="space-y-3 pt-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Add a Warranty</p>
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
