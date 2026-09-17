"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, RotateCcw, FlaskConical, AlertTriangle } from "lucide-react";
import { SERVICE_TYPES, sectionFieldsFor, type ServiceType } from "@/lib/service-diagnostic-fields";

type Diagnostic = {
  id: string;
  appointmentId: string;
  status: string;
  serviceType: string;
  customerReportedIssue: string | null;
  equipmentInspected: string | null;
  systemOperatingOnArrival: string | null;
  visibleDamage: boolean | null;
  waterLeakPresent: string | null;
  unusualNoise: string | null;
  burningSmell: boolean | null;
  immediateSafetyConcern: boolean;
  safetyConcernDescription: string | null;
  sectionData: Record<string, string | number>;
  problemFound: string | null;
  rootCause: string | null;
  evidenceSupportingDiagnosis: string | null;
  affectedComponents: string | null;
  recommendedRepair: string | null;
  additionalRecommendations: string | null;
  partsRequired: { part: string; manufacturer?: string; partNumber?: string; qty: number }[];
  repairUrgency: string | null;
  canCustomerContinueUsing: string | null;
  cannotContinueExplanation: string | null;
  finalDiagnosis: string | null;
  recommendedCorrectiveWork: string | null;
  estimatedRepairType: string | null;
  systemStatusWhenLeaving: string | null;
  supervisorComment: string | null;
  completedAt: string | null;
  appointment: { appointmentNumber: string; name: string; address: string; city: string; phone: string; service: string };
};

