"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

/** Starts (or resumes) the HVAC diagnostic for this job, then opens the wizard. */
export default function StartHvacDiagnostic() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/technician/hvac-diagnostic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appointmentId: id }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error ?? "Could not start the diagnostic."); return; }
      router.replace(`/technician/hvac-diagnostic/${d.id}`);
    })();
  }, [id, router]);
  return (
    <div className="py-16 text-center space-y-3">
      {err ? (
        <>
          <p className="text-sm text-red-600">{err}</p>
          <Link href={`/technician/jobs/${id}`} className="text-sm text-[#1B3FA8] font-semibold">← Back to the job</Link>
        </>
      ) : (
        <Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8] mx-auto" />
      )}
    </div>
  );
}
