"use client";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { DynamicForm } from "@/components/technician/dynamic-form";

function FirstVisitInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const estimateId = searchParams.get("estimateId");
  const qs = estimateId ? `?estimateId=${estimateId}` : "";

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}/invoice/add-items/service-forms/clean-and-check${qs}`} className="text-sm text-gray-500">← Clean and Check Forms</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">First Visit</h1>
        <p className="text-xs text-gray-400">All Categories &gt; Service Forms &gt; Clean and Check Forms &gt; First Visit</p>
      </div>

      <DynamicForm jobId={id} slug="clean-and-check-first-visit" estimateId={estimateId} />
    </div>
  );
}

export default function FirstVisitPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>}>
      <FirstVisitInner />
    </Suspense>
  );
}
