"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle, RotateCcw, FlaskConical, AlertTriangle } from "lucide-react";
import {
  equipmentFieldsFor, EQUIPMENT_TYPE_LABEL, FINAL_TEST_ITEMS, FINAL_STARTUP_RESULTS,
  type EquipmentEntry, type FinalTestKey, type ChecklistItem,
} from "@/lib/system-startup-fields";

type Startup = {
  id: string;
  appointmentId: string;
  status: string;
  systemType: string | null;
  installationType: string | null;
  equipment: EquipmentEntry[];
  installationChecklist: ChecklistItem[];
  finalTestResults: Partial<Record<FinalTestKey, string>>;
  finalStartupResult: string | null;
  failExplanation: string | null;
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

export default function SystemStartupReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [startup, setStartup] = useState<Startup | null>(null);
  const [technicianName, setTechnicianName] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [comment, setComment] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/system-startups/${id}`);
    if (res.status === 403) { setForbidden(true); setLoading(false); return; }
    const d = await res.json();
    setStartup(d.startup);
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
    const res = await fetch(`/api/admin/system-startups/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    });
    const d = await res.json();
    setActing(null);
    if (!res.ok) { setError(d.error ?? "Failed"); return; }
    setStartup(d.startup);
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;
  if (forbidden) return <p className="text-center text-gray-500 py-24">Supervisor access required.</p>;
  if (!startup) return <p className="text-center text-gray-400 py-24">Not found.</p>;

  const canReview = startup.status === "AWAITING_SUPERVISOR_REVIEW";
  const resultDef = FINAL_STARTUP_RESULTS.find((r) => r.value === startup.finalStartupResult);

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/system-startups" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to System Startup Reviews
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{startup.appointment.appointmentNumber} — {startup.appointment.name}</h1>
            <p className="text-sm text-gray-500">{startup.appointment.address}, {startup.appointment.city} · {startup.appointment.phone}</p>
            <p className="text-xs text-gray-400 mt-1">Technician: {technicianName ?? "—"} · System: {startup.systemType} · {startup.installationType}</p>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full font-semibold bg-orange-50 text-orange-600 border border-orange-200">{startup.status.replace(/_/g, " ")}</span>
        </div>
      </div>

      {resultDef && (
        <div className="rounded-xl p-4 text-center font-bold" style={{ backgroundColor: `${resultDef.color}15`, color: resultDef.color, border: `1px solid ${resultDef.color}40` }}>
          {resultDef.label}
        </div>
      )}
      {startup.failExplanation && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <p className="font-bold mb-1">Explanation</p>
          <p>{startup.failExplanation}</p>
        </div>
      )}

      <Card title="Equipment Match">
        {startup.equipment.length === 0 ? <p className="text-sm text-gray-400">No equipment recorded.</p> : (
          startup.equipment.map((eq) => (
            <div key={eq.id} className="mb-3 last:mb-0">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{EQUIPMENT_TYPE_LABEL[eq.equipmentType]}</p>
              {equipmentFieldsFor(eq.equipmentType).map((f) => (
                <Row key={f.id} label={f.label} value={eq.values?.[f.id]} />
              ))}
            </div>
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

      <Card title="Final System Operational Test">
        {FINAL_TEST_ITEMS.map((item) => (
          <Row key={item.key} label={item.label} value={startup.finalTestResults?.[item.key]} />
        ))}
      </Card>

      {startup.status !== "AWAITING_SUPERVISOR_REVIEW" && startup.supervisorComment && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          <p className="font-semibold mb-1">Supervisor note:</p>
          <p>{startup.supervisorComment}</p>
        </div>
      )}

      {canReview && (
        <Card title="Supervisor Review">
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
            <AlertTriangle className="w-3.5 h-3.5" /> Review order: Equipment Match → Vacuum → Refrigerant → Electrical → Airflow → Drainage → Heating/Cooling Tests → Photos → Final Result
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Comment (required for Return / Additional Test Required)"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none mb-3"
          />
          {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => act("approve")} disabled={!!acting}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
              {acting === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Approve Startup
            </button>
            <button onClick={() => act("return")} disabled={!!acting}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-60">
              {acting === "return" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Return to Technician
            </button>
            <button onClick={() => act("additional-testing")} disabled={!!acting}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-orange-300 text-orange-600 rounded-xl text-sm font-semibold hover:bg-orange-50 disabled:opacity-60">
              {acting === "additional-testing" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />} Additional Test Required
            </button>
          </div>
        </Card>
      )}

      {startup.status === "APPROVED" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2 text-sm text-green-700 font-semibold">
          <CheckCircle className="w-4 h-4" /> Approved — waiting on the technician to complete the customer handover.
        </div>
      )}

      <button onClick={() => router.push(`/technician/jobs/${startup.appointmentId}`)} className="text-xs text-gray-400 hover:text-gray-600">
        View full job →
      </button>
    </div>
  );
}
