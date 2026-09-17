"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ServiceDiagnosticForm } from "@/components/technician/service-diagnostic-form";

export default function DiagnosisPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-4 pb-4">
      <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job Detail</Link>
      <ServiceDiagnosticForm jobId={id} />
    </div>
  );
}
