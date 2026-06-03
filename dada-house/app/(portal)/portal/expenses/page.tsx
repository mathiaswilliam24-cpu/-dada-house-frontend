"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Plus, ReceiptText, Lock, Sparkles, X, Camera } from "lucide-react";

interface Expense {
  id: string;
  merchant: string | null;
  description: string | null;
  amount: number;
  date: string;
  receiptUrl: string | null;
  source: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [count, setCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [freeLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ merchant: string; date: string; amount: number; description: string } | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanError, setScanError] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/client/expenses");
    if (res.ok) {
      const data = await res.json();
      setExpenses(data.expenses);
      setCount(data.count);
      setIsPremium(data.isPremium);
      setLimitReached(data.limitReached);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = objectUrl;
    });
  }

  async function handleFile(file: File) {
    setScanning(true);
    setScanResult(null);
    setScanError(false);

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    try {
      const base64 = await compressImage(file);
      const res = await fetch("/api/client/expenses/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64 }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.merchant !== undefined) {
        setScanResult(data);
      } else {
        console.error("[scan] API error:", res.status, data);
        setScanError(true);
      }
    } catch (err) {
      console.error("[scan] fetch error:", err);
      setScanError(true);
    } finally {
      setScanning(false);
      setShowForm(true);
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      merchant: fd.get("merchant"),
      description: fd.get("description"),
      amount: parseFloat(fd.get("amount") as string),
      date: fd.get("date"),
      receiptUrl,
      source: receiptUrl ? "receipt_scan" : "manual",
    };
    const res = await fetch("/api/client/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 403) {
      setLimitReached(true);
    } else if (res.ok) {
      setShowForm(false);
      setScanResult(null);
      setReceiptUrl(null);
      await load();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch("/api/client/expenses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
    setDeletingId(null);
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isPremium ? "Premium — unlimited receipts" : `${count} / ${freeLimit} free receipts used`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isPremium && (
            <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2.5 py-1 rounded-full">
              {count}/{freeLimit} free
            </span>
          )}
          <button
            onClick={() => { setShowForm(true); setScanResult(null); setReceiptUrl(null); }}
            disabled={limitReached}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1B3FA8] text-white text-sm font-medium rounded-lg hover:bg-[#1B3FA8]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" /> New Expense
          </button>
        </div>
      </div>

      {/* Upgrade banner */}
      {limitReached && (
        <div className="bg-gradient-to-r from-[#1B3FA8] to-[#2A4FBB] rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Lock className="w-6 h-6 text-[#F7921A]" />
            <h2 className="font-bold text-lg">You've reached the free limit</h2>
          </div>
          <p className="text-blue-200 text-sm mb-4">
            You've stored {freeLimit} receipts. Upgrade to Premium for unlimited storage, export features, and more.
          </p>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-black">$14</p>
              <p className="text-xs text-blue-200">/month</p>
            </div>
            <ul className="text-sm text-blue-100 space-y-1">
              <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#F7921A]" /> Unlimited receipt storage</li>
              <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#F7921A]" /> CSV / PDF export</li>
              <li className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#F7921A]" /> Monthly reports</li>
            </ul>
          </div>
          <button
            onClick={() => router.push("/portal/expenses/upgrade")}
            className="mt-4 px-6 py-2.5 bg-[#F7921A] text-white font-bold rounded-xl hover:bg-[#F7921A]/90 transition-colors text-sm"
          >
            Upgrade to Premium — $14/mo
          </button>
        </div>
      )}

      {/* Upload zone */}
      {!limitReached && (
        <div className="border-2 border-dashed border-orange-300 bg-orange-50 rounded-2xl p-6 mb-6 text-center">
          {scanning ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-[3px] border-[#1B3FA8] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600 font-medium">Scanning with AI…</p>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-sm text-gray-700 font-medium mb-1">Scan or upload your receipt</p>
              <p className="text-xs text-gray-400 mb-4">(jpg/jpeg/png/webp)</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {/* Camera — label directly triggers input (iOS compatible) */}
                <label className="flex items-center gap-2 px-5 py-2.5 bg-[#1B3FA8] text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-[#1B3FA8]/90 transition-colors">
                  <Camera className="w-4 h-4" /> Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                  />
                </label>
                <label className="flex items-center gap-2 px-5 py-2.5 bg-[#F7921A] text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-[#F7921A]/90 transition-colors">
                  <Upload className="w-4 h-4" /> Upload File
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                  />
                </label>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <ReceiptText className="w-5 h-5 text-[#1B3FA8]" />
              {scanResult ? "Confirm scanned receipt" : "Add expense manually"}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          {scanError && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
              AI scan couldn't read this receipt — please fill in the fields manually.
            </div>
          )}
          {previewUrl && (
            <img src={previewUrl} alt="Receipt" className="w-32 h-40 object-cover rounded-lg border mb-4" />
          )}
          <form ref={formRef} onSubmit={handleSave} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Merchant</label>
              <input name="merchant" defaultValue={scanResult?.merchant ?? ""} placeholder="Store / supplier name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Date</label>
              <input name="date" type="date" defaultValue={scanResult?.date ?? new Date().toISOString().slice(0, 10)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Total ($)</label>
              <input name="amount" type="number" step="0.01" min="0" defaultValue={scanResult?.amount ?? ""} required placeholder="0.00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Description (optional)</label>
              <input name="description" defaultValue={scanResult?.description ?? ""} placeholder="What was this for?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 text-sm font-bold bg-[#F7921A] text-white rounded-lg hover:bg-[#F7921A]/90 disabled:opacity-60">
                {saving ? "Saving…" : "Save Expense"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary */}
      {expenses.length > 0 && (
        <div className="bg-[#1B3FA8] text-white rounded-xl px-5 py-3 flex items-center justify-between mb-4">
          <span className="text-sm text-blue-200">{expenses.length} expenses total</span>
          <span className="font-bold text-lg">{fmt(total)}</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-100 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="w-32 h-3 bg-gray-100 rounded" />
                <div className="w-20 h-2.5 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <ReceiptText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-600">No expenses yet</p>
          <p className="text-sm text-gray-400">Upload a receipt above to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Merchant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {e.receiptUrl ? (
                        <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer">
                          <img src={e.receiptUrl} alt="receipt" className="w-9 h-9 object-cover rounded-lg border border-gray-100 hover:scale-105 transition-transform" />
                        </a>
                      ) : (
                        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                          <ReceiptText className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <span className="font-medium text-sm text-gray-900">{e.merchant || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{e.description || "—"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(e.date)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-sm text-gray-900">{fmt(e.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={deletingId === e.id}
                      className="text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
