"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Plus, Tag, ChevronRight, Camera, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useEstimateItems } from "@/lib/hooks/use-estimate-items";
import { useUploadThing } from "@/lib/uploadthing-components";

// Items with this exact name open the Performance Plan Contract flow
// (plan + system count/type, then the e-signature page) instead of being
// added straight to the invoice like a normal price-book item.
const CONTRACT_LINK_ITEMS = new Set(["Performance Plan Contract"]);

type ShowIf = { fieldId: string; values: string[] };
type FormField = { id: string; label: string; type: string; options?: string[]; required?: boolean; showIf?: ShowIf | null; allowMedia?: boolean; mediaRequired?: boolean };
type FormItem = { id: string; name: string; taskCode?: string; price: number; opensFormSlug?: string };
type Template = { id: string; name: string; fields: FormField[]; items: FormItem[] };

function fieldVisible(field: FormField, values: Record<string, unknown>): boolean {
  if (!field.showIf) return true;
  const current = values[field.showIf.fieldId];
  return field.showIf.values.includes(
    typeof current === "boolean" ? String(current) : (current as string) ?? ""
  );
}

function MediaField({ value, onChange, compact, required }: { value: string[]; onChange: (urls: string[]) => void; compact?: boolean; required?: boolean }) {
  const [uploading, setUploading] = useState(false);
  const { startUpload } = useUploadThing("jobPhotos", {
    onClientUploadComplete: (res) => {
      setUploading(false);
      if (res?.length) {
        const urls = res.map((f) => (f as unknown as Record<string, string>).ufsUrl ?? (f as unknown as Record<string, string>).url).filter(Boolean);
        onChange([...value, ...urls]);
      }
    },
    onUploadError: () => setUploading(false),
  });

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <label className={`flex items-center justify-center w-8 h-8 rounded-lg border cursor-pointer shrink-0 ${value.length > 0 ? "bg-blue-50 border-blue-200 text-[#1B3FA8]" : required ? "border-red-200 text-red-400" : "border-gray-200 text-gray-400"}`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => { if (e.target.files?.length) { setUploading(true); startUpload(Array.from(e.target.files)); } e.target.value = ""; }}
          />
        </label>
        {value.length > 0 && (
          <div className="flex gap-1">
            {value.map((url) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-200" />
                <button type="button" onClick={() => onChange(value.filter((u) => u !== url))} className="absolute -top-1 -right-1 bg-gray-700 rounded-full p-0.5">
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {value.map((url) => (
            <div key={url} className="relative">
              <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
              <button type="button" onClick={() => onChange(value.filter((u) => u !== url))} className="absolute -top-1.5 -right-1.5 bg-gray-700 rounded-full p-0.5">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="inline-flex items-center gap-1.5 px-3 py-2 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-500 cursor-pointer">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        {uploading ? "Uploading…" : "Choose Media"}
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => { if (e.target.files?.length) { setUploading(true); startUpload(Array.from(e.target.files)); } e.target.value = ""; }}
        />
      </label>
    </div>
  );
}

export function DynamicForm({ jobId, slug, estimateId }: { jobId: string; slug: string; estimateId?: string | null }) {
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const { addItem } = useEstimateItems(estimateId ?? null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/technician/jobs/${jobId}/forms/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        setTemplate(d.template);
        setValues(d.submission?.values ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [jobId, slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    const missingMedia = (template?.fields ?? []).find(
      (f) => f.type !== "media" && f.allowMedia && f.mediaRequired && fieldVisible(f, values) && !((values[`${f.id}__media`] as string[])?.length)
    );
    if (missingMedia) {
      setSubmitError(`A photo/video is required for "${missingMedia.label}".`);
      return;
    }
    setSaving(true);
    setSaved(false);
    await fetch(`/api/technician/jobs/${jobId}/forms/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    setSaving(false);
    setSaved(true);
  }

  async function handleAddItem(item: FormItem) {
    if (!estimateId || addingId) return;
    setAddingId(item.id);
    const ok = await addItem({ name: item.name, price: item.price });
    if (ok) setAddedIds((prev) => new Set(prev).add(item.id));
    setAddingId(null);
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#1B3FA8]" /></div>;
  }

  if (!template) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-500">This form isn't configured yet.</p>
        <p className="text-xs text-gray-400 mt-1">The super admin needs to set it up in Admin → Service Forms.</p>
      </div>
    );
  }

  const visibleFields = template.fields.filter((f) => fieldVisible(f, values));

  return (
    <div className="space-y-4">
      {visibleFields.length > 0 && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          {visibleFields.map((field) => (
            <div key={field.id}>
              <label className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-2">
                <span>{field.label}{field.required && <span className="text-red-500"> *</span>}</span>
                {field.type !== "media" && field.allowMedia && (
                  <MediaField
                    compact
                    required={field.mediaRequired}
                    value={(values[`${field.id}__media`] as string[]) ?? []}
                    onChange={(urls) => setValues((v) => ({ ...v, [`${field.id}__media`]: urls }))}
                  />
                )}
              </label>
              {field.type === "media" ? (
                <MediaField
                  value={(values[field.id] as string[]) ?? []}
                  onChange={(urls) => setValues((v) => ({ ...v, [field.id]: urls }))}
                />
              ) : field.type === "textarea" ? (
                <textarea
                  required={field.required}
                  value={(values[field.id] as string) ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
                />
              ) : field.type === "select" ? (
                <select
                  required={field.required}
                  value={(values[field.id] as string) ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : field.type === "checkbox" ? (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!values[field.id]}
                    onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.checked }))}
                  />
                  Yes
                </label>
              ) : (
                <input
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  required={field.required}
                  value={(values[field.id] as string) ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              )}
            </div>
          ))}

          {submitError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{submitError}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
            {saving ? "Saving…" : saved ? "Saved" : "Save Form"}
          </button>
        </form>
      )}

      {template.items.length > 0 && (
        <>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Items</p>
          <div className="grid grid-cols-2 gap-2">
            {template.items.map((item) => {
              const added = addedIds.has(item.id);
              const opensContract = CONTRACT_LINK_ITEMS.has(item.name);
              const opensForm = item.opensFormSlug;
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-2">
                  <Tag className="w-6 h-6 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  {item.taskCode && <p className="text-xs text-gray-400">{item.taskCode}</p>}
                  <p className="text-sm text-[#1B3FA8] font-bold">{formatCurrency(item.price)}</p>
                  {opensContract || opensForm ? (
                    <button
                      onClick={() => router.push(
                        opensContract
                          ? `/technician/jobs/${jobId}/performance-plan-contract`
                          : `/technician/jobs/${jobId}/invoice/add-items/service-forms/${opensForm}${estimateId ? `?estimateId=${estimateId}` : ""}`
                      )}
                      className="self-start flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#1B3FA8] text-white text-xs font-semibold"
                    >
                      Open <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddItem(item)}
                      disabled={addingId === item.id || added || !estimateId}
                      className={`self-start flex items-center justify-center w-8 h-8 rounded-full ${added ? "bg-green-100 text-green-700" : "bg-[#1B3FA8] text-white"} disabled:opacity-60`}
                    >
                      {addingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {template.fields.length === 0 && template.items.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Nothing configured yet for {template.name}.</p>
          <p className="text-xs text-gray-400 mt-1">Add fields and/or items in Admin → Service Forms.</p>
        </div>
      )}
    </div>
  );
}
