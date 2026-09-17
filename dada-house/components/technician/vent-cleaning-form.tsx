"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Check, X, Camera, Plus, Trash2, ChevronDown, ChevronUp, Download } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing-components";
import {
  VENT_OVERALL_CONDITIONS, VENT_WORK_PERFORMED, VENT_ADDITIONAL_FINDINGS, VENT_COMPLETION_STATUSES,
  getMissingVentCleaningFields, emptyVentEntry, type VentEntry,
} from "@/lib/duct-cleaning-fields";

const SignaturePad = dynamic(() => import("@/components/portal/signature-pad"), { ssr: false });

type JobInfo = {
  appointmentNumber: string; name: string; address: string; city: string; phone: string;
  preferredDate: string | null; preferredTime: string | null; service: string;
  technician: { name: string | null } | null;
};

type VentCleaningData = {
  propertyType: string | null;
  totalVentsAuthorized: number | null;
  supplyVentsAuthorized: number | null;
  returnVentsAuthorized: number | null;
  overallCondition: string[];
  overallConditionOther: string | null;
  beforePhotos: string[];
  vents: VentEntry[];
  workPerformed: string[];
  additionalFindings: string[];
  additionalFindingsOther: string | null;
  recommendedAdditionalService: string | null;
  totalVentsCleaned: number | null;
  completionStatus: string | null;
  technicianNotes: string | null;
  technicianSignatureUrl: string | null;
  customerSignatureUrl: string | null;
  completedAt: string | null;
};

function emptyData(): VentCleaningData {
  return {
    propertyType: null, totalVentsAuthorized: null, supplyVentsAuthorized: null, returnVentsAuthorized: null,
    overallCondition: [], overallConditionOther: "", beforePhotos: [],
    vents: [], workPerformed: [], additionalFindings: [], additionalFindingsOther: "",
    recommendedAdditionalService: "", totalVentsCleaned: null, completionStatus: null, technicianNotes: "",
    technicianSignatureUrl: null, customerSignatureUrl: null, completedAt: null,
  };
}

// ── Small building blocks (self-contained, matching this codebase's other
//    technician form components rather than sharing tiny UI helpers) ───────

