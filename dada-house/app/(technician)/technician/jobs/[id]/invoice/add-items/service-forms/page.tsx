"use client";
import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Loader2 } from "lucide-react";

const FORM_TYPES = [
  { slug: "residential-diagnostic", name: "Residential Diagnostic Forms" },
  { slug: "ac-quick-diagnostic", name: "AC Diagnostic (Simple)" },
  { slug: "clean-and-check", name: "Clean and Check Forms" },
  { slug: "system-startup", name: "System Startup Forms" },
  { slug: "follow-up", name: "Follow Up Form" },
  { slug: "retail-lead", name: "Retail Lead Form" },
  { slug: "parts-replacement", name: "Parts Replacement / Repair Completion" },
  { slug: "drain-line-cleaning", name: "Drain Line Cleaning" },
  { slug: "air-vent-cleaning", name: "Air Vent & Register Cleaning" },
  { slug: "whole-system-duct-cleaning", name: "Whole-System Air Duct Cleaning" },
  { slug: "miscellaneous", name: "Miscellaneous" },
];

function ServiceFormsCategoriesInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const estimateId = searchParams.get("estimateId");
  const qs = estimateId ? `?estimateId=${estimateId}` : "";

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}/invoice/add-items${qs}`} className="text-sm text-gray-500">← Categories</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">Service Forms</h1>
        <p className="text-xs text-gray-400">All Categories &gt; Service Forms</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {FORM_TYPES.map((f) => (
          <Link
            key={f.slug}
            href={`/technician/jobs/${id}/invoice/add-items/service-forms/${f.slug}${qs}`}
            className="flex items-center justify-between p-4 bg-[#0D1D5E] text-white rounded-2xl text-left"
          >
            <span className="text-sm font-semibold">{f.name}</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ServiceFormsCategoriesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>}>
      <ServiceFormsCategoriesInner />
    </Suspense>
  );
}
