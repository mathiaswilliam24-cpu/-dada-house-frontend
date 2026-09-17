"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2, Check, Camera, X, ChevronDown, ChevronUp, Download } from "lucide-react";
import {
  SYSTEM_TYPES, INSTALLATION_TYPES, equipmentFieldsFor, EQUIPMENT_TYPE_LABEL,
  INSTALLATION_CHECKLIST_OUTDOOR, INSTALLATION_CHECKLIST_INDOOR, DRAIN_TEST_CHECKLIST,
  THERMOSTAT_CONTROLS_CHECKLIST, CUSTOMER_HANDOVER_CHECKLIST, emptyChecklist,
  ELECTRICAL_FIELDS_OUTDOOR, ELECTRICAL_FIELDS_INDOOR,
  REFRIGERANT_CIRCUIT_FIELDS, VACUUM_EVACUATION_FIELDS, AIRFLOW_FIELDS,
  GAS_FURNACE_FIELDS, HEAT_PUMP_HEATING_FIELDS,
  isHeatPumpSystem, hasGasFurnace, FINAL_TEST_ITEMS, FINAL_STARTUP_RESULTS,
  STARTUP_PHOTO_CATEGORIES, REQUIRED_STARTUP_PHOTO_LABELS,
  type EquipmentType, type EquipmentEntry, type ChecklistItem, type ElectricalField,
  type MeasurementField, type FinalTestKey,
} from "@/lib/system-startup-fields";
import { useUploadThing } from "@/lib/uploadthing-components";

const SignaturePad = dynamic(() => import("@/components/portal/signature-pad"), { ssr: false });

type ElectricalReadings = { outdoor: Record<string, { rated: string; actual: string }>; indoor: Record<string, { rated: string; actual: string }> };

type StartupData = {
  additionalTechnicians: string;
  systemType: string | null;
  installationType: string | null;
  permitNumber: string;
  startupDateTime: string | null;
  equipment: EquipmentEntry[];
  installationChecklist: ChecklistItem[];
  refrigerantCircuit: Record<string, string | number | boolean>;
  vacuumEvacuation: Record<string, string | number>;
  electricalReadings: ElectricalReadings;
  airflowPerformance: Record<string, string | Record<string, string | number>>;
  drainTest: ChecklistItem[];
  heatingStartup: Record<string, string | number>;
  thermostatControls: ChecklistItem[];
  finalTestResults: Partial<Record<FinalTestKey, string>>;
  finalStartupResult: string | null;
  failExplanation: string;
  technicianCertified: boolean;
  technicianSignatureUrl: string | null;
  handoverChecklist: ChecklistItem[];
  customerSignatureUrl: string | null;
  status: string;
  supervisorComment: string | null;
  completedAt: string | null;
};

function emptyStartup(): StartupData {
  return {
    additionalTechnicians: "", systemType: null, installationType: null, permitNumber: "", startupDateTime: null,
    equipment: [],
    installationChecklist: [...emptyChecklist(INSTALLATION_CHECKLIST_OUTDOOR), ...emptyChecklist(INSTALLATION_CHECKLIST_INDOOR)],
    refrigerantCircuit: {}, vacuumEvacuation: {},
    electricalReadings: { outdoor: {}, indoor: {} },
    airflowPerformance: { default: {} },
    drainTest: emptyChecklist(DRAIN_TEST_CHECKLIST),
    heatingStartup: {},
    thermostatControls: emptyChecklist(THERMOSTAT_CONTROLS_CHECKLIST),
    finalTestResults: {}, finalStartupResult: null, failExplanation: "",
    technicianCertified: false, technicianSignatureUrl: null,
    handoverChecklist: emptyChecklist(CUSTOMER_HANDOVER_CHECKLIST),
    customerSignatureUrl: null,
    status: "DRAFT", supervisorComment: null, completedAt: null,
  };
}

type JobPhotoRow = { id: string; url: string; category: string; caption: string | null };