function Card({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">{children}</div>}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-xs text-gray-500 font-medium mb-1 block">{children}</label>;
}
function TextInput({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />;
}
function ChoiceRow({ value, options, labels, onChange }: { value: string | null; options: string[]; labels?: Record<string, string>; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${value === o ? "bg-[#1B3FA8] text-white border-[#1B3FA8]" : "bg-white text-gray-600 border-gray-200"}`}>
          {labels?.[o] ?? o.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}
function MultiCheckboxList({ value, options, onChange }: { value: string[]; options: string[]; onChange: (v: string[]) => void }) {
  function toggle(opt: string) {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${value.includes(o) ? "bg-[#1B3FA8] text-white border-[#1B3FA8]" : "bg-white text-gray-600 border-gray-200"}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

// Single photo slot — upload/replace one photo, with a "save to phone"
// download link once set (browsers can't silently write to the camera roll).
function PhotoSlot({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const { startUpload } = useUploadThing("jobPhotos", {
    onClientUploadComplete: (res) => {
      setUploading(false);
      const url = (res?.[0] as unknown as Record<string, string>)?.ufsUrl ?? (res?.[0] as unknown as Record<string, string>)?.url;
      if (url) onChange(url);
    },
    onUploadError: () => setUploading(false),
  });
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      {value ? (
        <div className="relative w-20 h-20">
          <img src={value} alt="" className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
          <a href={value} download target="_blank" rel="noreferrer" className="absolute bottom-0.5 left-0.5 bg-black/60 rounded-md p-0.5" title="Save to phone">
            <Download className="w-3 h-3 text-white" />
          </a>
          <button type="button" onClick={() => onChange("")} className="absolute -top-1.5 -right-1.5 bg-gray-700 rounded-full p-0.5">
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center w-20 h-20 rounded-lg border border-dashed border-gray-300 cursor-pointer text-gray-400">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          <input type="file" accept="image/*" className="hidden" disabled={uploading}
            onChange={(e) => { if (e.target.files?.length) { setUploading(true); startUpload(Array.from(e.target.files)); } e.target.value = ""; }} />
        </label>
      )}
    </div>
  );
}

// Multi-photo picker for the general "before starting" photo requirement.
function PhotoMulti({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const { startUpload } = useUploadThing("jobPhotos", {
    onClientUploadComplete: (res) => {
      setUploading(false);
      const urls = (res ?? []).map((f) => (f as unknown as Record<string, string>).ufsUrl ?? (f as unknown as Record<string, string>).url).filter(Boolean);
      if (urls.length) onChange([...value, ...urls]);
    },
    onUploadError: () => setUploading(false),
  });
  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {value.map((url) => (
            <div key={url} className="relative w-16 h-16">
              <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
              <a href={url} download target="_blank" rel="noreferrer" className="absolute bottom-0.5 left-0.5 bg-black/60 rounded-md p-0.5" title="Save to phone">
                <Download className="w-3 h-3 text-white" />
              </a>
              <button type="button" onClick={() => onChange(value.filter((u) => u !== url))} className="absolute -top-1.5 -right-1.5 bg-gray-700 rounded-full p-0.5">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-500 cursor-pointer">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        {uploading ? "Uploading…" : "Add Photo"}
        <input type="file" accept="image/*" multiple className="hidden" disabled={uploading}
          onChange={(e) => { if (e.target.files?.length) { setUploading(true); startUpload(Array.from(e.target.files)); } e.target.value = ""; }} />
      </label>
    </div>
  );
}

function VentRow({ vent, index, onChange, onRemove }: { vent: VentEntry; index: number; onChange: (v: VentEntry) => void; onRemove: () => void }) {
  function set<K extends keyof VentEntry>(key: K, value: VentEntry[K]) {
    onChange({ ...vent, [key]: value });
  }
  return (
    <div className="border border-gray-100 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-700">Vent #{index + 1}</p>
        <button type="button" onClick={onRemove} className="text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <div>
        <Label>Room/Location</Label>
        <TextInput value={vent.roomLocation} onChange={(v) => set("roomLocation", v)} placeholder="e.g. Living Room" />
      </div>
      <div>
        <Label>Vent Type</Label>
        <ChoiceRow value={vent.ventType || null} options={["SUPPLY", "RETURN"]} labels={{ SUPPLY: "Supply", RETURN: "Return" }} onChange={(v) => set("ventType", v as VentEntry["ventType"])} />
      </div>
      <div>
        <Label>Condition Before</Label>
        <ChoiceRow value={vent.conditionBefore || null} options={["CLEAN", "LIGHT", "MODERATE", "HEAVY"]} labels={{ CLEAN: "Clean", LIGHT: "Light", MODERATE: "Moderate", HEAVY: "Heavy" }} onChange={(v) => set("conditionBefore", v as VentEntry["conditionBefore"])} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: "coverRemoved" as const, label: "Cover Removed" },
          { key: "coverCleaned" as const, label: "Cover Cleaned" },
          { key: "openingCleaned" as const, label: "Opening Cleaned" },
          { key: "reinstalled" as const, label: "Reinstalled" },
        ].map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={vent[f.key]} onChange={(e) => set(f.key, e.target.checked)} />
            {f.label}
          </label>
        ))}
      </div>
      <div>
        <Label>Condition After</Label>
        <ChoiceRow value={vent.conditionAfter || null} options={["PASS", "ISSUE"]} labels={{ PASS: "Pass", ISSUE: "Issue Found" }} onChange={(v) => set("conditionAfter", v as VentEntry["conditionAfter"])} />
      </div>
      <div>
        <Label>Notes</Label>
        <TextInput value={vent.notes} onChange={(v) => set("notes", v)} />
      </div>
      <div className="flex gap-3">
        <PhotoSlot label="Before Photo" value={vent.beforePhotoUrl} onChange={(url) => set("beforePhotoUrl", url)} />
        <PhotoSlot label="After Photo" value={vent.afterPhotoUrl} onChange={(url) => set("afterPhotoUrl", url)} />
      </div>
    </div>
  );
}

export function VentCleaningForm({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobInfo | null>(null);
  const [data, setData] = useState<VentCleaningData>(emptyData());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/technician/jobs/${jobId}`).then((r) => r.json()),
      fetch(`/api/technician/jobs/${jobId}/vent-cleaning`).then((r) => r.json()),
    ]).then(([jobRes, ventRes]) => {
      setJob(jobRes.job);
      if (ventRes.record) setData({ ...emptyData(), ...ventRes.record });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [jobId]);

  function scheduleSave(next: VentCleaningData) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(next), 600);
  }
  async function doSave(next: VentCleaningData) {
    setSaving(true);
    try {
      await fetch(`/api/technician/jobs/${jobId}/vent-cleaning`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next),
      });
    } finally { setSaving(false); }
  }
  function set<K extends keyof VentCleaningData>(key: K, value: VentCleaningData[K]) {
    setData((d) => { const next = { ...d, [key]: value }; scheduleSave(next); return next; });
  }

  function updateVent(index: number, v: VentEntry) {
    const next = [...data.vents];
    next[index] = v;
    set("vents", next);
  }
  function addVent() { set("vents", [...data.vents, emptyVentEntry()]); }
  function removeVent(index: number) { set("vents", data.vents.filter((_, i) => i !== index)); }

  async function complete() {
    setCompleting(true);
    setError(""); setMissing([]);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await doSave(data);
    const res = await fetch(`/api/technician/jobs/${jobId}/vent-cleaning`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete" }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(d.error ?? "Failed to complete form.");
      setMissing(d.missing ?? []);
    } else {
      setData((prev) => ({ ...prev, completedAt: d.record?.completedAt ?? new Date().toISOString() }));
    }
    setCompleting(false);
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#1B3FA8]" /></div>;

  const locked = !!data.completedAt;

  return (
    <div className="space-y-3 pb-8">
      {job && (
        <Card title="Job Information">
          <p className="text-sm text-gray-800 font-semibold">{job.name}</p>
          <p className="text-xs text-gray-500">{job.address}, {job.city}</p>
          <p className="text-xs text-gray-400">#{job.appointmentNumber} · {job.technician?.name ?? "Unassigned"}</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label>Total Vents Authorized</Label>
              <TextInput type="number" value={data.totalVentsAuthorized?.toString() ?? ""} onChange={(v) => set("totalVentsAuthorized", v === "" ? null : parseInt(v))} />
            </div>
            <div>
              <Label>Property</Label>
              <ChoiceRow value={data.propertyType} options={["RESIDENTIAL", "COMMERCIAL"]} labels={{ RESIDENTIAL: "Residential", COMMERCIAL: "Commercial" }} onChange={(v) => set("propertyType", v)} />
            </div>
            <div>
              <Label>Supply Vents</Label>
              <TextInput type="number" value={data.supplyVentsAuthorized?.toString() ?? ""} onChange={(v) => set("supplyVentsAuthorized", v === "" ? null : parseInt(v))} />
            </div>
            <div>
              <Label>Return Vents</Label>
              <TextInput type="number" value={data.returnVentsAuthorized?.toString() ?? ""} onChange={(v) => set("returnVentsAuthorized", v === "" ? null : parseInt(v))} />
            </div>
          </div>
        </Card>
      )}

      <fieldset disabled={locked} className="space-y-3">
        <Card title="Initial Inspection">
          <Label>Overall Condition</Label>
          <MultiCheckboxList value={data.overallCondition} options={VENT_OVERALL_CONDITIONS} onChange={(v) => set("overallCondition", v)} />
          <TextInput value={data.overallConditionOther ?? ""} onChange={(v) => set("overallConditionOther", v)} placeholder="Other…" />
          <Label>Before Photos (required)</Label>
          <PhotoMulti value={data.beforePhotos} onChange={(v) => set("beforePhotos", v)} />
        </Card>

        <Card title={`Vent-by-Vent Checklist (${data.vents.length})`}>
          {data.vents.map((v, i) => (
            <VentRow key={v.id} vent={v} index={i} onChange={(nv) => updateVent(i, nv)} onRemove={() => removeVent(i)} />
          ))}
          <button type="button" onClick={addVent} className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-500">
            <Plus className="w-3.5 h-3.5" /> Add Another Vent
          </button>
        </Card>

        <Card title="Work Performed">
          <MultiCheckboxList value={data.workPerformed} options={VENT_WORK_PERFORMED} onChange={(v) => set("workPerformed", v)} />
        </Card>

        <Card title="Additional Findings">
          <MultiCheckboxList value={data.additionalFindings} options={VENT_ADDITIONAL_FINDINGS} onChange={(v) => set("additionalFindings", v)} />
          <TextInput value={data.additionalFindingsOther ?? ""} onChange={(v) => set("additionalFindingsOther", v)} placeholder="Other…" />
          <Label>Recommended Additional Service</Label>
          <TextInput value={data.recommendedAdditionalService ?? ""} onChange={(v) => set("recommendedAdditionalService", v)} />
        </Card>

        <Card title="Completion">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Total Vents Cleaned</Label>
              <TextInput type="number" value={data.totalVentsCleaned?.toString() ?? ""} onChange={(v) => set("totalVentsCleaned", v === "" ? null : parseInt(v))} />
            </div>
          </div>
          <Label>Status</Label>
          <div className="space-y-1.5">
            {VENT_COMPLETION_STATUSES.map((s) => (
              <button key={s.value} type="button" onClick={() => set("completionStatus", s.value)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold border ${data.completionStatus === s.value ? "bg-[#1B3FA8] text-white border-[#1B3FA8]" : "bg-white text-gray-600 border-gray-200"}`}>
                {s.label}
              </button>
            ))}
          </div>
          <Label>Technician Notes</Label>
          <TextInput value={data.technicianNotes ?? ""} onChange={(v) => set("technicianNotes", v)} />
        </Card>

        <Card title="Technician Signature">
          {data.technicianSignatureUrl ? (
            <div className="flex items-center gap-2 text-xs text-green-600 font-semibold"><Check className="w-4 h-4" /> Signed</div>
          ) : (
            <SignaturePad onSubmit={async (url) => set("technicianSignatureUrl", url)} />
          )}
        </Card>
        <Card title="Customer Signature">
          {data.customerSignatureUrl ? (
            <div className="flex items-center gap-2 text-xs text-green-600 font-semibold"><Check className="w-4 h-4" /> Signed</div>
          ) : (
            <SignaturePad onSubmit={async (url) => set("customerSignatureUrl", url)} />
          )}
        </Card>
      </fieldset>

      {missing.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-1.5">
          <p className="text-sm font-bold text-orange-700">⚠️ Form incomplete</p>
          {missing.map((m) => <p key={m} className="text-xs text-orange-600">• {m}</p>)}
        </div>
      )}
      {error && !missing.length && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {locked ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-sm font-bold text-green-700 flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Report completed and sent to customer</p>
        </div>
      ) : (
        <button type="button" onClick={complete} disabled={completing}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#1B3FA8] text-white rounded-xl text-sm font-bold disabled:opacity-60">
          {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : saving ? "Saving…" : null}
          {completing ? "Sending Report…" : "Save & Send Report"}
        </button>
      )}
    </div>
  );
}
