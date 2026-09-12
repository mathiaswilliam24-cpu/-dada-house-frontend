"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Package, Plus, X, Check } from "lucide-react";

type PurchaseOrder = {
  id: string; itemName: string; quantity: number; reason: string | null; status: string; createdAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-orange-100 text-orange-700",
  RECEIVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

export default function PurchaseOrdersPage() {
  const { id } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}/purchase-orders`)
      .then((r) => r.json())
      .then((d) => { if (d.orders) setOrders(d.orders); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/technician/jobs/${id}/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemName, quantity, reason }),
    });
    if (res.ok) {
      setItemName(""); setQuantity(1); setReason("");
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  async function markReceived(requestId: string) {
    await fetch(`/api/technician/jobs/${id}/purchase-orders`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, status: "RECEIVED" }),
    });
    load();
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}/invoice`} className="text-sm text-gray-500">← Invoice</Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-xl font-bold text-gray-900">Purchase Orders</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B3FA8] text-white rounded-lg text-sm font-semibold"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "Request"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Request a part or material for this job.</p>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Item name (e.g. Capacitor 45/5 MFD)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" required />
          <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} placeholder="Quantity" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason / notes (optional)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
          <button type="submit" disabled={saving || !itemName.trim()} className="w-full py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold disabled:opacity-60">
            {saving ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#1B3FA8]" /></div>
      ) : orders.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">No purchase orders for this job yet.</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#1B3FA8]" />
                  <p className="font-semibold text-gray-900 text-sm">{o.itemName}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_COLOR[o.status] ?? "bg-gray-100 text-gray-600"}`}>{o.status}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Qty: {o.quantity}</p>
              {o.reason && <p className="text-sm text-gray-600 mt-1.5">{o.reason}</p>}
              {o.status === "PENDING" && (
                <button
                  onClick={() => markReceived(o.id)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 bg-green-50 text-green-700 border border-green-200 rounded-xl text-xs font-semibold"
                >
                  <Check className="w-3.5 h-3.5" /> Mark as Received
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
