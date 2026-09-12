"use client";
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Loader2, X } from "lucide-react";

type FieldType = "text" | "textarea" | "number" | "checkbox" | "select" | "date" | "media";

type ShowIf = { fieldId: string; values: string[] };

type FormField = { id: string; label: string; type: FieldType; options?: string[]; required?: boolean; showIf?: ShowIf | null; allowMedia?: boolean; mediaRequired?: boolean };
type FormItem = { id: string; name: string; taskCode?: string; price: number; opensFormSlug?: string };

type Template = {
  id: string; slug: string; name: string; category: string | null;
  fields: FormField[]; items: FormItem[]; isActive: boolean;
};

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "media", label: "Photo/Video" },
];

// A field can only depend on an earlier field whose value is a fixed choice
// (dropdown, checkbox) — free text/number/date/media values aren't meaningful
// to branch on.
const DEPENDABLE_TYPES: FieldType[] = ["select", "checkbox"];

function emptyField(): FormField {
  return { id: crypto.randomUUID(), label: "", type: "text", required: false };
}

function emptyItem(): FormItem {
  return { id: crypto.randomUUID(), name: "", taskCode: "", price: 0 };
}

export default function AdminServiceFormsPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [fields, setFields] = useState<FormField[]>([emptyField()]);
  const [items, setItems] = useState<FormItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/admin/form-templates").then((r) => r.json()).then((d) => { setTemplates(d.templates ?? []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  function resetForm() {
    setEditing(null); setName(""); setSlug(""); setCategory(""); setFields([emptyField()]); setItems([]); setShowForm(false); setError("");
  }

  function startEdit(t: Template) {
    setEditing(t);
    setName(t.name);
    setSlug(t.slug);
    setCategory(t.category ?? "");
    setFields(t.fields.length ? t.fields : [emptyField()]);
    setItems(t.items ?? []);
    setShowForm(true);
  }

  function updateField(index: number, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, patch: Partial<FormItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const cleanFields = fields.filter((f) => f.label.trim());
    const cleanItems = items.filter((it) => it.name.trim());
    try {
      const res = editing
        ? await fetch(`/api/admin/form-templates/${editing.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, category: category || null, fields: cleanFields, items: cleanItems }),
          })
        : await fetch("/api/admin/form-templates", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, slug, category: category || null, fields: cleanFields, items: cleanItems }),
          });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to save");
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this form template? Any submissions already filled out will be lost.")) return;
    await fetch(`/api/admin/form-templates/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Forms</h1>
          <p className="text-gray-500 text-sm mt-0.5">Custom forms technicians fill out per job (e.g. Clean and Check → First Visit)</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7921A] text-white rounded-lg text-sm font-semibold hover:bg-[#E07F10]">
          <Plus className="w-4 h-4" />New Form
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Form Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="First Visit" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Category (optional)</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Clean and Check Forms" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">
              Slug {editing ? "(fixed once created)" : "— must match the technician-app route"}
            </label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={!!editing}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono disabled:bg-gray-50" placeholder="clean-and-check-first-visit" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500 font-medium">Fields</label>
              <button type="button" onClick={() => setFields((prev) => [...prev, emptyField()])} className="text-xs font-semibold text-[#1B3FA8]">+ Add field</button>
            </div>
            <div className="space-y-2">
              {fields.map((field, i) => {
                const dependableFields = fields.filter((f, j) => j < i && DEPENDABLE_TYPES.includes(f.type) && f.label.trim());
                const dependsOn = fields.find((f) => f.id === field.showIf?.fieldId);
                return (
                <div key={field.id} className="border border-gray-100 rounded-lg p-2 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <input
                      value={field.label}
                      onChange={(e) => updateField(i, { label: e.target.value })}
                      placeholder="Field label"
                      className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(i, { type: e.target.value as FieldType })}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    >
                      {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {field.type === "select" && (
                      <input
                        value={field.options?.join(", ") ?? ""}
                        onChange={(e) => updateField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                        placeholder="Options, comma separated"
                        className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
                      />
                    )}
                    <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0 pt-2">
                      <input type="checkbox" checked={!!field.required} onChange={(e) => updateField(i, { required: e.target.checked })} />
                      Required
                    </label>
                    <button type="button" onClick={() => removeField(i)} className="p-1.5 text-gray-400 hover:text-red-600 shrink-0"><X className="w-4 h-4" /></button>
                  </div>

                  {field.type !== "media" && (
                    <div className="flex items-center gap-3 pl-1">
                      <label className="flex items-center gap-1 text-xs text-gray-500">
                        <input type="checkbox" checked={!!field.allowMedia} onChange={(e) => updateField(i, { allowMedia: e.target.checked, ...(e.target.checked ? {} : { mediaRequired: false }) })} />
                        Allow photo/video on this field
                      </label>
                      {field.allowMedia && (
                        <label className="flex items-center gap-1 text-xs text-gray-500">
                          <input type="checkbox" checked={!!field.mediaRequired} onChange={(e) => updateField(i, { mediaRequired: e.target.checked })} />
                          Photo/video required
                        </label>
                      )}
                    </div>
                  )}

                  {dependableFields.length > 0 && (
                    <div className="flex items-center gap-2 pl-1">
                      <span className="text-xs text-gray-400 shrink-0">Show only if</span>
                      <select
                        value={field.showIf?.fieldId ?? ""}
                        onChange={(e) => updateField(i, { showIf: e.target.value ? { fieldId: e.target.value, values: [] } : null })}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="">(always shown)</option>
                        {dependableFields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                      {field.showIf && (
                        <>
                          <span className="text-xs text-gray-400">is one of</span>
                          {dependsOn?.type === "select" && dependsOn.options?.length ? (
                            <select
                              multiple
                              value={field.showIf.values}
                              onChange={(e) => updateField(i, { showIf: { ...field.showIf!, values: Array.from(e.target.selectedOptions, (o) => o.value) } })}
                              className="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                            >
                              {dependsOn.options.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              value={field.showIf.values.join(", ")}
                              onChange={(e) => updateField(i, { showIf: { ...field.showIf!, values: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })}
                              placeholder="e.g. true, Yes"
                              className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1 text-xs"
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500 font-medium">Billable Items (shown with a price and a "+" to add to the invoice)</label>
              <button type="button" onClick={() => setItems((prev) => [...prev, emptyItem()])} className="text-xs font-semibold text-[#1B3FA8]">+ Add item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={item.id} className="border border-gray-100 rounded-lg p-2 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <input
                      value={item.name}
                      onChange={(e) => updateItem(i, { name: e.target.value })}
                      placeholder="Item name (e.g. Cleaning with Service Call)"
                      className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
                    />
                    <input
                      value={item.taskCode ?? ""}
                      onChange={(e) => updateItem(i, { taskCode: e.target.value })}
                      placeholder="Task code"
                      className="w-32 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-mono"
                    />
                    <input
                      type="number" step="0.01"
                      value={item.price}
                      onChange={(e) => updateItem(i, { price: parseFloat(e.target.value) || 0 })}
                      placeholder="Price"
                      className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm"
                    />
                    <button type="button" onClick={() => removeItem(i)} className="p-1.5 text-gray-400 hover:text-red-600 shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center gap-2 pl-1">
                    <span className="text-xs text-gray-400 shrink-0">Opens form (slug, optional — instead of adding to invoice)</span>
                    <input
                      value={item.opensFormSlug ?? ""}
                      onChange={(e) => updateItem(i, { opensFormSlug: e.target.value || undefined })}
                      placeholder="e.g. clean-and-check-inspection"
                      className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-mono"
                    />
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-xs text-gray-400">No items — this form will only show its fields, if any.</p>}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#1B3FA8] text-white rounded-lg text-sm font-semibold disabled:opacity-60">
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Form"}
            </button>
            <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-gray-900">{t.name}</p>
                <p className="text-sm text-gray-500">{t.category ? `${t.category} · ` : ""}{t.fields.length} field{t.fields.length === 1 ? "" : "s"} · {t.items.length} item{t.items.length === 1 ? "" : "s"} · <span className="font-mono text-xs">{t.slug}</span></p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(t)} className="p-2 text-gray-400 hover:text-[#1B3FA8]"><Edit className="w-4 h-4" /></button>
                <button onClick={() => deleteTemplate(t.id)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {templates.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No service forms configured yet</p>}
        </div>
      )}
    </div>
  );
}
