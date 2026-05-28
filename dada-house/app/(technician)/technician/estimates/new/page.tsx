"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import EstimateEditor from "@/components/technician/estimate-editor";

function NewEstimatePage() {
  const params = useSearchParams();
  const quick = params.get("quick") === "1";
  return <EstimateEditor mode="create" quick={quick} />;
}

export default function NewEstimatePageWrapper() {
  return (
    <Suspense>
      <NewEstimatePage />
    </Suspense>
  );
}
