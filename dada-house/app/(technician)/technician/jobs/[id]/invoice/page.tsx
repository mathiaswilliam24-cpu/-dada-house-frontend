"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Loader2, CheckCircle2, AlertCircle, FileText, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type LineItem = { desc: string; rate: number; qty: number; amount: number };

type EstimateData = {
  id: string; estimateNumber: string; isInvoice: boolean; lineItems: LineItem[];
  additionalDetails: string | null; signatureUrl: string | null; requestSignature: boolean;
  paidAt: string | null; paymentMethod: string | null; total: number;
};

type AdminInvoice = { id: string; amount: number; status: string };

export default function TechInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [adminInvoice, setAdminInvoice] = useState<AdminInvoice | null>(null);
  const [poCount, setPoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [closingOut, setClosingOut] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.estimate?.isInvoice) setEstimate(d.estimate);
        if (d.job?.invoice) setAdminInvoice(d.job.invoice);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch(`/api/technician/jobs/${id}/purchase-orders`)
      .then((r) => r.json())
      .then((d) => setPoCount(d.orders?.length ?? 0))
      .catch(() => {});
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function closeout() {
    if (closingOut) return;
    if (!confirm("Mark this job as completed?")) return;
    setClosingOut(true);
    await fetch(`/api/technician/jobs/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    setClosingOut(false);
    alert("Job marked as completed!");
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;
  }

  const isPaid = !!estimate?.paidAt || adminInvoice?.status === "PAID";
  const hasSignature = !!estimate?.signatureUrl;
  const hasSummary = !!estimate?.additionalDetails?.trim();

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">Invoice</h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/technician/jobs/${id}/payment`}
          className="flex items-center justify-center py-2.5 border-2 border-[#1B3FA8] text-[#1B3FA8] rounded-xl text-sm font-bold"
        >
          Pay
        </Link>
        <button
          onClick={closeout}
          disabled={closingOut}
          className="flex items-center justify-center py-2.5 border-2 border-[#1B3FA8] text-[#1B3FA8] rounded-xl text-sm font-bold disabled:opacity-60"
        >
          {closingOut ? "Closing…" : "Closeout"}
        </button>
      </div>

      {!estimate && !adminInvoice ? (
        <Link
          href={`/technician/estimates/new?appointmentId=${id}`}
          className="flex items-center justify-between p-4 bg-[#F7921A]/10 border border-[#F7921A]/30 rounded-2xl"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-[#F7921A]" />
            <span className="font-semibold text-[#F7921A] text-sm">No invoice yet — create one</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#F7921A]" />
        </Link>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2.5">
                {isPaid ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-orange-400" />}
                <span className="text-sm font-semibold text-gray-800">Payments</span>
              </div>
              <span className={`text-sm ${isPaid ? "text-green-600" : "text-orange-500"}`}>{isPaid ? "completed" : "pending"}</span>
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2.5">
                {hasSignature ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-gray-300" />}
                <span className="text-sm font-semibold text-gray-800">Signature</span>
              </div>
              <span className="text-sm text-gray-500">
                {hasSignature ? "signed" : estimate?.requestSignature === false ? "optional" : "required"}
              </span>
            </div>

            {estimate && (
              <Link href={`/technician/estimates/${estimate.id}`} className="block p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2.5">
                    {hasSummary ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
                    <span className="text-sm font-semibold text-gray-800">Invoice Summary</span>
                  </div>
                  <span className={`text-sm ${hasSummary ? "text-green-600" : "text-red-500"}`}>{hasSummary ? "complete" : "required"}</span>
                </div>
                <p className="text-xs text-gray-400 truncate pl-6">
                  {estimate.additionalDetails || "For this job, I worked on…"}
                </p>
              </Link>
            )}
          </div>

          <Link href={`/technician/jobs/${id}/purchase-orders`} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200">
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-800">Purchase orders</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <span className="text-sm">{poCount}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {estimate && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">Items & Chargeable Materials ({estimate.lineItems?.length ?? 0})</h3>
                <Link href={`/technician/estimates/${estimate.id}`} className="text-xs font-semibold text-[#1B3FA8]">Edit →</Link>
              </div>
              <Link
                href={`/technician/jobs/${id}/invoice/add-items?estimateId=${estimate.id}`}
                className="flex items-center justify-center gap-1.5 py-2 mb-3 border border-dashed border-[#1B3FA8]/40 text-[#1B3FA8] rounded-xl text-sm font-semibold"
              >
                + Add items
              </Link>
              <div className="space-y-2">
                {(estimate.lineItems ?? []).filter((i) => i.desc).map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                    <span className="text-gray-800">{item.desc}</span>
                    <div className="flex items-center gap-4 text-gray-500">
                      <span>Qty {item.qty}</span>
                      <span className="font-semibold text-gray-900 w-16 text-right">{formatCurrency(item.amount)}</span>
                    </div>
                  </div>
                ))}
                {(!estimate.lineItems || estimate.lineItems.length === 0) && (
                  <p className="text-sm text-gray-400">No items added yet.</p>
                )}
              </div>
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-100 font-bold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(estimate.total)}</span>
              </div>
            </div>
          )}

          {adminInvoice && !estimate && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Dispatcher invoice</span>
                <span className={`font-semibold ${adminInvoice.status === "PAID" ? "text-green-600" : "text-orange-600"}`}>
                  {formatCurrency(adminInvoice.amount)} — {adminInvoice.status}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
