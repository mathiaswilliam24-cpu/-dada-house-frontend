"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Plan = { id: string; name: string; monthlyPrice: number; annualPrice: number };
type SystemType = { id: string; name: string };

export default function PerformancePlanContractPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [systemTypes, setSystemTypes] = useState<SystemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [planTypeId, setPlanTypeId] = useState("");
  const [numberOfSystems, setNumberOfSystems] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/technician/maintenance-plans").then((r) => r.json()),
      fetch("/api/technician/system-types").then((r) => r.json()),
    ]).then(([mp, st]) => {
      setPlans(mp.plans ?? []);
      setSystemTypes(st.types ?? []);
      if (mp.plans?.length) setPlanTypeId(mp.plans[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function toggleType(name: string) {
    setSelectedTypes((prev) => {
      if (prev.includes(name)) return prev.filter((t) => t !== name);
      if (prev.length >= 2) return prev; // max 2
      return [...prev, name];
    });
  }

  const selectedPlan = plans.find((p) => p.id === planTypeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/technician/jobs/${id}/performance-plan-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTypeId, numberOfSystems, systemTypes: selectedTypes }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to create contract");
      router.push(`/contract/${d.contract.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1">Performance Plan Contract</h1>
        <p className="text-xs text-gray-400">Set this up, then hand the device to the customer to sign.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Plan Type</label>
          <select
            value={planTypeId}
            onChange={(e) => setPlanTypeId(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.monthlyPrice)}/mo or {formatCurrency(p.annualPrice)}/yr</option>
            ))}
          </select>
          {plans.length === 0 && <p className="text-xs text-red-500 mt-1">No active plans configured.</p>}
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Number of Systems</label>
          <input
            type="number"
            min={1}
            value={numberOfSystems}
            onChange={(e) => setNumberOfSystems(Math.max(1, Number(e.target.value)))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">System Type (choose up to 2)</label>
          <div className="flex flex-wrap gap-2">
            {systemTypes.map((t) => {
              const selected = selectedTypes.includes(t.name);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleType(t.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${selected ? "bg-[#1B3FA8] text-white border-[#1B3FA8]" : "bg-white text-gray-600 border-gray-200"}`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
          {systemTypes.length === 0 && <p className="text-xs text-gray-400 mt-1">No system types configured yet — ask admin to add some.</p>}
        </div>

        {selectedPlan && numberOfSystems > 0 && (
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-900">
            Total: <strong>{formatCurrency(selectedPlan.monthlyPrice * numberOfSystems)}/mo</strong> or <strong>{formatCurrency(selectedPlan.annualPrice * numberOfSystems)}/yr</strong>
            {" "}({numberOfSystems} system{numberOfSystems === 1 ? "" : "s"})
          </div>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !planTypeId || selectedTypes.length === 0}
          className="w-full py-3 bg-[#F7921A] hover:bg-[#E07F10] disabled:opacity-60 text-white rounded-xl font-bold"
        >
          {submitting ? "Opening contract…" : "Continue to Contract"}
        </button>
      </form>
    </div>
  );
}
