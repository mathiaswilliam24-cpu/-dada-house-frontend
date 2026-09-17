"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import EstimateEditor, { type EstimateData } from "@/components/technician/estimate-editor";

function NewAdminEstimatePage() {
  const params = useSearchParams();
  const prefillName = params.get("prefillName");

  const initialData: Partial<EstimateData> | undefined = prefillName
    ? {
        clientName: prefillName,
        clientPhone: params.get("prefillPhone") ?? "",
        clientEmail: params.get("prefillEmail") ?? "",
        clientAddress: params.get("prefillAddress") ?? "",
        clientCity: params.get("prefillCity") || "Houston",
      }
    : undefined;

  return <EstimateEditor mode="create" basePath="admin" initialData={initialData} />;
}

export default function NewAdminEstimatePageWrapper() {
  return (
    <Suspense>
      <NewAdminEstimatePage />
    </Suspense>
  );
}
