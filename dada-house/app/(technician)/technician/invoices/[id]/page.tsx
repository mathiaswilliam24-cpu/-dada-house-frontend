export const dynamic = "force-dynamic";

import InvoiceEditor from "@/components/technician/invoice-editor";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await db.estimate.findFirst({ where: { id, isInvoice: true } });
  if (!invoice) notFound();

  return (
    <InvoiceEditor
      mode="edit"
      initialData={{
        id: invoice.id,
        estimateNumber: invoice.estimateNumber,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientPhone: invoice.clientPhone ?? "",
        clientMobile: invoice.clientMobile ?? "",
        clientFax: invoice.clientFax ?? "",
        clientAddress: invoice.clientAddress ?? "",
        clientCity: invoice.clientCity ?? "",
        clientState: invoice.clientState,
        clientZip: invoice.clientZip ?? "",
        lineItems: invoice.lineItems as never,
        additionalDetails: invoice.additionalDetails ?? "",
        subtotal: invoice.subtotal,
        taxType: invoice.taxType,
        taxLabel: invoice.taxLabel ?? "Tax",
        taxRate: invoice.taxRate,
        taxInclusive: invoice.taxInclusive,
        discountType: invoice.discountType,
        discountValue: invoice.discountValue,
        total: invoice.total,
        status: invoice.status,
        templateColor: invoice.templateColor,
        showFinancing: invoice.showFinancing,
        requestSignature: invoice.requestSignature,
        sentAt: invoice.sentAt?.toISOString() ?? null,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        paymentMethod: invoice.paymentMethod ?? null,
        paymentToken: invoice.paymentToken ?? null,
      }}
    />
  );
}
