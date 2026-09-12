"use client";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";
import { DynamicForm } from "@/components/technician/dynamic-form";

const FORM_NAMES: Record<string, string> = {
  "residential-diagnostic": "Residential Diagnostic Forms",
  "clean-and-check": "Clean and Check Forms",
  "system-startup": "System Startup Forms",
  "follow-up": "Follow Up Form",
  "retail-lead": "Retail Lead Form",
  miscellaneous: "Miscellaneous",
};

function ServiceFormInner() {
  const { id, formSlug } = useParams<{ id: string; formSlug: string }>();
  const searchParams = useSearchParams();
  const estimateId = searchParams.get("estimateId");
  const qs = estimateId ? `?estimateId=${estimateId}` : "";
  const name = FORM_NAMES[formSlug] ?? formSlug;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}/invoice/add-items/service-forms${qs}`} className="text-sm text-gray-500">← Service Forms</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">{name}</h1>
        <p className="text-xs text-gray-400">All Categories &gt; Service Forms &gt; {name}</p>
      </div>

      {formSlug === "clean-and-check" && (
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/technician/jobs/${id}/invoice/add-items/service-forms/clean-and-check/first-visit${qs}`}
            className="flex items-center justify-between p-4 bg-[#0D1D5E] text-white rounded-2xl text-left"
          >
            <span className="text-sm font-semibold">First Visit</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </Link>
        </div>
      )}

      <DynamicForm jobId={id} slug={formSlug} estimateId={estimateId} />
    </div>
  );
}

export default function ServiceFormPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>}>
      <ServiceFormInner />
    </Suspense>
  );
}
