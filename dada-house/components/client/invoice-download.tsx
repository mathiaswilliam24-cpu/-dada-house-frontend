"use client";

import { ExternalLink, FileText, CheckCircle, Clock, CreditCard } from "lucide-react";
import { formatDate } from "@/lib/utils";

const fmtCur = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

interface Invoice {
  id: string;
  amount: number;
  status: string;
  pdfUrl: string | null;
  notes: string | null;
  createdAt: string;
  total?: number;
  paidAt?: string | null;
  paymentMethod?: string | null;
}

export function InvoiceDownload({ invoice }: { invoice: Invoice }) {
  const invoiceNum = `INV${invoice.id.slice(-6).toUpperCase()}`;
  const displayTotal = invoice.total ?? invoice.amount;
  const isPaid = invoice.status === "PAID";

  return (
    <div className={`rounded-xl border p-5 ${isPaid ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
      <div className="flex items-center gap-2 mb-4">
        <FileText className={`w-5 h-5 ${isPaid ? "text-green-600" : "text-[#F7921A]"}`} />
        <h3 className="font-semibold text-gray-900">Receipt</h3>
        <span className={`ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          isPaid
            ? "bg-green-100 text-green-700"
            : invoice.status === "SENT"
            ? "bg-blue-100 text-blue-700"
            : "bg-gray-100 text-gray-600"
        }`}>
          {isPaid ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {invoice.status}
        </span>
      </div>

      <div className="space-y-2.5 text-sm mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Invoice #</span>
          <span className="font-mono font-medium text-gray-700">{invoiceNum}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-500">{isPaid ? "Amount Paid" : "Amount Due"}</span>
          <span className={`font-bold text-xl ${isPaid ? "text-green-700" : "text-gray-900"}`}>
            {isPaid ? fmtCur(0) : fmtCur(displayTotal)}
          </span>
        </div>

        {isPaid && invoice.paidAt && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Paid on</span>
            <span className="text-gray-700">{formatDate(invoice.paidAt)}</span>
          </div>
        )}

        {isPaid && invoice.paymentMethod && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Method</span>
            <span className="flex items-center gap-1 text-gray-700">
              <CreditCard className="w-3.5 h-3.5 text-gray-400" />
              {invoice.paymentMethod}
            </span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-gray-500">Issued</span>
          <span className="text-gray-700">{formatDate(invoice.createdAt)}</span>
        </div>

        {invoice.notes && (
          <div className="pt-2.5 border-t border-gray-100">
            <p className="text-gray-600 text-xs leading-relaxed">{invoice.notes}</p>
          </div>
        )}
      </div>

      {isPaid && (
        <div className="flex items-center gap-2 w-full px-4 py-2.5 bg-green-100 text-green-800 rounded-xl text-sm font-semibold justify-center mb-3">
          <CheckCircle className="w-4 h-4" />
          Payment Received — Thank you!
        </div>
      )}

      {!isPaid && (
        <div className="mb-3 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          Pay via Zelle: <span className="font-semibold text-gray-700">payment@mydadahouse.com</span>
        </div>
      )}

      <a
        href={`/print/invoice/${invoice.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold hover:bg-[#1A3490] transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        View / Download Receipt
      </a>
    </div>
  );
}
