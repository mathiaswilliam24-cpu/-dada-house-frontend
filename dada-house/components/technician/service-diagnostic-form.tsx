"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, Check, Camera, X, Plus, Search, BookOpen, ChevronDown, ChevronUp, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useUploadThing } from "@/lib/uploadthing-components";
import {
  SERVICE_TYPES, sectionFieldsFor, guessServiceType,
  REPAIR_URGENCY_OPTIONS, ESTIMATED_REPAIR_TYPES, SYSTEM_STATUS_OPTIONS, DIAGNOSTIC_PHOTO_CATEGORIES,
  type ServiceType, type DiagnosticField,
} from "@/lib/service-diagnostic-fields";

type PartRow = {
  id: string;
  part: string;
  manufacturer?: string;
  partNumber?: string;
  qty: number;
  existingReading?: string;
  replacementSpec?: string;
  priceBookItemId?: string;
};

type Diagnostic = {
  serviceType: string;
  customerReportedIssue: string | null;
  arrivalTime: string | null;
  diagnosticStartTime: string | null;
  diagnosticCompletionTime: string | null;
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
  partsRequired: PartRow[];
  repairUrgency: string | null;
  canCustomerContinueUsing: string | null;
  cannotContinueExplanation: string | null;
  finalDiagnosis: string | null;
  recommendedCorrectiveWork: string | null;
  estimatedRepairType: string | null;
  systemStatusWhenLeaving: string | null;
  completedAt: string | null;
  status: string;
  supervisorComment: string | null;
};

function emptyDiagnostic(serviceType: ServiceType): Diagnostic {
  return {
    serviceType, customerReportedIssue: "", arrivalTime: null, diagnosticStartTime: null, diagnosticCompletionTime: null,
    equipmentInspected: "", systemOperatingOnArrival: null, visibleDamage: null, waterLeakPresent: null, unusualNoise: null,
    burningSmell: null, immediateSafetyConcern: false, safetyConcernDescription: "",
    sectionData: {}, problemFound: "", rootCause: "", evidenceSupportingDiagnosis: "", affectedComponents: "",
    recommendedRepair: "", additionalRecommendations: "", partsRequired: [],
    repairUrgency: null, canCustomerContinueUsing: null, cannotContinueExplanation: "",
    finalDiagnosis: "", recommendedCorrectiveWork: "", estimatedRepairType: null, systemStatusWhenLeaving: null,
    completedAt: null, status: "DRAFT", supervisorComment: null,
  };
}

type JobInfo = {
  appointmentNumber: string; name: string; address: string; city: string; phone: string;
  preferredDate: string | null; preferredTime: string | null; service: string;
  description: string | null; technician: { name: string | null } | null;
};

type JobPhotoRow = { id: string; url: string; category: string; caption: string | null; createdAt: string };

// ── Small field building blocks ─────────────────────────────────────────────

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

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" />
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

