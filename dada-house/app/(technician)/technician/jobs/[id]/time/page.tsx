"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Timer, Loader2, CheckCircle, Clock } from "lucide-react";

type TimeLog = {
  id?: string;
  arrivedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  totalMinutes?: number | null;
};

function toLocalDatetimeInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TimeLogPage() {
  const { id } = useParams<{ id: string }>();
  const [log, setLog] = useState<TimeLog>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ arrivedAt: "", startedAt: "", completedAt: "" });

  const load = useCallback(() => {
    fetch(`/api/technician/jobs/${id}/time-log`)
      .then((r) => r.json())
      .then((d) => {
        if (d.timeLog) {
          setLog(d.timeLog);
          setForm({
            arrivedAt: toLocalDatetimeInput(d.timeLog.arrivedAt),
            startedAt: toLocalDatetimeInput(d.timeLog.startedAt),
            completedAt: toLocalDatetimeInput(d.timeLog.completedAt),
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function stampNow(field: keyof typeof form) {
    const now = toLocalDatetimeInput(new Date().toISOString());
    setForm((f) => ({ ...f, [field]: now }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/technician/jobs/${id}/time-log`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        arrivedAt: form.arrivedAt ? new Date(form.arrivedAt).toISOString() : null,
        startedAt: form.startedAt ? new Date(form.startedAt).toISOString() : null,
        completedAt: form.completedAt ? new Date(form.completedAt).toISOString() : null,
      }),
    });
    if (res.ok) { const d = await res.json(); setLog(d.timeLog); }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Link href={`/technician/jobs/${id}`} className="text-sm text-gray-500">← Job Detail</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
          <Timer className="w-5 h-5 text-yellow-600" /> Time Log
        </h1>
      </div>

      {/* Duration summary */}
      {log.totalMinutes != null && (
        <div className="bg-[#1B3FA8] rounded-2xl p-5 text-white text-center">
          <p className="text-sm text-blue-200 mb-1">Total Job Duration</p>
          <p className="text-4xl font-black">{formatMinutes(log.totalMinutes)}</p>
        </div>
      )}

      {/* Time fields */}
      <div className="space-y-3">
        {(["arrivedAt", "startedAt", "completedAt"] as const).map((field) => {
          const LABELS = { arrivedAt: "Arrival Time", startedAt: "Work Started", completedAt: "Work Completed" };
          const ICONS = { arrivedAt: "🚗", startedAt: "🔧", completedAt: "✅" };
          return (
            <div key={field} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                <span>{ICONS[field]}</span> {LABELS[field]}
              </label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1B3FA8]"
                />
                <button
                  onClick={() => stampNow(field)}
                  className="px-3 py-2 bg-[#1B3FA8] text-white rounded-xl text-xs font-bold shrink-0"
                >
                  Now
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Computed duration preview */}
      {form.startedAt && form.completedAt && (
        <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
          <Clock className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-yellow-700 font-medium">
            Duration: {formatMinutes(Math.max(0, Math.round(
              (new Date(form.completedAt).getTime() - new Date(form.startedAt).getTime()) / 60000
            )))}
          </span>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3.5 bg-[#1B3FA8] text-white rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          : <><CheckCircle className="w-4 h-4" /> Save Time Log</>
        }
      </button>
    </div>
  );
}
