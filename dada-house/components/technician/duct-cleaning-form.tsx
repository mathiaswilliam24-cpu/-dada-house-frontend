"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, Check, X, Camera, Plus, Trash2, ChevronDown, ChevronUp, Download } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing-components";
import {
  DUCT_MATERIALS, DUCT_PRE_CLEANING_INSPECTION, DUCT_CONTAMINATION_OBSERVED, DUCT_SYSTEM_PROBLEMS,
  DUCT_CLEANING_PROCEDURE, DUCT_COMPONENTS, DUCT_ISSUES_FOUND, DUCT_FINAL_INSPECTION,
  DUCT_SYSTEM_CONDITION_AFTER, DUCT_PHOTO_CATEGORIES,
  getMissingDuctCleaningFields, emptyRegisterEntry, emptyComponentCleaning,
  type RegisterEntry, type ComponentState, type DuctPhotoCategory,
} from "@/lib/duct-cleaning-fields";

const SignaturePad = dynamic(() => import("@/components/portal/signature-pad"), { ssr: false });

type JobInfo = {
  appointmentNumber: string; name: string; address: string; city: string; phone: string;
  service: string; technician: { name: string | null } | null;
};

type PhotoEntry = { category: string; url: string };

type DuctCleaningData = {
  propertyType: string | null;
  systemsCount: number | null;
  systemsServiced: string[];
  totalSupplyRegisters: number | null;
  totalReturnRegisters: number | null;
  ductMaterial: string | null;

  preCleaningInspection: string[];
  contaminationObserved: string[];
  contaminationOther: string | null;
  systemProblemsFound: string[];
  systemProblemsOther: string | null;
  technicianFindings: string | null;

  cleaningProcedure: string[];
  equipmentMethodUsed: string | null;

  registers: RegisterEntry[];
  componentCleaning: Record<string, ComponentState>;

  additionalIssueFound: boolean;
  issuesFound: string[];
  issuesOther: string | null;
  issuePhotoUrl: string;
  additionalRepairRecommended: string | null;
  separateEstimateRequired: boolean | null;

  finalInspection: string[];
  systemConditionAfter: string | null;
  notOperatedExplanation: string | null;

  beforePhotos: PhotoEntry[];
  afterPhotos: PhotoEntry[];

  technicianNotes: string | null;
  technicianSignatureUrl: string | null;
  customerSignatureUrl: string | null;
  completedAt: string | null;
};

function emptyData(): DuctCleaningData {
  return {
    propertyType: null, systemsCount: null, systemsServiced: [], totalSupplyRegisters: null, totalReturnRegisters: null, ductMaterial: null,
    preCleaningInspection: [], contaminationObserved: [], contaminationOther: "", systemProblemsFound: [], systemProblemsOther: "", technicianFindings: "",
    cleaningProcedure: [], equipmentMethodUsed: "",
    registers: [], componentCleaning: emptyComponentCleaning(),
    additionalIssueFound: false, issuesFound: [], issuesOther: "", issuePhotoUrl: "", additionalRepairRecommended: "", separateEstimateRequired: null,
    finalInspection: [], systemConditionAfter: null, notOperatedExplanation: "",
    beforePhotos: [], afterPhotos: [],
    technicianNotes: "", technicianSignatureUrl: null, customerSignatureUrl: null, completedAt: null,
  };
}

