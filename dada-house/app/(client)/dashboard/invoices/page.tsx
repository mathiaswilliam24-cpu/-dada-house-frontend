"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Receipt, Loader2, CheckCircle2, Clock, ExternalLink, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type ClientInvoice = {
  id: string;
  type: "tech" | "appointment";
  number: string;
  amount: number;
  status: string;
  paidAt: string | null;
  paymentToken: string | null;
  paymentMethod: string | null;
  templateColor: string;
  createdAt: string;
  sentByName: string;
  description: string;
};

const methodLabel = (m: string | null) =>
  m === "ZELLE" ? "Zelle" : m === "CARD" ? "Card" : m === "CASH" ? "Cash" : "";

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/invoices")
      .then((r) => r.json())
      .then((d) => {
        setInvoices(d.invoices ?? []);
        setTotalOwed(d.totalOwed ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const unpaid = invoices.filter((i) => i.status !== "PAID");
  const paid = invoices.filter((i) => i.status === "PAID");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Invoices</h1>
        <p className="text-gray-500 text-sm mt-0.5">Review and pay your DADA HOUSE invoices</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No invoices yet</p>
          <p className="text-gray-300 text-sm mt-1">Invoices will appear here once your technician sends them</p>
        </div>
      ) : (
        <>
          {/* Outstanding balance banner */}
          {totalOwed > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
              <AlertCircle className="w-8 h-8 text-amber-500 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-amber-900">Outstanding Balance</p>
                <p className="text-sm text-amber-700">You have {unpaid.length} unpaid invoice{unpaid.length !== 1 ? "s" : ""} totaling {formatCurrency(totalOwed)}</p>
              </div>
            </div>
          )}

          {/* Unpaid invoices */}
          {unpaid.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Unpaid</h2>
              {unpaid.map((inv) => (
                <div key={inv.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                  <div style={{ backgroundColor: inv.templateColor }} className="px-4 py-2 flex items-center justify-between">
                    <p className="text-white text-xs font-bold">Invoice #{inv.number}</p>
                    <p className="text-white/80 text-xs">{new Date(inv.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{inv.description}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Prepared by {inv.sentByName}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs text-amber-600 font-medium">Payment pending</span>
                        </div>
                      </div>
                      <p className="text-2xl font-black text-gray-900">{formatCurrency(inv.amount)}</p>
                    </div>
                    {inv.paymentToken && (
                      <Link
                        href={`/pay/${inv.paymentToken}`}
                        className="mt-3 flex items-center justify-center gap-2 w-full py-3 bg-[#1B3FA8] text-white rounded-xl font-bold text-sm hover:bg-[#1A3490] transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Pay Now — {formatCurrency(inv.amount)}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paid invoices */}
          {paid.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Paid</h2>
              {paid.map((inv) => (
                <div key={inv.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">Invoice #{inv.number}</p>
                        <p className="text-xs text-gray-400">{inv.description}</p>
                        {inv.paidAt && (
                          <p className="text-xs text-green-600">
                            Paid {new Date(inv.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {inv.paymentMethod ? ` via ${methodLabel(inv.paymentMethod)}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-lg font-black text-green-600">{formatCurrency(inv.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
