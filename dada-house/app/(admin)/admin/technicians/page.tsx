"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, HardHat, Phone, Mail, CheckCircle, XCircle, UserCircle } from "lucide-react";
import TechnicianForm from "@/components/admin/technician-form";

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

export default function AdminTechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Technician | undefined>();
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/technicians");
      const data = await res.json();
      setTechnicians(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Technicians load error:", err);
      setTechnicians([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleAvailable(tech: Technician) {
    await fetch(`/api/admin/technicians/${tech.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !tech.available }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this technician? This cannot be undone.")) return;
    setDeleting(id);
    await fetch(`/api/admin/technicians/${id}`, { method: "DELETE" });
    setDeleting(null);
    load();
  }

  function openAdd() { setEditing(undefined); setShowForm(true); }
  function openEdit(t: Technician) { setEditing(t); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditing(undefined); load(); }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-[#1B3FA8] flex items-center gap-2">
            <HardHat size={24} />
            Technicians
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {technicians.filter((t) => t.available).length} available · {technicians.length} total
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1B3FA8] text-white text-sm font-bold rounded-xl hover:bg-[#1A3490] transition-colors shadow-lg"
        >
          <Plus size={16} />
          Add Technician
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 flex gap-4 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-1/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : technicians.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-300">
          <HardHat size={48} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold">No technicians yet</p>
          <p className="text-slate-400 text-sm mt-1">Click "Add Technician" to add your first team member.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {technicians.map((tech) => (
            <div
              key={tech.id}
              className={`bg-white rounded-2xl border p-5 flex flex-col sm:flex-row gap-4 shadow-sm hover:shadow-md transition-shadow ${tech.available ? "border-slate-200" : "border-dashed border-slate-300 opacity-70"}`}
            >
              {/* Avatar */}
              <div className="shrink-0">
                {tech.photo ? (
                  <img src={tech.photo} alt={tech.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-200" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#1B3FA8]/10 flex items-center justify-center border-2 border-[#1B3FA8]/20">
                    <UserCircle size={32} className="text-[#1B3FA8]/40" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-bold text-[#1B3FA8] text-base">{tech.name}</h3>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${tech.available ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {tech.available ? <CheckCircle size={10} /> : <XCircle size={10} />}
                    {tech.available ? "Available" : "Unavailable"}
                  </span>
                </div>
                <p className="text-slate-500 text-sm font-medium mb-2">{tech.role}</p>

                {tech.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tech.specialties.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-[#1B3FA8]/10 text-[#1B3FA8] text-xs rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                  {tech.phone && (
                    <a href={`tel:${tech.phone}`} className="flex items-center gap-1 hover:text-[#F7921A] transition-colors">
                      <Phone size={11} />
                      {tech.phone}
                    </a>
                  )}
                  {tech.email && (
                    <a href={`mailto:${tech.email}`} className="flex items-center gap-1 hover:text-[#F7921A] transition-colors">
                      <Mail size={11} />
                      {tech.email}
                    </a>
                  )}
                </div>

                {tech.bio && (
                  <p className="text-slate-400 text-xs mt-2 line-clamp-2">{tech.bio}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex sm:flex-col items-center gap-2 shrink-0">
                <button
                  onClick={() => openEdit(tech)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1B3FA8]/10 text-[#1B3FA8] text-xs font-bold hover:bg-[#1B3FA8]/20 transition-colors"
                >
                  <Pencil size={12} />
                  Edit
                </button>
                <button
                  onClick={() => toggleAvailable(tech)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold hover:bg-slate-200 transition-colors"
                  title={tech.available ? "Mark unavailable" : "Mark available"}
                >
                  {tech.available ? <XCircle size={12} /> : <CheckCircle size={12} />}
                  {tech.available ? "Unavailable" : "Available"}
                </button>
                <button
                  onClick={() => handleDelete(tech.id)}
                  disabled={deleting === tech.id}
                  className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <TechnicianForm technician={editing} onClose={closeForm} />
      )}
    </div>
  );
}
