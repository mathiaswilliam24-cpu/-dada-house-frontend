"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Images, Droplets, Wind, Flame, Hammer } from "lucide-react";
import GalleryForm from "@/components/admin/gallery-form";

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
  createdAt: string;
}

const CATEGORY_LABEL: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  PLUMBING:         { label: "Plumbing",          icon: Droplets, color: "text-blue-600 bg-blue-50" },
  AIR_CONDITIONING: { label: "Air Conditioning",   icon: Wind,     color: "text-cyan-600 bg-cyan-50" },
  HEATING:          { label: "Heating",            icon: Flame,    color: "text-orange-600 bg-orange-50" },
  REMODELING:       { label: "Remodeling",         icon: Hammer,   color: "text-emerald-600 bg-emerald-50" },
};

export default function AdminGalleryPage() {
  const [projects, setProjects] = useState<GalleryProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GalleryProject | undefined>();
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/gallery");
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Gallery load error:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function togglePublish(project: GalleryProject) {
    await fetch(`/api/admin/gallery/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !project.published }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeleting(id);
    await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  function openAdd() { setEditing(undefined); setShowForm(true); }
  function openEdit(p: GalleryProject) { setEditing(p); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(undefined); load(); }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-[#1B3FA8] flex items-center gap-2">
            <Images size={24} />
            Project Gallery
          </h1>
          <p className="text-slate-500 text-sm mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""} total</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1B3FA8] text-white text-sm font-bold rounded-xl hover:bg-[#1A3490] transition-colors shadow-lg"
        >
          <Plus size={16} />
          Add Project
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
              <div className="h-40 bg-slate-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-300">
          <Images size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">No projects yet</p>
          <p className="text-slate-400 text-sm mt-1">Click "Add Project" to publish your first gallery entry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const cat = CATEGORY_LABEL[project.category];
            const Icon = cat?.icon ?? Images;
            return (
              <div
                key={project.id}
                className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${project.published ? "border-slate-200" : "border-dashed border-slate-300 opacity-70"}`}
              >
                {/* Photo */}
                <div className="relative h-40 bg-slate-100">
                  {project.images[0] ? (
                    <img src={project.images[0]} alt={project.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                      <Icon size={40} className="text-slate-300" />
                    </div>
                  )}
                  {/* Published badge */}
                  <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold ${project.published ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>
                    {project.published ? "Published" : "Hidden"}
                  </div>
                  {project.images.length > 1 && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-xs font-bold">
                      {project.images.length} photos
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  {cat && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mb-2 ${cat.color}`}>
                      <Icon size={10} />
                      {cat.label}
                    </span>
                  )}
                  <h3 className="font-bold text-[#1B3FA8] text-sm leading-snug mb-1 line-clamp-2">{project.title}</h3>
                  <p className="text-slate-400 text-xs mb-3">{project.location} · {project.date}</p>
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => openEdit(project)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#1B3FA8]/10 text-[#1B3FA8] text-xs font-bold hover:bg-[#1B3FA8]/20 transition-colors"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => togglePublish(project)}
                      className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                      title={project.published ? "Hide from site" : "Publish to site"}
                    >
                      {project.published ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      disabled={deleting === project.id}
                      className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <GalleryForm project={editing} onClose={closeForm} />
      )}
    </div>
  );
}
