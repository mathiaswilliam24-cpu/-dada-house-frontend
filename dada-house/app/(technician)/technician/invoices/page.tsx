"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText, Loader2, CheckCircle2, Clock, Send, FileEdit } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Invoice = {
  id: string;
  estimateNumber: string;
  clientName: string;
  clientEmail: string;
  total: number;
  status: string;
  paidAt: string | null;
  sentAt: string | null;
  paymentMethod: string | null;
  createdAt: string;
};

export default function TechnicianInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, paid: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/technician/invoices${filter !== "ALL" ? `?status=${filter}` : ""}`);
    const d = await res.json();
    setInvoices(d.invoices ?? []);
    setStats({ total: d.total ?? 0, open: d.open ?? 0, paid: d.paid ?? 0 });
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  const methodLabel = (m: string | null) =>
    m === "ZELLE" ? "Zelle" : m === "CARD" ? "Card" : m === "CASH" ? "Cash" : "";

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/technician/invoices/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1B3FA8] text-white rounded-xl text-sm font-bold"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </Link>
      </div>

      {/* Cross-link to Estimates */}
      <Link href="/technician/estimates"
        className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-[#1B3FA8]/30 hover:bg-blue-50/30 transition-colors">
        <div className="flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">My Estimates</span>
        </div>
        <span className="text-xs text-[#1B3FA8] font-semibold">View →</span>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-lg font-black text-gray-900">{stats.open}</p>
          <p className="text-xs text-gray-400">Unpaid</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-lg font-black text-green-600">{stats.paid}</p>
          <p className="text-xs text-gray-400">Paid</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <p className="text-lg font-black text-[#1B3FA8]">{formatCurrency(stats.total)}</p>
          <p className="text-xs text-gray-400">Total</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {["ALL", "OPEN", "CLOSED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            {f === "ALL" ? "All" : f === "OPEN" ? "Unpaid" : "Closed"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
      ) : invoices.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No invoices yet</p>
          <p className="text-gray-300 text-xs mt-1">Create your first invoice with the button above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Link key={inv.id} href={`/technician/invoices/${inv.id}`} className="block">
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {inv.paidAt ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : inv.sentAt ? (
                        <Send className="w-4 h-4 text-blue-500 shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                      <p className="font-semibold text-gray-900 truncate">{inv.clientName || "No client"}</p>
                    </div>
                    <p className="text-xs text-gray-500">Invoice #{inv.estimateNumber}</p>
                    {inv.paidAt ? (
                      <p className="text-xs text-green-600 mt-0.5 font-medium">
                        Paid via {methodLabel(inv.paymentMethod)} · {new Date(inv.paidAt).toLocaleDateString()}
                      </p>
                    ) : inv.sentAt ? (
                      <p className="text-xs text-blue-600 mt-0.5">Sent · awaiting payment</p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">Draft · not sent yet</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-black ${inv.paidAt ? "text-green-600" : "text-gray-900"}`}>
                      {formatCurrency(inv.total)}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
