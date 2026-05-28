"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CreditCard, Loader2, DollarSign, CheckCircle, Banknote, Smartphone } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Payment = { id: string; amount: number; method: string; reference?: string; createdAt: string };

const METHODS = [
  { key: "CASH", label: "Cash", icon: Banknote, color: "bg-green-50 border-green-300 text-green-700" },
  { key: "CARD", label: "Card (Stripe)", icon: CreditCard, color: "bg-blue-50 border-blue-300 text-blue-700" },
  { key: "ZELLE", label: "Zelle", icon: Smartphone, color: "bg-purple-50 border-purple-300 text-purple-700" },
  { key: "CHECK", label: "Check", icon: DollarSign, color: "bg-orange-50 border-orange-300 text-orange-700" },
];

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState("CASH");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}/payment`)
      .then((r) => r.json())
      .then((d) => { setPayments(d.payments ?? []); setTotal(d.total ?? 0); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function record() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return alert("Enter a valid amount");
    setSaving(true);
    const res = await fetch(`/api/technician/jobs/${id}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amt, method, reference, notes }),
    });
    if (res.ok) {
      setAmount(""); setReference(""); setNotes(""); setShowForm(false);
      load();
    }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job Detail</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600" /> Payment Collection
        </h1>
      </div>

      {/* Total collected */}
      <div className={`rounded-2xl p-4 text-white ${total > 0 ? "bg-green-600" : "bg-gray-400"}`}>
        <p className="text-sm opacity-80">Total Collected</p>
        <p className="text-3xl font-black">{formatCurrency(total)}</p>
      </div>

      {/* Payments list */}
      {payments.length > 0 && (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-gray-900 text-sm">{p.method}</span>
                </div>
                {p.reference && <p className="text-xs text-gray-500 mt-0.5">Ref: {p.reference}</p>}
                <p className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleString()}</p>
              </div>
              <span className="text-lg font-black text-gray-900">{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add payment form */}
      {showForm ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4">
          <h3 className="font-semibold text-gray-900 text-sm">Record Payment</h3>

          {/* Method selector */}
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map(({ key, label, icon: Icon, color }) => (
              <button
                key={key}
                onClick={() => setMethod(key)}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  method === key ? color : "bg-white border-gray-200 text-gray-600"
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Amount ($) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min={0}
              step={0.01}
              className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-3 text-lg font-bold focus:outline-none focus:border-[#1B3FA8]"
            />
          </div>

          {(method === "ZELLE" || method === "CHECK") && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                {method === "CHECK" ? "Check Number" : "Zelle Reference"}
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={method === "CHECK" ? "Check #..." : "Transaction ref..."}
                className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
              />
            </div>
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)…"
            rows={2}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#1B3FA8]"
          />

          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold">Cancel</button>
            <button onClick={record} disabled={saving} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-40">
              {saving ? "Recording…" : "Record Payment"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3.5 flex items-center justify-center gap-2 bg-green-600 text-white rounded-2xl font-bold"
        >
          <DollarSign className="w-5 h-5" /> Collect Payment
        </button>
      )}
    </div>
  );
}