type Photo = { id: string; url: string; category: string; caption: string | null };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-3 text-sm py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 w-56 shrink-0">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-bold text-gray-900 mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function DiagnosticReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [technicianName, setTechnicianName] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [comment, setComment] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/diagnostics/${id}`);
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    const d = await res.json();
    setDiagnostic(d.diagnostic);
    setTechnicianName(d.technicianName);
    setPhotos(d.photos ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function act(action: "approve" | "return" | "additional-testing") {
    if ((action === "return" || action === "additional-testing") && !comment.trim()) {
      setError("Add a comment explaining what's needed.");
      return;
    }
    setActing(action);
    setError("");
    const res = await fetch(`/api/admin/diagnostics/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    });
    const d = await res.json();
    setActing(null);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setDiagnostic(d.diagnostic);
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;
  if (forbidden) return <p className="text-center text-gray-500 py-24">Supervisor access required.</p>;
  if (!diagnostic) return <p className="text-center text-gray-400 py-24">Not found.</p>;

  const serviceType = (diagnostic.serviceType as ServiceType) || "OTHER";
  const serviceTypeLabel = SERVICE_TYPES.find((s) => s.value === serviceType)?.label ?? serviceType;
  const canReview = diagnostic.status === "AWAITING_SUPERVISOR_REVIEW";

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/diagnostics" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Diagnostic Reviews
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{diagnostic.appointment.appointmentNumber} — {diagnostic.appointment.name}</h1>
            <p className="text-sm text-gray-500">{diagnostic.appointment.address}, {diagnostic.appointment.city} · {diagnostic.appointment.phone}</p>
            <p className="text-xs text-gray-400 mt-1">Technician: {technicianName ?? "—"} · Service: {serviceTypeLabel}</p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full font-semibold bg-orange-50 text-orange-600 border border-orange-200">{diagnostic.status.replace(/_/g, " ")}</span>
        </div>
      </div>

      {diagnostic.immediateSafetyConcern && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700">Immediate Safety Concern Reported</p>
            <p className="text-sm text-red-600">{diagnostic.safetyConcernDescription}</p>
          </div>
        </div>
      )}

      <Card title="Customer Complaint">
        <p className="text-sm text-gray-800">{diagnostic.customerReportedIssue || "—"}</p>
      </Card>

      <Card title="Initial Inspection">
        <Row label="Equipment / Area Inspected" value={diagnostic.equipmentInspected} />
        <Row label="System Operating on Arrival" value={diagnostic.systemOperatingOnArrival?.replace(/_/g, " ")} />
        <Row label="Visible Damage" value={diagnostic.visibleDamage === null ? null : diagnostic.visibleDamage ? "Yes" : "No"} />
        <Row label="Water Leak / Moisture" value={diagnostic.waterLeakPresent} />
        <Row label="Unusual Noise" value={diagnostic.unusualNoise} />
        <Row label="Burning Smell" value={diagnostic.burningSmell === null ? null : diagnostic.burningSmell ? "Yes" : "No"} />
      </Card>

      <Card title={`${serviceTypeLabel} Measurements & Tests`}>
        {sectionFieldsFor(serviceType).filter((f) => diagnostic.sectionData[f.id] !== undefined && diagnostic.sectionData[f.id] !== "").length === 0 ? (
          <p className="text-sm text-gray-400">No readings recorded.</p>
        ) : (
          sectionFieldsFor(serviceType).map((f) => (
            <Row key={f.id} label={f.label} value={diagnostic.sectionData[f.id] !== undefined ? `${diagnostic.sectionData[f.id]}${f.unit ? ` ${f.unit}` : ""}` : null} />
          ))
        )}
      </Card>

      {photos.length > 0 && (
        <Card title="Photos">
          <div className="flex flex-wrap gap-2">
            {photos.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block">
                <img src={p.url} alt="" className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
                {p.caption && <p className="text-[10px] text-gray-400 mt-0.5 w-24 truncate">{p.caption}</p>}
              </a>
            ))}
          </div>
        </Card>
      )}

      <Card title="Diagnostic Findings">
        <Row label="Problem Found" value={diagnostic.problemFound} />
        <Row label="Root Cause" value={diagnostic.rootCause} />
        <Row label="Evidence Supporting Diagnosis" value={diagnostic.evidenceSupportingDiagnosis} />
        <Row label="Affected Component(s)" value={diagnostic.affectedComponents} />
        <Row label="Recommended Repair" value={diagnostic.recommendedRepair} />
        <Row label="Additional Recommendations" value={diagnostic.additionalRecommendations} />
      </Card>

      {diagnostic.partsRequired.length > 0 && (
        <Card title="Parts & Materials">
          <div className="space-y-1">
            {diagnostic.partsRequired.map((p, i) => (
              <p key={i} className="text-sm text-gray-700">{p.qty}× {p.part}{p.manufacturer ? ` — ${p.manufacturer}` : ""}{p.partNumber ? ` (${p.partNumber})` : ""}</p>
            ))}
          </div>
        </Card>
      )}

      <Card title="Urgency & Final Diagnosis">
        <Row label="Repair Urgency" value={diagnostic.repairUrgency?.replace(/_/g, " ")} />
        <Row label="Can Customer Continue Using?" value={diagnostic.canCustomerContinueUsing?.replace(/_/g, " ")} />
        <Row label="Explanation" value={diagnostic.cannotContinueExplanation} />
        <Row label="Final Diagnosis" value={diagnostic.finalDiagnosis} />
        <Row label="Recommended Corrective Work" value={diagnostic.recommendedCorrectiveWork} />
        <Row label="Estimated Repair Type" value={diagnostic.estimatedRepairType} />
        <Row label="System Status When Leaving" value={diagnostic.systemStatusWhenLeaving} />
      </Card>

      {diagnostic.status === "APPROVED" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-sm text-green-700 font-semibold">
          <CheckCircle className="w-4 h-4" /> Approved — customer report sent.
        </div>
      )}
      {(diagnostic.status === "RETURNED" || diagnostic.status === "ADDITIONAL_TESTING_REQUESTED") && diagnostic.supervisorComment && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <p className="font-semibold mb-1">Sent back to technician:</p>
          <p>{diagnostic.supervisorComment}</p>
        </div>
      )}

      {canReview && (
        <Card title="Supervisor Review">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Comment (required for Return / Additional Testing) — e.g. &quot;Please provide capacitor actual µF reading before recommending replacement.&quot;"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none mb-3"
          />
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => act("approve")} disabled={!!acting}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
              {acting === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Approve Diagnostic
            </button>
            <button onClick={() => act("return")} disabled={!!acting}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-60">
              {acting === "return" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Return to Technician
            </button>
            <button onClick={() => act("additional-testing")} disabled={!!acting}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-orange-300 text-orange-600 rounded-xl text-sm font-semibold hover:bg-orange-50 disabled:opacity-60">
              {acting === "additional-testing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />} Additional Testing Required
            </button>
          </div>
        </Card>
      )}

      <button onClick={() => router.push(`/technician/jobs/${diagnostic.appointmentId}`)} className="text-xs text-gray-400 hover:text-gray-600">
        View full job →
      </button>
    </div>
  );
}
