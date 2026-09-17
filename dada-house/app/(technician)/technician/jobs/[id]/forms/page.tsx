"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Loader2, FileText, CheckSquare, CheckCircle2, ClipboardList } from "lucide-react";

type ChecklistItem = { key: string; label: string; checked: boolean; note: string };

const DIAGNOSTIC_STATUS_LABEL: Record<string, string> = {
  DRAFT: "In progress",
  AWAITING_SUPERVISOR_REVIEW: "Awaiting review",
  RETURNED: "Returned — needs update",
  ADDITIONAL_TESTING_REQUESTED: "Additional testing needed",
  APPROVED: "Approved",
};

type FormsJob = {
  serviceDiagnostic?: { id: string; status: string; completedAt: string | null } | null;
  checklist?: { id: string; items: ChecklistItem[]; completedAt: string | null } | null;
};

type EstimateSummary = { id: string };

export default function TechFormsPage() {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<FormsJob | null>(null);
  const [estimate, setEstimate] = useState<EstimateSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.job) setJob(d.job); setEstimate(d.estimate ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;
  }
  if (!job) {
    return <div className="text-center py-16 text-gray-400">Job not found</div>;
  }

  const checklistDone = job.checklist?.items?.filter((i) => i.checked).length ?? 0;
  const checklistTotal = job.checklist?.items?.length ?? 0;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">Forms</h1>
        <p className="text-xs text-gray-400">Forms filled out for this job</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        <Link href={`/technician/jobs/${id}/diagnosis`} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Service Diagnostic Form</p>
              <p className="text-xs text-gray-400">
                {job.serviceDiagnostic ? (DIAGNOSTIC_STATUS_LABEL[job.serviceDiagnostic.status] ?? job.serviceDiagnostic.status) : "Not started"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            {job.serviceDiagnostic?.status === "APPROVED" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        <Link href={`/technician/jobs/${id}/checklist`} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Service Checklist</p>
              <p className="text-xs text-gray-400">
                {!job.checklist ? "Not started" : job.checklist.completedAt ? "Completed" : `${checklistDone} of ${checklistTotal} items`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            {job.checklist?.completedAt && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        <Link
          href={`/technician/jobs/${id}/invoice/add-items/service-forms${estimate ? `?estimateId=${estimate.id}` : ""}`}
          className="flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-4 h-4 text-[#1B3FA8]" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Service Forms</p>
              <p className="text-xs text-gray-400">Residential Diagnostic, Clean and Check, System Startup, Follow Up, Retail Lead, Miscellaneous</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        </Link>
      </div>
    </div>
  );
}