function GenericField({ field, value, onChange }: { field: DiagnosticField; value: string | number | undefined; onChange: (v: string | number) => void }) {
  return (
    <div>
      <Label>{field.label}{field.unit ? ` (${field.unit})` : ""}</Label>
      {field.type === "select" ? (
        <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : field.type === "yesno" ? (
        <ChoiceRow value={(value as string) ?? null} options={["Yes", "No"]} onChange={onChange} />
      ) : field.type === "number" ? (
        <input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder={field.unit ? `Reading in ${field.unit}` : undefined} />
      ) : field.type === "textarea" ? (
        <TextArea value={(value as string) ?? ""} onChange={onChange} />
      ) : (
        <TextInput value={(value as string) ?? ""} onChange={onChange} />
      )}
    </div>
  );
}

// ── Photo picker for a fixed diagnostic category ────────────────────────────

function PhotoCategoryBlock({ jobId, category, label, minRequired, photos, onChanged }: {
  jobId: string; category: string; label: string; minRequired: number;
  photos: JobPhotoRow[]; onChanged: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const pendingCaption = useRef("");
  const { startUpload } = useUploadThing("jobPhotos", {
    onClientUploadComplete: async (res) => {
      const urls = (res ?? []).map((f) => (f as unknown as Record<string, string>).ufsUrl ?? (f as unknown as Record<string, string>).url).filter(Boolean);
      await Promise.all(urls.map((url) =>
        fetch(`/api/technician/jobs/${jobId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, category, caption: pendingCaption.current || undefined }),
        })
      ));
      pendingCaption.current = "";
      setCaption("");
      setUploading(false);
      onChanged();
    },
    onUploadError: () => setUploading(false),
  });

  async function remove(photoId: string) {
    await fetch(`/api/technician/jobs/${jobId}/photos/${photoId}`, { method: "DELETE" });
    onChanged();
  }

  const met = photos.length >= minRequired;

  return (
    <div className="border border-gray-100 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${met ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}>
          {photos.length}/{minRequired} min
        </span>
      </div>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {photos.map((p) => (
            <div key={p.id} className="relative w-16">
              <div className="relative">
                <img src={p.url} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                {/* Save a copy to the phone — the app can't silently write
                    to the camera roll, this is the reliable tap-to-save path. */}
                <a href={p.url} download target="_blank" rel="noreferrer"
                  className="absolute bottom-0.5 left-0.5 bg-black/60 rounded-md p-0.5" title="Save to phone">
                  <Download className="w-3 h-3 text-white" />
                </a>
                <button type="button" onClick={() => remove(p.id)} className="absolute -top-1.5 -right-1.5 bg-gray-700 rounded-full p-0.5">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
              {p.caption && <p className="text-[9px] text-gray-400 mt-0.5 line-clamp-2">{p.caption}</p>}
            </div>
          ))}
        </div>
      )}
      <input
        value={caption}
        onChange={(e) => { setCaption(e.target.value); pendingCaption.current = e.target.value; }}
        placeholder="Caption for the next photo (optional)…"
        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs mb-2"
      />
      <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-500 cursor-pointer">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        {uploading ? "Uploading…" : "Add Photo"}
        <input type="file" accept="image/*" multiple className="hidden" disabled={uploading}
          onChange={(e) => { if (e.target.files?.length) { setUploading(true); startUpload(Array.from(e.target.files)); } e.target.value = ""; }} />
      </label>
    </div>
  );
}

// ── Parts & Materials ────────────────────────────────────────────────────────

type PriceBookItem = { id: string; name: string; price: number; category: string };

function PartsSection({ parts, onChange }: { parts: PartRow[]; onChange: (parts: PartRow[]) => void }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PriceBookItem[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!showPicker) return;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/price-book${search ? `?q=${encodeURIComponent(search)}` : ""}`);
        const d = await res.json();
        setResults(d.items ?? []);
      } finally { setSearching(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [search, showPicker]);

  function addFromPriceBook(item: PriceBookItem) {
    onChange([...parts, { id: crypto.randomUUID(), part: item.name, qty: 1, priceBookItemId: item.id }]);
    setShowPicker(false);
    setSearch("");
  }

  function addBlank() {
    onChange([...parts, { id: crypto.randomUUID(), part: "", qty: 1 }]);
  }

  function update(id: string, field: keyof PartRow, value: string | number) {
    onChange(parts.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  }

  function remove(id: string) {
    onChange(parts.filter((p) => p.id !== id));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <button type="button" onClick={() => setShowPicker((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-[#1B3FA8]">
            <BookOpen className="w-3.5 h-3.5" /> From Price Book
          </button>
          {showPicker && (
            <div className="absolute left-0 top-full mt-1.5 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search price book…"
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl" />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {searching ? <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                  : results.length === 0 ? <p className="text-xs text-gray-400 text-center py-4">No items found</p>
                  : results.map((p) => (
                    <button key={p.id} type="button" onClick={() => addFromPriceBook(p)} className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                        <p className="text-sm font-bold text-[#1B3FA8] shrink-0">{formatCurrency(p.price)}</p>
                      </div>
                      <p className="text-xs text-gray-400">{p.category}</p>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
        <button type="button" onClick={addBlank} className="flex items-center gap-1 text-xs font-bold text-gray-500">
          <Plus className="w-3.5 h-3.5" /> Blank Row
        </button>
      </div>

      {parts.length === 0 ? (
        <p className="text-xs text-gray-400">No parts added yet.</p>
      ) : (
        <div className="space-y-2">
          {parts.map((p) => (
            <div key={p.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <input value={p.part} onChange={(e) => update(p.id, "part", e.target.value)} placeholder="Part"
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
                <input type="number" min={1} value={p.qty} onChange={(e) => update(p.id, "qty", parseInt(e.target.value) || 1)}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center" />
                <button type="button" onClick={() => remove(p.id)} className="text-gray-300 hover:text-red-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={p.manufacturer ?? ""} onChange={(e) => update(p.id, "manufacturer", e.target.value)} placeholder="Manufacturer"
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                <input value={p.partNumber ?? ""} onChange={(e) => update(p.id, "partNumber", e.target.value)} placeholder="Part Number"
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                <input value={p.existingReading ?? ""} onChange={(e) => update(p.id, "existingReading", e.target.value)} placeholder="Existing reading/condition"
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                <input value={p.replacementSpec ?? ""} onChange={(e) => update(p.id, "replacementSpec", e.target.value)} placeholder="Replacement spec"
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function ServiceDiagnosticForm({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobInfo | null>(null);
  const [data, setData] = useState<Diagnostic>(emptyDiagnostic("OTHER"));
  const [photos, setPhotos] = useState<JobPhotoRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPhotos = useCallback(() => {
    fetch(`/api/technician/jobs/${jobId}/photos`).then((r) => r.json()).then((d) => setPhotos(d.photos ?? [])).catch(() => {});
  }, [jobId]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/technician/jobs/${jobId}`).then((r) => r.json()),
      fetch(`/api/technician/jobs/${jobId}/service-diagnostic`).then((r) => r.json()),
    ]).then(([jobRes, diagRes]) => {
      setJob(jobRes.job);
      if (diagRes.diagnostic) {
        setData({ ...emptyDiagnostic(guessServiceType(jobRes.job?.service)), ...diagRes.diagnostic });
      } else {
        setData(emptyDiagnostic((diagRes.defaults?.serviceType as ServiceType) ?? guessServiceType(jobRes.job?.service)));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    loadPhotos();
  }, [jobId, loadPhotos]);

  function set<K extends keyof Diagnostic>(key: K, value: Diagnostic[K]) {
    setData((d) => {
      const next = { ...d, [key]: value };
      scheduleSave(next);
      return next;
    });
  }

  function setSection(fieldId: string, value: string | number) {
    setData((d) => {
      const next = { ...d, sectionData: { ...d.sectionData, [fieldId]: value } };
      scheduleSave(next);
      return next;
    });
  }

  function scheduleSave(next: Diagnostic) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(next), 600);
  }

  async function doSave(next: Diagnostic) {
    setSaving(true);
    try {
      await fetch(`/api/technician/jobs/${jobId}/service-diagnostic`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } finally {
      setSaving(false);
    }
  }

  async function complete() {
    setCompleting(true);
    setError("");
    // Flush any pending debounced save first so the server has the latest values.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await doSave(data);
    const res = await fetch(`/api/technician/jobs/${jobId}/service-diagnostic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    const d = await res.json();
    setCompleting(false);
    if (!res.ok) {
      setError(d.error ?? "Failed to complete diagnostic.");
      return;
    }
    setData((prev) => ({ ...prev, completedAt: d.diagnostic.completedAt, status: d.diagnostic.status }));
  }

  const serviceType = (data.serviceType as ServiceType) || "OTHER";

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;

  return (
    <div className="space-y-3 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Service Diagnostic Form</h1>
        {saving && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
      </div>

      {data.completedAt && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 font-semibold">
          <Check className="w-4 h-4" /> Diagnostic completed {new Date(data.completedAt).toLocaleString()} — report sent to the customer.
        </div>
      )}

      <div className="space-y-3">

      {/* Section 1 — Job Information */}
      <Card title="1. Job Information">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <p><span className="text-gray-400">Job #</span><br />{job?.appointmentNumber}</p>
          <p><span className="text-gray-400">Customer</span><br />{job?.name}</p>
          <p><span className="text-gray-400">Address</span><br />{job?.address}, {job?.city}</p>
          <p><span className="text-gray-400">Phone</span><br />{job?.phone}</p>
          <p><span className="text-gray-400">Date & Time</span><br />{job?.preferredDate ? new Date(job.preferredDate).toLocaleDateString() : "—"} {job?.preferredTime ?? ""}</p>
          <p><span className="text-gray-400">Technician</span><br />{job?.technician?.name ?? "—"}</p>
        </div>
        <div>
          <Label>Service Type</Label>
          <ChoiceRow
            value={serviceType}
            options={SERVICE_TYPES.map((s) => s.value)}
            labels={Object.fromEntries(SERVICE_TYPES.map((s) => [s.value, s.label]))}
            onChange={(v) => set("serviceType", v)}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>Arrival Time</Label>
            <input type="datetime-local" value={data.arrivalTime?.slice(0, 16) ?? ""} onChange={(e) => set("arrivalTime", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs" />
          </div>
          <div>
            <Label>Diagnostic Start</Label>
            <input type="datetime-local" value={data.diagnosticStartTime?.slice(0, 16) ?? ""} onChange={(e) => set("diagnosticStartTime", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs" />
          </div>
          <div>
            <Label>Diagnostic Completion</Label>
            <input type="datetime-local" value={data.diagnosticCompletionTime?.slice(0, 16) ?? ""} onChange={(e) => set("diagnosticCompletionTime", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2 py-2 text-xs" />
          </div>
        </div>
        <div>
          <Label>Customer Reported Issue *</Label>
          <TextArea value={data.customerReportedIssue ?? ""} onChange={(v) => set("customerReportedIssue", v)} placeholder="Describe exactly what the customer reported before starting the diagnostic." />
        </div>
      </Card>

      {/* Section 2 — Initial Site Inspection */}
      <Card title="2. Initial Site Inspection">
        <div>
          <Label>Equipment / Area Inspected *</Label>
          <TextInput value={data.equipmentInspected ?? ""} onChange={(v) => set("equipmentInspected", v)} />
        </div>
        <div>
          <Label>System operating when technician arrived?</Label>
          <ChoiceRow value={data.systemOperatingOnArrival} options={["YES", "NO", "INTERMITTENTLY", "NOT_APPLICABLE"]} onChange={(v) => set("systemOperatingOnArrival", v)} />
        </div>
        <div>
          <Label>Visible damage?</Label>
          <YesNo value={data.visibleDamage} onChange={(v) => set("visibleDamage", v)} />
        </div>
        <div>
          <Label>Water leak / moisture present?</Label>
          <ChoiceRow value={data.waterLeakPresent} options={["YES", "NO", "NA"]} onChange={(v) => set("waterLeakPresent", v)} />
        </div>
        <div>
          <Label>Unusual noise?</Label>
          <ChoiceRow value={data.unusualNoise} options={["YES", "NO", "NA"]} onChange={(v) => set("unusualNoise", v)} />
        </div>
        <div>
          <Label>Burning smell / unusual odor?</Label>
          <YesNo value={data.burningSmell} onChange={(v) => set("burningSmell", v)} />
        </div>
        <div>
          <Label>Immediate safety concern?</Label>
          <YesNo value={data.immediateSafetyConcern} onChange={(v) => set("immediateSafetyConcern", v)} />
        </div>
        {data.immediateSafetyConcern && (
          <div>
            <Label>Describe Safety Concern *</Label>
            <TextArea value={data.safetyConcernDescription ?? ""} onChange={(v) => set("safetyConcernDescription", v)} />
          </div>
        )}
        <PhotoCategoryBlock jobId={jobId} category={DIAGNOSTIC_PHOTO_CATEGORIES.BEFORE} label="📸 Before Photos (required)" minRequired={2}
          photos={photos.filter((p) => p.category === DIAGNOSTIC_PHOTO_CATEGORIES.BEFORE)} onChanged={loadPhotos} />
      </Card>

      {/* Sections 3-6 — service-type-specific */}
      <Card title={`${serviceType === "AIR_CONDITIONING" ? "3. Air Conditioning" : serviceType === "HEATING" ? "4. Heating" : serviceType === "PLUMBING" ? "5. Plumbing" : "6. Remodeling / Other"} Diagnostic`}>
        <div className="grid grid-cols-2 gap-3">
          {sectionFieldsFor(serviceType).map((f) => (
            <GenericField key={f.id} field={f} value={data.sectionData[f.id]} onChange={(v) => setSection(f.id, v)} />
          ))}
        </div>
      </Card>

      {/* Section 7 — Diagnostic Findings */}
      <Card title="7. Diagnostic Findings">
        <div>
          <Label>Problem Found *</Label>
          <TextArea value={data.problemFound ?? ""} onChange={(v) => set("problemFound", v)} placeholder="What problem did you identify?" />
        </div>
        <div>
          <Label>Root Cause *</Label>
          <TextArea value={data.rootCause ?? ""} onChange={(v) => set("rootCause", v)} placeholder="What is causing the problem?" />
        </div>
        <div>
          <Label>Evidence Supporting Diagnosis *</Label>
          <TextArea value={data.evidenceSupportingDiagnosis ?? ""} onChange={(v) => set("evidenceSupportingDiagnosis", v)} placeholder="What measurements, observations or tests support your diagnosis?" />
        </div>
        <div>
          <Label>Affected Component(s) *</Label>
          <TextInput value={data.affectedComponents ?? ""} onChange={(v) => set("affectedComponents", v)} />
        </div>
        <div>
          <Label>Recommended Repair *</Label>
          <TextArea value={data.recommendedRepair ?? ""} onChange={(v) => set("recommendedRepair", v)} placeholder="What work is required to correct the problem?" />
        </div>
        <div>
          <Label>Additional Recommendations</Label>
          <TextArea value={data.additionalRecommendations ?? ""} onChange={(v) => set("additionalRecommendations", v)} rows={2} />
        </div>
        <PhotoCategoryBlock jobId={jobId} category={DIAGNOSTIC_PHOTO_CATEGORIES.PROBLEM} label="📸 Problem Identified Photo (required)" minRequired={1}
          photos={photos.filter((p) => p.category === DIAGNOSTIC_PHOTO_CATEGORIES.PROBLEM)} onChanged={loadPhotos} />
        {(serviceType === "AIR_CONDITIONING" || serviceType === "HEATING") && (
          <PhotoCategoryBlock jobId={jobId} category={DIAGNOSTIC_PHOTO_CATEGORIES.NAMEPLATE} label="📸 Equipment Nameplate Photo (required)" minRequired={1}
            photos={photos.filter((p) => p.category === DIAGNOSTIC_PHOTO_CATEGORIES.NAMEPLATE)} onChanged={loadPhotos} />
        )}
        <PhotoCategoryBlock jobId={jobId} category={DIAGNOSTIC_PHOTO_CATEGORIES.MEASUREMENT} label="📸 Measurement Photos (optional)" minRequired={0}
          photos={photos.filter((p) => p.category === DIAGNOSTIC_PHOTO_CATEGORIES.MEASUREMENT)} onChanged={loadPhotos} />
      </Card>

      {/* Section 8 — Parts & Materials */}
      <Card title="8. Parts & Materials Required" defaultOpen={false}>
        <PartsSection parts={data.partsRequired} onChange={(parts) => set("partsRequired", parts)} />
      </Card>

      {/* Section 9 — Repair Urgency */}
      <Card title="9. Repair Urgency">
        <div className="grid grid-cols-1 gap-2">
          {REPAIR_URGENCY_OPTIONS.map((o) => (
            <button key={o.value} type="button" onClick={() => set("repairUrgency", o.value)}
              className={`text-left px-3 py-2.5 rounded-xl text-sm font-semibold border ${data.repairUrgency === o.value ? "border-2" : "border-gray-200"}`}
              style={data.repairUrgency === o.value ? { borderColor: o.color, color: o.color, background: `${o.color}10` } : undefined}>
              {o.label}
            </button>
          ))}
        </div>
        <div>
          <Label>Can customer safely continue using equipment?</Label>
          <ChoiceRow value={data.canCustomerContinueUsing} options={["YES", "NO", "WITH_LIMITATIONS"]} onChange={(v) => set("canCustomerContinueUsing", v)} />
        </div>
        {data.canCustomerContinueUsing === "NO" && (
          <div>
            <Label>Explanation *</Label>
            <TextArea value={data.cannotContinueExplanation ?? ""} onChange={(v) => set("cannotContinueExplanation", v)} rows={2} />
          </div>
        )}
      </Card>

      {/* Section 10 — After-repair photos (optional in Phase 1, no repair-completion step yet) */}
      <Card title="10. Additional Photos" defaultOpen={false}>
        <PhotoCategoryBlock jobId={jobId} category={DIAGNOSTIC_PHOTO_CATEGORIES.AFTER} label="📸 After Repair Photos (if repair performed)" minRequired={0}
          photos={photos.filter((p) => p.category === DIAGNOSTIC_PHOTO_CATEGORIES.AFTER)} onChanged={loadPhotos} />
      </Card>

      {/* Section 11 — Final Diagnosis */}
      <Card title="11. Technician Final Diagnosis">
        <div>
          <Label>Final Diagnosis *</Label>
          <TextArea value={data.finalDiagnosis ?? ""} onChange={(v) => set("finalDiagnosis", v)} />
        </div>
        <div>
          <Label>Recommended Corrective Work *</Label>
          <TextArea value={data.recommendedCorrectiveWork ?? ""} onChange={(v) => set("recommendedCorrectiveWork", v)} />
        </div>
        <div>
          <Label>Estimated Repair Type</Label>
          <ChoiceRow value={data.estimatedRepairType} options={ESTIMATED_REPAIR_TYPES} onChange={(v) => set("estimatedRepairType", v)} />
        </div>
        <div>
          <Label>System Status When Leaving</Label>
          <ChoiceRow value={data.systemStatusWhenLeaving} options={SYSTEM_STATUS_OPTIONS} onChange={(v) => set("systemStatusWhenLeaving", v)} />
        </div>
      </Card>

      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button
        type="button"
        onClick={complete}
        disabled={completing}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1B3FA8] text-white rounded-2xl font-bold disabled:opacity-40"
      >
        {completing ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Form"}
      </button>
    </div>
  );
}
