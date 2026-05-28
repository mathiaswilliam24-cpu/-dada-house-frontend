"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoUploader from "@/components/admin/photo-uploader";
import { X, UserCircle } from "lucide-react";

interface Technician {
  id: string;
  name: string;
  role: string;
  specialties: string[];
  phone: string | null;
  email: string | null;
  photo: string | null;
  bio: string | null;
  available: boolean;
  sortOrder: number;
}

interface Props {
  technician?: Technician;
  onClose: () => void;
}

export default function TechnicianForm({ technician, onClose }: Props) {
  const router = useRouter();
  const isEdit = !!technician;

  const [form, setForm] = useState({
    name: technician?.name ?? "",
    role: technician?.role ?? "",
    specialties: technician?.specialties.join(", ") ?? "",
    phone: technician?.phone ?? "",
    email: technician?.email ?? "",
    photo: technician?.photo ?? "",
    bio: technician?.bio ?? "",
    available: technician?.available ?? true,
    sortOrder: technician?.sortOrder ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form, v: string | boolean | number) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
      phone: form.phone || null,
      email: form.email || null,
      photo: form.photo || null,
      bio: form.bio || null,
    };

    const url = isEdit ? `/api/admin/technicians/${technician.id}` : "/api/admin/technicians";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Error saving technician");
      setSaving(false);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-[#1B3FA8]">
            {isEdit ? "Edit Technician" : "Add Technician"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
          )}

          {/* Photo */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Profile Photo</label>
            {form.photo ? (
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 group mx-auto">
                <img src={form.photo} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => set("photo", "")}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            ) : (
              <div>
                <PhotoUploader
                  endpoint="technicianPhoto"
                  remaining={1}
                  maxFiles={1}
                  onUpload={(urls) => { if (urls[0]) set("photo", urls[0]); }}
                  onError={(msg) => setError(msg)}
                />
              </div>
            )}
          </div>

          {/* Name + Role */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Role / Title *</label>
              <input
                required
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
                placeholder="Senior Plumber"
              />
            </div>
          </div>

          {/* Specialties */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Specialties (comma-separated)</label>
            <input
              value={form.specialties}
              onChange={(e) => set("specialties", e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
              placeholder="e.g. Pipe Repair, Water Heaters, Drain Cleaning"
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
                placeholder="+1 (346) 649-9353"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
                placeholder="tech@mydadahouse.com"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Bio</label>
            <textarea
              rows={3}
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8] resize-none"
              placeholder="Brief description of experience and background..."
            />
          </div>

          {/* Sort order + Available */}
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
                  checked={form.available}
                  onChange={(e) => set("available", e.target.checked)}
                  className="w-4 h-4 accent-[#1B3FA8]"
                />
                <span className="text-sm font-semibold text-slate-700">Available</span>
              </label>
            </div>
          </div>

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
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Technician"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
