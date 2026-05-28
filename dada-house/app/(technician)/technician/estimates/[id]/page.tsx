"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import EstimateEditor from "@/components/technician/estimate-editor";

type Estimate = {
  id: string;
  estimateNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  clientMobile: string | null;
  clientFax: string | null;
  clientAddress: string | null;
  clientCity: string | null;
  clientState: string;
  clientZip: string | null;
  lineItems: Array<{ desc: string; details?: string; rate: number; qty: number; amount: number }>;
  additionalDetails: string | null;
  subtotal: number;
  taxType: string;
  taxLabel: string | null;
  taxRate: number;
  taxInclusive: boolean;
  discountType: string;
  discountValue: number;
  total: number;
  status: string;
  templateColor: string;
  showFinancing: boolean;
  requestSignature: boolean;
  sentAt: string | null;
};

export default function EstimateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/technician/estimates/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => setEstimate(d.estimate))
      .catch(() => setError("Estimate not found."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" />
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="text-center py-16">
        <p className="font-semibold text-gray-500">{error || "Estimate not found"}</p>
      </div>
    );
  }

  const initialData = {
    id: estimate.id,
    estimateNumber: estimate.estimateNumber,
    clientName: estimate.clientName,
    clientEmail: estimate.clientEmail,
    clientPhone: estimate.clientPhone ?? "",
    clientMobile: estimate.clientMobile ?? "",
    clientFax: estimate.clientFax ?? "",
    clientAddress: estimate.clientAddress ?? "",
    clientCity: estimate.clientCity ?? "",
    clientState: estimate.clientState,
    clientZip: estimate.clientZip ?? "",
    lineItems: estimate.lineItems.map((item, i) => ({
      id: `item-${i}`,
      desc: item.desc,
      details: item.details ?? "",
      rate: item.rate,
      qty: item.qty,
      amount: item.amount,
    })),
    additionalDetails: estimate.additionalDetails ?? "",
    subtotal: estimate.subtotal,
    taxType: estimate.taxType,
    taxLabel: estimate.taxLabel ?? "Tax",
    taxRate: estimate.taxRate,
    taxInclusive: estimate.taxInclusive,
    discountType: estimate.discountType,
    discountValue: estimate.discountValue,
    total: estimate.total,
    status: estimate.status,
    templateColor: estimate.templateColor,
    showFinancing: estimate.showFinancing,
    requestSignature: estimate.requestSignature,
    sentAt: estimate.sentAt,
  };

  return <EstimateEditor mode="edit" initialData={initialData} />;
}