// ── Building blocks (self-contained, matching the rest of this codebase) ───

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
function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {[{ v: true, label: "Yes" }, { v: false, label: "No" }].map((o) => (
        <button key={o.label} type="button" onClick={() => onChange(o.v)}
          className={`flex-1 py-2 rounded-xl text-sm font-semibold border ${value === o.v ? "bg-[#1B3FA8] text-white border-[#1B3FA8]" : "bg-white text-gray-600 border-gray-200"}`}>
          {o.label}
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

function RegisterRow({ entry, index, onChange, onRemove }: { entry: RegisterEntry; index: number; onChange: (v: RegisterEntry) => void; onRemove: () => void }) {
  function set<K extends keyof RegisterEntry>(key: K, value: RegisterEntry[K]) {
    onChange({ ...entry, [key]: value });
  }
  return (
    <div className="border border-gray-100 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-700">Register #{index + 1}</p>
        <button type="button" onClick={onRemove} className="text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <div>
        <Label>Location</Label>
        <TextInput value={entry.location} onChange={(v) => set("location", v)} placeholder="e.g. Master Bedroom" />
      </div>
      <div>
        <Label>Type</Label>
        <ChoiceRow value={entry.type || null} options={["SUPPLY", "RETURN"]} labels={{ SUPPLY: "Supply", RETURN: "Return" }} onChange={(v) => set("type", v as RegisterEntry["type"])} />
      </div>
      <div>
        <Label>Before Condition</Label>
        <TextInput value={entry.beforeCondition} onChange={(v) => set("beforeCondition", v)} />
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-700">
        <input type="checkbox" checked={entry.cleaned} onChange={(e) => set("cleaned", e.target.checked)} />
        Cleaned
      </label>
      <div>
        <Label>After Condition</Label>
        <ChoiceRow value={entry.afterCondition || null} options={["PASS", "ISSUE"]} labels={{ PASS: "Pass", ISSUE: "Issue Found" }} onChange={(v) => set("afterCondition", v as RegisterEntry["afterCondition"])} />
      </div>
      <div>
        <Label>Notes</Label>
        <TextInput value={entry.notes} onChange={(v) => set("notes", v)} />
      </div>
      <div className="flex gap-3">
        <PhotoSlot label="Before Photo" value={entry.beforePhotoUrl} onChange={(url) => set("beforePhotoUrl", url)} />
        <PhotoSlot label="After Photo" value={entry.afterPhotoUrl} onChange={(url) => set("afterPhotoUrl", url)} />
      </div>
    </div>
  );
}

function ComponentMatrix({ value, onChange }: { value: Record<string, ComponentState>; onChange: (v: Record<string, ComponentState>) => void }) {
  function set(key: string, field: keyof ComponentState, v: boolean) {
    const current = value[key] ?? { inspected: false, cleaned: false, na: false };
    const next = { ...current, [field]: v };
    if (field === "na" && v) { next.inspected = false; next.cleaned = false; }
    if ((field === "inspected" || field === "cleaned") && v) next.na = false;
    onChange({ ...value, [key]: next });
  }
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="grid grid-cols-4 bg-gray-50 text-[10px] font-bold text-gray-500 px-3 py-2">
        <span className="col-span-1">Component</span>
        <span className="text-center">Inspected</span>
        <span className="text-center">Cleaned</span>
        <span className="text-center">N/A</span>
      </div>
      {DUCT_COMPONENTS.map((c) => {
        const s = value[c.key] ?? { inspected: false, cleaned: false, na: false };
        return (
          <div key={c.key} className="grid grid-cols-4 items-center px-3 py-2 border-t border-gray-100 text-xs">
            <span className="text-gray-700">{c.label}</span>
            <span className="flex justify-center"><input type="checkbox" checked={s.inspected} onChange={(e) => set(c.key, "inspected", e.target.checked)} /></span>
            <span className="flex justify-center"><input type="checkbox" checked={s.cleaned} onChange={(e) => set(c.key, "cleaned", e.target.checked)} /></span>
            <span className="flex justify-center"><input type="checkbox" checked={s.na} onChange={(e) => set(c.key, "na", e.target.checked)} /></span>
          </div>
        );
      })}
    </div>
  );
}

function CategoryPhotoPairs({ before, after, onChangeBefore, onChangeAfter }: {
  before: PhotoEntry[]; after: PhotoEntry[];
  onChangeBefore: (v: PhotoEntry[]) => void; onChangeAfter: (v: PhotoEntry[]) => void;
}) {
  function setOne(list: PhotoEntry[], category: string, url: string): PhotoEntry[] {
    const withoutCat = list.filter((p) => p.category !== category);
    return url ? [...withoutCat, { category, url }] : withoutCat;
  }
  return (
    <div className="space-y-3">
      {(Object.keys(DUCT_PHOTO_CATEGORIES) as DuctPhotoCategory[]).map((cat) => {
        const beforeUrl = before.find((p) => p.category === cat)?.url ?? "";
        const afterUrl = after.find((p) => p.category === cat)?.url ?? "";
        return (
          <div key={cat}>
            <p className="text-xs font-semibold text-gray-700 mb-1">{DUCT_PHOTO_CATEGORIES[cat]}</p>
            <div className="flex gap-3">
              <PhotoSlot label="Before" value={beforeUrl} onChange={(url) => onChangeBefore(setOne(before, cat, url))} />
              <PhotoSlot label="After" value={afterUrl} onChange={(url) => onChangeAfter(setOne(after, cat, url))} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DuctCleaningForm({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobInfo | null>(null);
  const [data, setData] = useState<DuctCleaningData>(emptyData());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/technician/jobs/${jobId}`).then((r) => r.json()),
      fetch(`/api/technician/jobs/${jobId}/duct-cleaning`).then((r) => r.json()),
    ]).then(([jobRes, ductRes]) => {
      setJob(jobRes.job);
      if (ductRes.record) {
        setData({ ...emptyData(), ...ductRes.record, componentCleaning: { ...emptyComponentCleaning(), ...(ductRes.record.componentCleaning ?? {}) } });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [jobId]);

  function scheduleSave(next: DuctCleaningData) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(next), 600);
  }
  async function doSave(next: DuctCleaningData) {
    setSaving(true);
    try {
      await fetch(`/api/technician/jobs/${jobId}/duct-cleaning`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next),
      });
    } finally { setSaving(false); }
  }
  function set<K extends keyof DuctCleaningData>(key: K, value: DuctCleaningData[K]) {
    setData((d) => { const next = { ...d, [key]: value }; scheduleSave(next); return next; });
  }

  function updateRegister(index: number, v: RegisterEntry) {
    const next = [...data.registers];
    next[index] = v;
    set("registers", next);
  }
  function addRegister() { set("registers", [...data.registers, emptyRegisterEntry()]); }
  function removeRegister(index: number) { set("registers", data.registers.filter((_, i) => i !== index)); }

  async function complete() {
    setCompleting(true);
    setError(""); setMissing([]);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await doSave(data);
    const res = await fetch(`/api/technician/jobs/${jobId}/duct-cleaning`, {
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
        <Card title="Job & System Information">
          <p className="text-sm text-gray-800 font-semibold">{job.name}</p>
          <p className="text-xs text-gray-500">{job.address}, {job.city}</p>
          <p className="text-xs text-gray-400">#{job.appointmentNumber} · {job.technician?.name ?? "Unassigned"}</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label>Property</Label>
              <ChoiceRow value={data.propertyType} options={["RESIDENTIAL", "COMMERCIAL"]} labels={{ RESIDENTIAL: "Residential", COMMERCIAL: "Commercial" }} onChange={(v) => set("propertyType", v)} />
            </div>
            <div>
              <Label>Number of HVAC Systems</Label>
              <TextInput type="number" value={data.systemsCount?.toString() ?? ""} onChange={(v) => set("systemsCount", v === "" ? null : parseInt(v))} />
            </div>
            <div>
              <Label>Total Supply Registers</Label>
              <TextInput type="number" value={data.totalSupplyRegisters?.toString() ?? ""} onChange={(v) => set("totalSupplyRegisters", v === "" ? null : parseInt(v))} />
            </div>
            <div>
              <Label>Total Return Registers</Label>
              <TextInput type="number" value={data.totalReturnRegisters?.toString() ?? ""} onChange={(v) => set("totalReturnRegisters", v === "" ? null : parseInt(v))} />
            </div>
          </div>
          <Label>Duct Material</Label>
          <ChoiceRow value={data.ductMaterial} options={DUCT_MATERIALS.map((m) => m.value)} labels={Object.fromEntries(DUCT_MATERIALS.map((m) => [m.value, m.label]))} onChange={(v) => set("ductMaterial", v)} />
        </Card>
      )}

      <fieldset disabled={locked} className="space-y-3">
        <Card title="Pre-Cleaning Inspection">
          <MultiCheckboxList value={data.preCleaningInspection} options={DUCT_PRE_CLEANING_INSPECTION} onChange={(v) => set("preCleaningInspection", v)} />
        </Card>

        <Card title="Contamination/Debris Observed">
          <MultiCheckboxList value={data.contaminationObserved} options={DUCT_CONTAMINATION_OBSERVED} onChange={(v) => set("contaminationObserved", v)} />
          <TextInput value={data.contaminationOther ?? ""} onChange={(v) => set("contaminationOther", v)} placeholder="Other…" />
        </Card>

        <Card title="System Condition / Problems Found">
          <MultiCheckboxList value={data.systemProblemsFound} options={DUCT_SYSTEM_PROBLEMS} onChange={(v) => set("systemProblemsFound", v)} />
          <TextInput value={data.systemProblemsOther ?? ""} onChange={(v) => set("systemProblemsOther", v)} placeholder="Other…" />
          <Label>Technician Findings</Label>
          <TextInput value={data.technicianFindings ?? ""} onChange={(v) => set("technicianFindings", v)} />
        </Card>

        <Card title="Cleaning Procedure">
          <p className="text-[11px] text-gray-400 mb-1">Only check the methods actually used.</p>
          <MultiCheckboxList value={data.cleaningProcedure} options={DUCT_CLEANING_PROCEDURE} onChange={(v) => set("cleaningProcedure", v)} />
          <Label>Equipment/Method Used</Label>
          <TextInput value={data.equipmentMethodUsed ?? ""} onChange={(v) => set("equipmentMethodUsed", v)} />
        </Card>

        <Card title={`Register-by-Register Documentation (${data.registers.length})`}>
          {data.registers.map((r, i) => (
            <RegisterRow key={r.id} entry={r} index={i} onChange={(nv) => updateRegister(i, nv)} onRemove={() => removeRegister(i)} />
          ))}
          <button type="button" onClick={addRegister} className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-500">
            <Plus className="w-3.5 h-3.5" /> Add Register
          </button>
        </Card>

        <Card title="HVAC Component Cleaning">
          <p className="text-[11px] text-gray-400 mb-1">"Inspected" does not automatically mean "Cleaned."</p>
          <ComponentMatrix value={data.componentCleaning} onChange={(v) => set("componentCleaning", v)} />
        </Card>

        <Card title="Problems Discovered During Cleaning">
          <Label>Additional Issue Found?</Label>
          <YesNo value={data.additionalIssueFound} onChange={(v) => set("additionalIssueFound", v)} />
          {data.additionalIssueFound && (
            <>
              <MultiCheckboxList value={data.issuesFound} options={DUCT_ISSUES_FOUND} onChange={(v) => set("issuesFound", v)} />
              <TextInput value={data.issuesOther ?? ""} onChange={(v) => set("issuesOther", v)} placeholder="Other…" />
              <Label>Photo Required</Label>
              <PhotoSlot label="Issue Photo" value={data.issuePhotoUrl} onChange={(url) => set("issuePhotoUrl", url)} />
              <Label>Additional Repair Recommended</Label>
              <TextInput value={data.additionalRepairRecommended ?? ""} onChange={(v) => set("additionalRepairRecommended", v)} />
              <Label>Separate Estimate Required</Label>
              <YesNo value={data.separateEstimateRequired} onChange={(v) => set("separateEstimateRequired", v)} />
            </>
          )}
        </Card>

        <Card title="Final Inspection">
          <MultiCheckboxList value={data.finalInspection} options={DUCT_FINAL_INSPECTION} onChange={(v) => set("finalInspection", v)} />
        </Card>

        <Card title="Before & After Photos">
          <CategoryPhotoPairs
            before={data.beforePhotos} after={data.afterPhotos}
            onChangeBefore={(v) => set("beforePhotos", v)}
            onChangeAfter={(v) => set("afterPhotos", v)}
          />
        </Card>

        <Card title="Completion">
          <Label>System Condition After Service</Label>
          <div className="space-y-1.5">
            {DUCT_SYSTEM_CONDITION_AFTER.map((s) => (
              <button key={s.value} type="button" onClick={() => set("systemConditionAfter", s.value)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold border ${data.systemConditionAfter === s.value ? "bg-[#1B3FA8] text-white border-[#1B3FA8]" : "bg-white text-gray-600 border-gray-200"}`}>
                {s.label}
              </button>
            ))}
          </div>
          {data.systemConditionAfter === "NOT_OPERATED" && (
            <TextInput value={data.notOperatedExplanation ?? ""} onChange={(v) => set("notOperatedExplanation", v)} placeholder="Explain…" />
          )}
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
