"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, FolderKanban, Plus, X, Check } from "lucide-react";

type ProjectItem = {
  id: string; name: string; description: string | null; status: string; createdAt: string;
  _count: { appointments: number };
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  ON_HOLD: "bg-orange-100 text-orange-700",
};

export default function TechProjectsPage() {
  const { id } = useParams<{ id: string }>();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [linkCurrentJob, setLinkCurrentJob] = useState(true);

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}/projects`)
      .then((r) => r.json())
      .then((d) => { if (d.projects) setProjects(d.projects); setCurrentProjectId(d.currentProjectId ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/technician/jobs/${id}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, linkCurrentJob }),
    });
    if (res.ok) {
      setName(""); setDescription(""); setLinkCurrentJob(true);
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  async function linkJobTo(projectId: string | null) {
    await fetch(`/api/technician/jobs/${id}/projects`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    setCurrentProjectId(projectId);
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job</Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-xl font-bold text-gray-900">Projects</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B3FA8] text-white rounded-lg text-sm font-semibold"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Cancel" : "New"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Group related jobs for this customer under one project.</p>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name (e.g. Whole-home rewire)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" required />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description (optional)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={linkCurrentJob} onChange={(e) => setLinkCurrentJob(e.target.checked)} />
            Link this job to the new project
          </label>
          <button type="submit" disabled={saving || !name.trim()} className="w-full py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold disabled:opacity-60">
            {saving ? "Saving…" : "Create Project"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#1B3FA8]" /></div>
      ) : projects.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">No projects for this customer yet.</p>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => {
            const isLinked = currentProjectId === p.id;
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-[#1B3FA8]" />
                    <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-600"}`}>{p.status}</span>
                </div>
                {p.description && <p className="text-sm text-gray-600 mt-1.5">{p.description}</p>}
                <p className="text-xs text-gray-400 mt-1.5">{p._count.appointments} linked job{p._count.appointments === 1 ? "" : "s"}</p>
                <button
                  onClick={() => linkJobTo(isLinked ? null : p.id)}
                  className={`mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold ${isLinked ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-600"}`}
                >
                  {isLinked && <Check className="w-3.5 h-3.5" />}
                  {isLinked ? "This job is linked" : "Link this job"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
