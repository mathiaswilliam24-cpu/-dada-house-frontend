"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckSquare, Loader2, CheckCircle2, Circle } from "lucide-react";

type ChecklistItem = { key: string; label: string; checked: boolean; note: string };
type Checklist = { id: string; serviceType: string; items: ChecklistItem[]; completedAt: string | null };

export default function ChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}/checklist`)
      .then((r) => r.json())
      .then((d) => { if (d.checklist) setChecklist(d.checklist); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function toggle(key: string) {
    setChecklist((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.key === key ? { ...item, checked: !item.checked } : item
        ),
      };
    });
  }

  function setNote(key: string, note: string) {
    setChecklist((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.key === key ? { ...item, note } : item
        ),
      };
    });
  }

  async function save() {
    if (!checklist) return;
    setSaving(true);
    await fetch(`/api/technician/jobs/${id}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: checklist.items }),
    });
    setSaving(false);
    load();
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;

  const completed = checklist?.items.filter((i) => i.checked).length ?? 0;
  const total = checklist?.items.length ?? 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job Detail</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-green-600" /> Service Checklist
        </h1>
        {checklist && (
          <p className="text-xs text-gray-500 mt-0.5">{checklist.serviceType}</p>
        )}
      </div>

      {/* Progress */}
      {checklist && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-900">{completed}/{total} completed</span>
            <span className={`font-bold ${progress === 100 ? "text-green-600" : "text-[#1B3FA8]"}`}>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progress === 100 ? "bg-green-500" : "bg-[#1B3FA8]"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          {checklist.completedAt && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Checklist completed
            </div>
          )}
        </div>
      )}

      {/* Items */}
      {checklist?.items.map((item) => (
        <div
          key={item.key}
          className={`bg-white rounded-2xl border p-4 space-y-2 transition-all ${item.checked ? "border-green-200 bg-green-50" : "border-gray-200"}`}
        >
          <button
            className="flex items-center gap-3 w-full text-left"
            onClick={() => toggle(item.key)}
          >
            {item.checked
              ? <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              : <Circle className="w-6 h-6 text-gray-300 shrink-0" />}
            <span className={`text-sm font-medium ${item.checked ? "line-through text-gray-400" : "text-gray-800"}`}>
              {item.label}
            </span>
          </button>
          {item.checked && (
            <input
              value={item.note}
              onChange={(e) => setNote(item.key, e.target.value)}
              placeholder="Add note (optional)…"
              className="w-full ml-9 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#1B3FA8]"
            />
          )}
        </div>
      ))}

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3.5 bg-[#1B3FA8] text-white rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Checklist"}
      </button>
    </div>
  );
}
