"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Package, Plus, Trash2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Part = {
  id: string; partName: string; partNumber?: string;
  quantity: number; unitCost: number; totalCost: number;
  warrantyPeriod?: string; supplier?: string; notes?: string;
};

const EMPTY_FORM = {
  partName: "", partNumber: "", quantity: 1, unitCost: 0,
  warrantyPeriod: "", supplier: "", notes: "",
};

export default function PartsPage() {
  const { id } = useParams<{ id: string }>();
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}/parts`)
      .then((r) => r.json())
      .then((d) => { setParts(d.parts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function addPart() {
    if (!form.partName.trim()) return alert("Part name is required");
    setAdding(true);
    const res = await fetch(`/api/technician/jobs/${id}/parts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        quantity: Number(form.quantity),
        unitCost: Number(form.unitCost),
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setParts((p) => [...p, d.part]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    }
    setAdding(false);
  }

  async function deletePart(partId: string) {
    if (!confirm("Remove this part?")) return;
    await fetch(`/api/technician/jobs/${id}/parts?partId=${partId}`, { method: "DELETE" });
    setParts((p) => p.filter((x) => x.id !== partId));
  }

  const total = parts.reduce((s, p) => s + p.totalCost, 0);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job Detail</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-600" /> Parts Used
        </h1>
      </div>

      {/* Total */}
      {parts.length > 0 && (
        <div className="bg-[#1B3FA8] text-white rounded-2xl p-4 flex items-center justify-between">
          <span className="text-sm text-blue-200">{parts.length} part{parts.length !== 1 ? "s" : ""}</span>
          <span className="text-2xl font-black">{formatCurrency(total)}</span>
        </div>
      )}

      {/* Parts list */}
      {parts.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No parts recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {parts.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{p.partName}</p>
                {p.partNumber && <p className="text-xs text-gray-400 font-mono">#{p.partNumber}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                  <span>Qty: {p.quantity}</span>
                  <span>Unit: {formatCurrency(p.unitCost)}</span>
                  {p.supplier && <span>Supplier: {p.supplier}</span>}
                </div>
                {p.warrantyPeriod && (
                  <span className="text-xs text-green-600 mt-1 inline-block">Warranty: {p.warrantyPeriod}</span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-gray-900">{formatCurrency(p.totalCost)}</p>
                <button onClick={() => deletePart(p.id)} className="mt-1 text-red-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Add Part</h3>
          <input
            value={form.partName}
            onChange={(e) => setForm((f) => ({ ...f, partName: e.target.value }))}
            placeholder="Part name *"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.partNumber}
              onChange={(e) => setForm((f) => ({ ...f, partNumber: e.target.value }))}
              placeholder="Part number"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
            />
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
              placeholder="Quantity"
              min={1}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
            />
            <input
              type="number"
              value={form.unitCost}
              onChange={(e) => setForm((f) => ({ ...f, unitCost: Number(e.target.value) }))}
              placeholder="Unit cost ($)"
              min={0}
              step={0.01}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
            />
            <input
              value={form.supplier}
              onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              placeholder="Supplier"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
            />
          </div>
          <input
            value={form.warrantyPeriod}
            onChange={(e) => setForm((f) => ({ ...f, warrantyPeriod: e.target.value }))}
            placeholder="Warranty period (e.g. 1 year)"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold">Cancel</button>
            <button onClick={addPart} disabled={adding} className="flex-1 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-bold disabled:opacity-40">
              {adding ? "Adding…" : "Add Part"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3.5 flex items-center justify-center gap-2 bg-[#1B3FA8] text-white rounded-2xl font-bold"
        >
          <Plus className="w-5 h-5" /> Add Part
        </button>
      )}
    </div>
  );
}
