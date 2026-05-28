"use client";

import { Download, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Invoice {
  id: string;
  amount: number;
  status: string;
  pdfUrl: string | null;
  notes: string | null;
  createdAt: string;
}

export function InvoiceDownload({ invoice }: { invoice: Invoice }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-[#F7921A]" />
        <h3 className="font-semibold text-gray-900">Invoice</h3>
        <span
          className={`ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            invoice.status === "PAID"
              ? "bg-green-100 text-green-700"
              : invoice.status === "SENT"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {invoice.status}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Amount</span>
          <span className="font-bold text-gray-900 text-base">
            {formatCurrency(invoice.amount)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Issued</span>
          <span className="text-gray-700">{formatDate(invoice.createdAt)}</span>
        </div>
        {invoice.notes && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-gray-600 text-xs">{invoice.notes}</p>
          </div>
        )}
      </div>

      {invoice.pdfUrl && (
        <a
          href={invoice.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#1B3FA8] text-white rounded-lg text-sm font-medium hover:bg-[#1B3FA8]/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </a>
      )}
    </div>
  );
}
