import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import InvoicePayButton from "@/components/portal/invoice-pay-button";
import SignaturePad from "@/components/portal/signature-pad";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { appointment: true },
  });

  if (!invoice || (invoice.appointment.userId !== session.user.id && session.user.role !== "ADMIN")) {
    notFound();
  }

  type LineItem = { description: string; quantity: number; unitPrice: number; total: number };
  const lineItems = (invoice.lineItems as LineItem[] | null) ?? [];
  const isPaid = invoice.status === "PAID";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/portal/invoices" className="text-sm text-gray-500 hover:text-gray-700 mb-1 block">← Invoices</Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Invoice</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${isPaid ? "bg-green-50 text-green-700 border border-green-200" : "bg-orange-50 text-orange-700 border border-orange-200"}`}>
            {invoice.status}
          </span>
        </div>
      </div>

      {/* Invoice details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Service</p>
            <p className="font-semibold text-gray-900">{invoice.appointment.service}</p>
            <p className="text-sm text-gray-500">{invoice.appointment.appointmentNumber}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Invoice Date</p>
            <p className="text-sm text-gray-700">{formatDate(invoice.createdAt)}</p>
            {invoice.dueDate && !isPaid && (
              <>
                <p className="text-xs text-gray-500 mt-1">Due Date</p>
                <p className="text-sm text-red-600 font-medium">{formatDate(invoice.dueDate)}</p>
              </>
            )}
          </div>
        </div>

        {lineItems.length > 0 && (
          <div className="border-t border-gray-100 pt-4 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="text-left pb-2">Description</th>
                  <th className="text-center pb-2">Qty</th>
                  <th className="text-right pb-2">Unit Price</th>
                  <th className="text-right pb-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lineItems.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2 text-gray-700">{item.description}</td>
                    <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
          <p className="font-semibold text-gray-900">Total Amount</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.amount)}</p>
        </div>

        {invoice.notes && (
          <p className="text-sm text-gray-500 mt-3 border-t border-gray-100 pt-3">{invoice.notes}</p>
        )}
      </div>

      {/* Pay button */}
      {!isPaid && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Pay Now</h3>
          <p className="text-sm text-gray-500 mb-4">Secure payment via Stripe. Accepts credit/debit cards, Apple Pay, and Google Pay.</p>
          <InvoicePayButton invoiceId={invoice.id} amount={invoice.amount} appointmentId={invoice.appointmentId} />
        </div>
      )}

      {/* E-signature */}
      {!invoice.signatureUrl && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Customer Signature</h3>
          <p className="text-sm text-gray-500 mb-4">Sign below to acknowledge receipt of services.</p>
          <SignaturePad invoiceId={invoice.id} />
        </div>
      )}

      {invoice.signatureUrl && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-700 font-medium">✓ Signed by customer</p>
        </div>
      )}
    </div>
  );
}
