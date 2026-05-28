"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoUploader from "@/components/admin/photo-uploader";
import { X, ImageIcon, Images } from "lucide-react";

interface GalleryProject {
  id: string;
  title: string;
  category: string;
  location: string;
  date: string;
  description: string;
  tags: string[];
  images: string[];
  published: boolean;
  sortOrder: number;
}

interface Props {
  project?: GalleryProject;
  onClose: () => void;
}

const CATEGORIES = [
  { value: "PLUMBING", label: "Plumbing" },
  { value: "AIR_CONDITIONING", label: "Air Conditioning" },
  { value: "HEATING", label: "Heating" },
  { value: "REMODELING", label: "Remodeling" },
];

export default function GalleryForm({ project, onClose }: Props) {
  const router = useRouter();
  const isEdit = !!project;

  const [form, setForm] = useState({
    title: project?.title ?? "",
    category: project?.category ?? "PLUMBING",
    location: project?.location ?? "",
    date: project?.date ?? "",
    description: project?.description ?? "",
    tags: project?.tags.join(", ") ?? "",
    images: project?.images ?? [] as string[],
    published: project?.published ?? true,
    sortOrder: project?.sortOrder ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: unknown) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  function removeImage(idx: number) {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };

    const url = isEdit ? `/api/admin/gallery/${project.id}` : "/api/admin/gallery";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error saving project");
      setSaving(false);
      return;
    }

    router.refresh();
    onClose();
  }

  const remaining = 10 - form.images.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-[#1B3FA8]">
            {isEdit ? "Edit Project" : "Add New Project"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
          )}

          {/* Photos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">
                Project Photos
              </label>
              <span className="text-xs text-slate-400">
                {form.images.length}/10 photos
              </span>
            </div>

            {/* Preview grid */}
            {form.images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                {form.images.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200">
                    <img src={url} alt={`photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <X size={10} />
                    </button>
                    {idx === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-[#1B3FA8]/80 text-white text-[9px] font-bold text-center py-0.5">
                        COVER
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload */}
            {remaining > 0 ? (
              <PhotoUploader
                endpoint="galleryPhoto"
                remaining={remaining}
                maxFiles={10}
                onUpload={(urls) =>
                  setForm((prev) => ({
                    ...prev,
                    images: [...prev.images, ...urls].slice(0, 10),
                  }))
                }
                onError={(msg) => setError(msg)}
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                <ImageIcon size={14} />
                Maximum 10 photos reached. Remove one to add another.
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
              placeholder="e.g. Complete Bathroom Renovation"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Category *</label>
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8] bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Location + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Location *</label>
              <input
                required
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
                placeholder="e.g. Katy, TX"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Date *</label>
              <input
                required
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
                placeholder="e.g. March 2025"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Description *</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8] resize-none"
              placeholder="Describe the project in detail..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
              placeholder="e.g. PEX Piping, Fixtures, Renovation"
            />
          </div>

          {/* Sort order + Published */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => set("published", e.target.checked)}
                  className="w-4 h-4 accent-[#1B3FA8]"
                />
                <span className="text-sm font-semibold text-slate-700">Published (visible on site)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#1B3FA8] text-white text-sm font-bold hover:bg-[#1A3490] disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