// ── Small building blocks (mirrors service-diagnostic-form.tsx) ─────────────

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

function ChoiceRow({ value, options, onChange }: { value: string | null | undefined; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${value === o ? "bg-[#1B3FA8] text-white border-[#1B3FA8]" : "bg-white text-gray-600 border-gray-200"}`}>
          {o.replace(/_/g, " ")}
        </button>
      ))}
    </div>
  );
}

function MeasurementInput({ field, value, onChange }: { field: MeasurementField; value: string | number | undefined; onChange: (v: string | number) => void }) {
  return (
    <div>
      <Label>{field.label}{field.unit ? ` (${field.unit})` : ""}</Label>
      {field.type === "select" || field.type === "yesno" ? (
        <ChoiceRow value={(value as string) ?? null} options={field.type === "yesno" ? ["Yes", "No"] : field.options ?? []} onChange={onChange} />
      ) : field.type === "number" ? (
        <input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
      ) : (
        <input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
      )}
    </div>
  );
}

function ChecklistSection({ items, onChange }: { items: ChecklistItem[]; onChange: (items: ChecklistItem[]) => void }) {
  function update(id: string, patch: Partial<ChecklistItem>) {
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  const colorFor = (r: string) => (r === "PASS" ? "bg-green-600 text-white border-green-600" : r === "FAIL" ? "bg-red-600 text-white border-red-600" : "bg-gray-500 text-white border-gray-500");
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="border border-gray-100 rounded-xl p-3">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-sm text-gray-800 flex-1">{item.label}</p>
            <div className="flex gap-1 shrink-0">
              {(["PASS", "FAIL", "NA"] as const).map((r) => (
                <button key={r} type="button" onClick={() => update(item.id, { result: r })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${item.result === r ? colorFor(r) : "bg-white text-gray-500 border-gray-200"}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          {item.result === "FAIL" && (
            <input value={item.comment} onChange={(e) => update(item.id, { comment: e.target.value })} placeholder="Comment (required for FAIL)"
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
          )}
        </div>
      ))}
    </div>
  );
}

function EquipmentSection({ equipment, onChange }: { equipment: EquipmentEntry[]; onChange: (eq: EquipmentEntry[]) => void }) {
  function addEntry(type: EquipmentType) {
    onChange([...equipment, { id: crypto.randomUUID(), equipmentType: type, values: {} }]);
  }
  function updateEntry(id: string, fieldId: string, value: string) {
    onChange(equipment.map((e) => (e.id === id ? { ...e, values: { ...e.values, [fieldId]: value } } : e)));
  }
  function removeEntry(id: string) {
    onChange(equipment.filter((e) => e.id !== id));
  }
  return (
    <div className="space-y-3">
      {equipment.map((eq) => (
        <div key={eq.id} className="border border-gray-100 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">{EQUIPMENT_TYPE_LABEL[eq.equipmentType]}</p>
            <button type="button" onClick={() => removeEntry(eq.id)} className="text-gray-300 hover:text-red-400"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {equipmentFieldsFor(eq.equipmentType).map((f) => (
              <div key={f.id}>
                <label className="text-[11px] text-gray-500">{f.label}</label>
                {f.type === "select" ? (
                  <select value={eq.values[f.id] ?? ""} onChange={(e) => updateEntry(eq.id, f.id, e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                    <option value="">—</option>
                    {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input value={eq.values[f.id] ?? ""} onChange={(e) => updateEntry(eq.id, f.id, e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" onClick={() => addEntry("OUTDOOR")} className="flex-1 py-2 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-500">+ Outdoor Unit</button>
        <button type="button" onClick={() => addEntry("INDOOR")} className="flex-1 py-2 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-500">+ Indoor Unit</button>
        <button type="button" onClick={() => addEntry("THERMOSTAT")} className="flex-1 py-2 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-500">+ Thermostat</button>
      </div>
    </div>
  );
}

function RatedActualTable({ fields, values, onChange }: { fields: ElectricalField[]; values: Record<string, { rated: string; actual: string }>; onChange: (v: Record<string, { rated: string; actual: string }>) => void }) {
  function update(id: string, key: "rated" | "actual", val: string) {
    onChange({ ...values, [id]: { ...values[id], [key]: val } });
  }
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-2 text-[9px] font-bold text-gray-400 uppercase">
        <div>Measurement</div><div>Manufacturer Rating</div><div>Actual Reading</div>
      </div>
      {fields.map((f) => (
        <div key={f.id} className="grid grid-cols-3 gap-2 items-center">
          <p className="text-xs text-gray-700">{f.label}{f.unit ? ` (${f.unit})` : ""}</p>
          <input value={values[f.id]?.rated ?? ""} onChange={(e) => update(f.id, "rated", e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
          <input value={values[f.id]?.actual ?? ""} onChange={(e) => update(f.id, "actual", e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
        </div>
      ))}
    </div>
  );
}

function PhotoCategoryBlock({ jobId, category, label, minRequired, photos, onChanged }: {
  jobId: string; category: string; label: string; minRequired: number;
  photos: JobPhotoRow[]; onChanged: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const pendingCaption = useRef("");
  const [caption, setCaption] = useState("");
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
              <img src={p.url} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
              {/* Save a copy to the phone — the app can't silently write to
                  the camera roll, this is the reliable tap-to-save path. */}
              <a href={p.url} download target="_blank" rel="noreferrer"
                className="absolute bottom-0.5 left-0.5 bg-black/60 rounded-md p-0.5" title="Save to phone">
                <Download className="w-3 h-3 text-white" />
              </a>
              <button type="button" onClick={() => remove(p.id)} className="absolute -top-1.5 -right-1.5 bg-gray-700 rounded-full p-0.5">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        value={caption}
        onChange={(e) => { setCaption(e.target.value); pendingCaption.current = e.target.value; }}
        placeholder="Caption (optional)…"
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

// ── Main component ────────────────────────────────────────────────────────────

export function SystemStartupForm({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StartupData>(emptyStartup());
  const [photos, setPhotos] = useState<JobPhotoRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState<string[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPhotos = useCallback(() => {
    fetch(`/api/technician/jobs/${jobId}/photos`).then((r) => r.json()).then((d) => setPhotos(d.photos ?? [])).catch(() => {});
  }, [jobId]);

  useEffect(() => {
    fetch(`/api/technician/jobs/${jobId}/system-startup`).then((r) => r.json()).then((d) => {
      if (d.startup) setData({ ...emptyStartup(), ...d.startup });
      setLoading(false);
    }).catch(() => setLoading(false));
    loadPhotos();
  }, [jobId, loadPhotos]);

  function set<K extends keyof StartupData>(key: K, value: StartupData[K]) {
    setData((d) => {
      const next = { ...d, [key]: value };
      scheduleSave(next);
      return next;
    });
  }

  function scheduleSave(next: StartupData) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(next), 600);
  }

  async function doSave(next: StartupData) {
    setSaving(true);
    try {
      await fetch(`/api/technician/jobs/${jobId}/system-startup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    setMissing([]);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await doSave(data);
    const res = await fetch(`/api/technician/jobs/${jobId}/system-startup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit" }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(d.error ?? "Failed to submit.");
      setMissing(d.missing ?? []);
      return;
    }
    setData((prev) => ({ ...prev, status: d.startup.status, completedAt: d.startup.completedAt }));
  }

  async function submitHandover(customerSignatureUrl: string) {
    setHandoverSubmitting(true);
    setError("");
    const res = await fetch(`/api/technician/jobs/${jobId}/system-startup/handover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoverChecklist: data.handoverChecklist, customerSignatureUrl }),
    });
    const d = await res.json();
    setHandoverSubmitting(false);
    if (!res.ok) { setError(d.error ?? "Failed to complete handover."); return; }
    setData((prev) => ({ ...prev, customerSignatureUrl: d.startup.customerSignatureUrl }));
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;

  const isHeatPump = isHeatPumpSystem(data.systemType);
  const isFurnace = hasGasFurnace(data.systemType);
  const airflowMode = isHeatPump ? ((data.airflowPerformance.mode as string) ?? "cooling") : "default";
  const airflowValues = (data.airflowPerformance[airflowMode] as Record<string, string | number>) ?? {};

  const locked = data.status === "AWAITING_SUPERVISOR_REVIEW";
  const needsRevision = data.status === "RETURNED" || data.status === "ADDITIONAL_TESTING_REQUESTED";
  const approved = data.status === "APPROVED";
  const handoverDone = !!data.customerSignatureUrl;

  const photoCategoryCounts = (category: string) => photos.filter((p) => p.category === category).length;

  return (
    <div className="space-y-3 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">System Startup & Commissioning</h1>
        {saving && <span className="text-[10px] text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
      </div>

      {locked && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs text-orange-700 font-semibold">
          <Check className="w-4 h-4" /> Submitted — awaiting supervisor review. This form is locked until it's reviewed.
        </div>
      )}
      {needsRevision && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
          <p className="font-bold mb-1">{data.status === "RETURNED" ? "Returned by supervisor" : "Additional testing requested"} — please update and resubmit:</p>
          <p>{data.supervisorComment}</p>
        </div>
      )}
      {approved && !handoverDone && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 font-semibold">
          <Check className="w-4 h-4" /> Approved by supervisor — complete the Customer Handover below to finish.
        </div>
      )}
      {handoverDone && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 font-semibold">
          <Check className="w-4 h-4" /> Handover complete — report sent to the customer.
        </div>
      )}

      <fieldset disabled={locked || approved} className={(locked || approved) ? "opacity-60 space-y-3" : "space-y-3"}>

        <Card title="1. Job & Installation Information">
          <div>
            <Label>System Type</Label>
            <ChoiceRow value={data.systemType} options={SYSTEM_TYPES} onChange={(v) => set("systemType", v)} />
          </div>
          <div>
            <Label>Installation Type</Label>
            <ChoiceRow value={data.installationType} options={INSTALLATION_TYPES} onChange={(v) => set("installationType", v)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Additional Technician(s)</Label>
              <input value={data.additionalTechnicians} onChange={(e) => set("additionalTechnicians", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div>
              <Label>Permit #</Label>
              <input value={data.permitNumber} onChange={(e) => set("permitNumber", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <Label>Startup Date & Time</Label>
            <input type="datetime-local" value={data.startupDateTime?.slice(0, 16) ?? ""} onChange={(e) => set("startupDateTime", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          </div>
        </Card>

        <Card title="2. Equipment Identification">
          <EquipmentSection equipment={data.equipment} onChange={(v) => set("equipment", v)} />
        </Card>

        <Card title="Nameplate Photos (required)">
          <PhotoCategoryBlock jobId={jobId} category={STARTUP_PHOTO_CATEGORIES.OUTDOOR_NAMEPLATE} label="Outdoor Nameplate" minRequired={1}
            photos={photos.filter((p) => p.category === STARTUP_PHOTO_CATEGORIES.OUTDOOR_NAMEPLATE)} onChanged={loadPhotos} />
          <PhotoCategoryBlock jobId={jobId} category={STARTUP_PHOTO_CATEGORIES.INDOOR_NAMEPLATE} label="Indoor Nameplate" minRequired={1}
            photos={photos.filter((p) => p.category === STARTUP_PHOTO_CATEGORIES.INDOOR_NAMEPLATE)} onChanged={loadPhotos} />
        </Card>

        <Card title="3. Installation Verification — Outdoor" defaultOpen={false}>
          <ChecklistSection
            items={data.installationChecklist.filter((i) => INSTALLATION_CHECKLIST_OUTDOOR.some((d) => d.id === i.id))}
            onChange={(updated) => set("installationChecklist", [...updated, ...data.installationChecklist.filter((i) => !INSTALLATION_CHECKLIST_OUTDOOR.some((d) => d.id === i.id))])}
          />
        </Card>
        <Card title="3. Installation Verification — Indoor" defaultOpen={false}>
          <ChecklistSection
            items={data.installationChecklist.filter((i) => INSTALLATION_CHECKLIST_INDOOR.some((d) => d.id === i.id))}
            onChange={(updated) => set("installationChecklist", [...updated, ...data.installationChecklist.filter((i) => !INSTALLATION_CHECKLIST_INDOOR.some((d) => d.id === i.id))])}
          />
        </Card>

        <Card title="4. Refrigerant Circuit / Commissioning" defaultOpen={false}>
          <div className="mb-1">
            <Label>Was the refrigerant circuit opened for this installation?</Label>
            <ChoiceRow value={data.refrigerantCircuit.circuitOpened ? "Yes" : data.refrigerantCircuit.circuitOpened === false ? "No" : null}
              options={["Yes", "No"]} onChange={(v) => set("refrigerantCircuit", { ...data.refrigerantCircuit, circuitOpened: v === "Yes" })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {REFRIGERANT_CIRCUIT_FIELDS.map((f) => (
              <MeasurementInput key={f.id} field={f} value={data.refrigerantCircuit[f.id] as string | number} onChange={(v) => set("refrigerantCircuit", { ...data.refrigerantCircuit, [f.id]: v })} />
            ))}
          </div>
        </Card>

        {data.refrigerantCircuit.circuitOpened && (
          <Card title="5. Vacuum / Evacuation" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-3">
              {VACUUM_EVACUATION_FIELDS.map((f) => (
                <MeasurementInput key={f.id} field={f} value={data.vacuumEvacuation[f.id]} onChange={(v) => set("vacuumEvacuation", { ...data.vacuumEvacuation, [f.id]: v })} />
              ))}
            </div>
          </Card>
        )}

        <Card title="6. Electrical Startup Measurements" defaultOpen={false}>
          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Outdoor Unit</p>
          <RatedActualTable fields={ELECTRICAL_FIELDS_OUTDOOR} values={data.electricalReadings.outdoor}
            onChange={(v) => set("electricalReadings", { ...data.electricalReadings, outdoor: v })} />
          <p className="text-xs font-bold text-gray-500 uppercase mb-1 mt-4">Indoor Unit</p>
          <RatedActualTable fields={ELECTRICAL_FIELDS_INDOOR} values={data.electricalReadings.indoor}
            onChange={(v) => set("electricalReadings", { ...data.electricalReadings, indoor: v })} />
        </Card>

        <Card title="7. Airflow & Temperature Performance" defaultOpen={false}>
          {isHeatPump && (
            <div className="mb-1">
              <Label>Mode</Label>
              <ChoiceRow value={airflowMode} options={["cooling", "heating"]} onChange={(v) => set("airflowPerformance", { ...data.airflowPerformance, mode: v as "cooling" | "heating" })} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {AIRFLOW_FIELDS.map((f) => (
              <MeasurementInput key={f.id} field={f} value={airflowValues[f.id]}
                onChange={(v) => set("airflowPerformance", { ...data.airflowPerformance, [airflowMode]: { ...airflowValues, [f.id]: v } })} />
            ))}
          </div>
        </Card>

        <Card title="8. Condensate Drain Test" defaultOpen={false}>
          <ChecklistSection items={data.drainTest} onChange={(v) => set("drainTest", v)} />
          <PhotoCategoryBlock jobId={jobId} category={STARTUP_PHOTO_CATEGORIES.DRAIN} label="📸 Completed Drainage Photo" minRequired={1}
            photos={photos.filter((p) => p.category === STARTUP_PHOTO_CATEGORIES.DRAIN)} onChanged={loadPhotos} />
        </Card>

        {(isFurnace || isHeatPump) && (
          <Card title="9. Heating Startup" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-3">
              {(isFurnace ? GAS_FURNACE_FIELDS : HEAT_PUMP_HEATING_FIELDS).map((f) => (
                <MeasurementInput key={f.id} field={f} value={data.heatingStartup[f.id]} onChange={(v) => set("heatingStartup", { ...data.heatingStartup, [f.id]: v })} />
              ))}
            </div>
          </Card>
        )}

        <Card title="10. Thermostat & Controls" defaultOpen={false}>
          <ChecklistSection items={data.thermostatControls} onChange={(v) => set("thermostatControls", v)} />
        </Card>

        <Card title="11. Final System Operational Test">
          {FINAL_TEST_ITEMS.map((item) => (
            <div key={item.key}>
              <Label>{item.label}</Label>
              <ChoiceRow value={data.finalTestResults[item.key] ?? null} options={item.options} onChange={(v) => set("finalTestResults", { ...data.finalTestResults, [item.key]: v })} />
            </div>
          ))}
          <div>
            <Label>Final Startup Result</Label>
            <div className="grid grid-cols-1 gap-2">
              {FINAL_STARTUP_RESULTS.map((r) => (
                <button key={r.value} type="button" onClick={() => set("finalStartupResult", r.value)}
                  className={`text-left px-3 py-2.5 rounded-xl text-sm font-semibold border ${data.finalStartupResult === r.value ? "border-2" : "border-gray-200"}`}
                  style={data.finalStartupResult === r.value ? { borderColor: r.color, color: r.color, background: `${r.color}10` } : undefined}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {(data.finalStartupResult === "FAILED" || data.finalStartupResult === "DO_NOT_OPERATE") && (
            <div>
              <Label>Explanation *</Label>
              <textarea value={data.failExplanation} onChange={(e) => set("failExplanation", e.target.value)} rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" />
            </div>
          )}
        </Card>

        <Card title="12. Required Installation Photos" defaultOpen={false}>
          {REQUIRED_STARTUP_PHOTO_LABELS.map(({ category, label }) => (
            <PhotoCategoryBlock key={category} jobId={jobId} category={category} label={label} minRequired={1}
              photos={photos.filter((p) => p.category === category)} onChanged={loadPhotos} />
          ))}
        </Card>

        <Card title="13. Technician Certification">
          <p className="text-xs text-gray-500 italic mb-2">
            I confirm that I performed the startup and commissioning checks documented above and that the measurements entered represent the readings observed at the time of startup.
          </p>
          {data.technicianSignatureUrl ? (
            <div className="flex items-center gap-2 text-xs text-green-600 font-semibold"><Check className="w-4 h-4" /> Signed</div>
          ) : (
            <SignaturePad onSubmit={async (signatureUrl) => { set("technicianCertified", true); set("technicianSignatureUrl", signatureUrl); }} />
          )}
        </Card>
      </fieldset>

      {missing.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-1.5">
          <p className="text-sm font-bold text-orange-700">⚠️ Startup form incomplete</p>
          <ul className="text-xs text-orange-700 list-disc list-inside space-y-0.5">
            {missing.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </div>
      )}
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {!locked && !approved && (
        <button type="button" onClick={submit} disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1B3FA8] text-white rounded-2xl font-bold disabled:opacity-40">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : needsRevision ? "Resubmit for Review" : "Submit for Supervisor Review"}
        </button>
      )}

      {approved && (
        <Card title="15. Customer Handover">
          {handoverDone ? (
            <div className="flex items-center gap-2 text-sm text-green-600 font-semibold"><Check className="w-4 h-4" /> Handover complete.</div>
          ) : (
            <>
              <ChecklistSection
                items={data.handoverChecklist}
                onChange={(v) => setData((prev) => ({ ...prev, handoverChecklist: v }))}
              />
              <div className="pt-2">
                <Label>Customer Signature</Label>
                <SignaturePad onSubmit={submitHandover} />
              </div>
              {handoverSubmitting && <p className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Completing handover…</p>}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
