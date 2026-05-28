"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, AlertCircle, FileText } from "lucide-react";

type DiagnosisData = {
  id?: string;
  problemFound: string;
  causeOfIssue: string;
  recommendedSolution: string;
  laborNeeded: string;
  estimatedTime: string;
  safetyNotes: string;
  requiredParts: string[];
  customerApproved: boolean;
};

const EMPTY: DiagnosisData = {
  problemFound: "", causeOfIssue: "", recommendedSolution: "",
  laborNeeded: "", estimatedTime: "", safetyNotes: "",
  requiredParts: [], customerApproved: false,
};

export default function DiagnosisPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DiagnosisData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPart, setNewPart] = useState("");

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}/diagnosis`)
      .then((r) => r.json())
      .then((d) => {
        if (d.diagnosis) setData({ ...EMPTY, ...d.diagnosis, requiredParts: d.diagnosis.requiredParts ?? [] });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!data.problemFound.trim()) return alert("Problem found is required");
    setSaving(true);
    const res = await fetch(`/api/technician/jobs/${id}/diagnosis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  }

  function addPart() {
    if (!newPart.trim()) return;
    setData((d) => ({ ...d, requiredParts: [...d.requiredParts, newPart.trim()] }));
    setNewPart("");
  }

  function removePart(i: number) {
    setData((d) => ({ ...d, requiredParts: d.requiredParts.filter((_, idx) => idx !== i) }));
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job Detail</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#1B3FA8]" /> Diagnosis Form
        </h1>
      </div>

      <div className="space-y-3">
        <Field label="Problem Found *" required>
          <textarea
            value={data.problemFound}
            onChange={(e) => setData((d) => ({ ...d, problemFound: e.target.value }))}
            rows={3} placeholder="Describe the problem found…"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
          />
        </Field>

        <Field label="Cause of Issue">
          <textarea
            value={data.causeOfIssue}
            onChange={(e) => setData((d) => ({ ...d, causeOfIssue: e.target.value }))}
            rows={2} placeholder="Root cause…"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
          />
        </Field>

        <Field label="Recommended Solution">
          <textarea
            value={data.recommendedSolution}
            onChange={(e) => setData((d) => ({ ...d, recommendedSolution: e.target.value }))}
            rows={3} placeholder="Recommended repair or solution…"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Labor Needed">
            <input
              value={data.laborNeeded}
              onChange={(e) => setData((d) => ({ ...d, laborNeeded: e.target.value }))}
              placeholder="e.g. 2 hours"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
            />
          </Field>
          <Field label="Estimated Time">
            <input
              value={data.estimatedTime}
              onChange={(e) => setData((d) => ({ ...d, estimatedTime: e.target.value }))}
              placeholder="e.g. 3–4 hours"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
            />
          </Field>
        </div>

        <Field label="Safety Notes">
          <textarea
            value={data.safetyNotes}
            onChange={(e) => setData((d) => ({ ...d, safetyNotes: e.target.value }))}
            rows={2} placeholder="Safety hazards, warnings…"
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
          />
        </Field>

        {/* Required parts */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <h3 className="font-semibold text-sm text-gray-900">Required Parts</h3>
          {data.requiredParts.map((p, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
              <span className="text-sm text-gray-700">{p}</span>
              <button onClick={() => removePart(i)} className="text-red-400 hover:text-red-600 text-xs font-medium">Remove</button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={newPart}
              onChange={(e) => setNewPart(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPart(); } }}
              placeholder="Add part name…"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]"
            />
            <button
              onClick={addPart}
              className="px-4 py-2 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold"
            >Add</button>
          </div>
        </div>

        {/* Customer approval status */}
        {data.id && (
          <div className={`flex items-center gap-3 p-3 rounded-xl ${data.customerApproved ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
            {data.customerApproved
              ? <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
              : <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />}
            <span className={`text-sm font-medium ${data.customerApproved ? "text-green-700" : "text-yellow-700"}`}>
              {data.customerApproved ? "Customer approved this diagnosis" : "Awaiting customer approval"}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving || !data.problemFound.trim()}
        className="w-full py-3.5 bg-[#1B3FA8] text-white rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : "Save Diagnosis"}
      </button>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
      <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
