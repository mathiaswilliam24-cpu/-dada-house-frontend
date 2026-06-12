"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import EstimateEditor, { type EstimateData } from "@/components/technician/estimate-editor";

function NewEstimatePage() {
  const params = useSearchParams();
  const quick = params.get("quick") === "1";
  const appointmentId = params.get("appointmentId");
  const [initialData, setInitialData] = useState<Partial<EstimateData> | undefined>(undefined);
  const [loading, setLoading] = useState(!!appointmentId);

  useEffect(() => {
    if (!appointmentId) return;
    fetch(`/api/technician/jobs/${appointmentId}`)
      .then((r) => r.json())
      .then((data) => {
        const job = data.job;
        if (job) {
          setInitialData({
            appointmentId,
            clientName: job.name ?? "",
            clientEmail: job.email ?? "",
            clientPhone: job.phone ?? "",
            clientAddress: job.address ?? "",
            clientCity: job.city ?? "",
            clientZip: job.zipCode ?? "",
            clientState: "TX",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [appointmentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return <EstimateEditor mode="create" quick={quick} initialData={initialData} />;
}

export default function NewEstimatePageWrapper() {
  return (
    <Suspense>
      <NewEstimatePage />
    </Suspense>
  );
}
