"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import SignatureStep from "@/components/technician/signature-step";

type Step = { kind: string; title: string; statementTemplate: string; signed: { signerName: string; createdAt: string } | null };

/** Job closeout: the customer signs Work Completion and Payment Acknowledgment, then the job is completed. */
export default function CloseoutPage() {
  const { id } = useParams<{ id: string }>();
  const [steps, setSteps] = useState<Step[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const load = useCallback(async () => {
    const d = await fetch(`/api/technician/jobs/${id}/closeout`).then((r) => r.json());
    setSteps(d.steps ?? []);
    setCustomerName((n) => n || d.customerName || "");
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;

  const next = steps.find((s) => !s.signed);
  const doneCount = steps.filter((s) => s.signed).length;

  async function complete() {
    setCompleting(true);
    const res = await fetch(`/api/technician/jobs/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "COMPLETED" }),
    });
    setCompleting(false);
    if (res.ok) setCompleted(true);
    else alert("Could not complete the job. Please try again.");
  }

  return (
    <div className="space-y-4 pb-6">
      <div>
        <Link href={`/technician/jobs/${id}/invoice`} className="text-sm text-gray-500">← Invoice</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">Closeout</h1>
        <p className="text-sm text-gray-500">Customer signatures: {doneCount} of {steps.length}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        {steps.map((s, i) => (
          <div key={s.kind} className="flex items-center justify-between p-4">
            <span className="text-sm font-semibold text-gray-800">{i + 1}. {s.title}</span>
            {s.signed ? (
              <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle2 className="w-4 h-4" /> signed</span>
            ) : (
              <span className="text-sm text-orange-500">required</span>
            )}
          </div>
        ))}
      </div>

      {next ? (
        <SignatureStep
          key={next.kind}
          title={next.title}
          defaultName={customerName}
          statement={next.statementTemplate}
          submitLabel={steps.length - doneCount > 1 ? "Sign & Next" : "Sign"}
          onSubmit={async (signerName, signature) => {
            const res = await fetch(`/api/technician/jobs/${id}/closeout`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kind: next.kind, signerName, signature }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error ?? "Could not save the signature");
            setCustomerName(signerName);
            await load();
          }}
        />
      ) : completed ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center space-y-3">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Job completed</h2>
          <Link href="/technician" className="block w-full py-3 bg-[#1B3FA8] text-white rounded-2xl font-bold">Back to Jobs</Link>
        </div>
      ) : (
        <button
          onClick={complete}
          disabled={completing}
          className="w-full py-3.5 flex items-center justify-center gap-2 bg-green-600 text-white rounded-2xl font-bold disabled:opacity-60"
        >
          {completing && <Loader2 className="w-4 h-4 animate-spin" />} Complete Job
        </button>
      )}
    </div>
  );
}
