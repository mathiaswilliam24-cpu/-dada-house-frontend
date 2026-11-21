"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Loader2, Plus, Trash2, Pencil, HelpCircle, Check, X } from "lucide-react";

type Entry = { id: string; question: string; answer: string; keywords: string[]; updatedAt: string; updatedBy?: string | null };
type Unanswered = { id: string; question: string; callerPhone?: string | null; callerName?: string | null; at: string; status: "OPEN" | "ANSWERED" | "DISMISSED" };
type Form = { id?: string; question: string; answer: string; keywords: string; unansweredId?: string };

const EMPTY: Form = { question: "", answer: "", keywords: "" };
const when = (s: string) => new Date(s).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function AiReceptionistPage() {
  const [facts, setFacts] = useState<Record<string, unknown> | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [unanswered, setUnanswered] = useState<Unanswered[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/voice-knowledge");
    if (r.ok) { const d = await r.json(); setFacts(d.facts); setEntries(d.entries); setUnanswered(d.unanswered); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(body: unknown) {
    setSaving(true); setError("");
    const r = await fetch("/api/admin/voice-knowledge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) { setError(d.error ?? "Could not save"); return false; }
    await load();
    return true;
  }

  async function save() {
    if (!form) return;
    const ok = await post({ action: "save", id: form.id, question: form.question, answer: form.answer, keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean), unansweredId: form.unansweredId });
    if (ok) setForm(null);
  }

  const open = unanswered.filter((u) => u.status === "OPEN");
  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Bot className="w-6 h-6 text-[#1B3FA8]" /> AI receptionist — knowledge</h1>
        <p className="text-sm text-gray-500 mt-1">Sarah answers callers only with the system facts below and the answers you write here. When she doesn&apos;t know, she says so, logs the question and transfers the call. Answer those questions here and she will know them on the next call.</p>
      </div>

      {/* Unanswered */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-900 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-orange-500" /> Questions Sarah could not answer ({open.length})</h2>
        {open.length === 0 && <p className="text-sm text-gray-400 mt-2">Nothing waiting.</p>}
        <div className="divide-y divide-gray-100 mt-2">
          {open.map((u) => (
            <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">“{u.question}”</p>
                <p className="text-xs text-gray-400">{when(u.at)}{u.callerName ? ` · ${u.callerName}` : ""}{u.callerPhone ? ` · ${u.callerPhone}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setForm({ ...EMPTY, question: u.question, unansweredId: u.id })} className="px-3 py-1.5 bg-[#1B3FA8] text-white rounded-lg text-xs font-bold">Answer</button>
                <button onClick={() => post({ action: "dismiss", unansweredId: u.id })} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600">Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Q&A */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Office answers ({entries.length})</h2>
          <button onClick={() => setForm({ ...EMPTY })} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F7921A] text-white rounded-lg text-sm font-bold"><Plus className="w-4 h-4" /> Add</button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Examples: service areas, warranty, financing, payment methods, cancellation policy, brands installed, permits. Write the exact answer you want Sarah to give.</p>
        {entries.length === 0 && <p className="text-sm text-gray-400 mt-3">No answers yet.</p>}
        <div className="divide-y divide-gray-100 mt-2">
          {entries.map((e) => (
            <div key={e.id} className="py-3 flex gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{e.question}</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{e.answer}</p>
                <p className="text-xs text-gray-400 mt-0.5">{e.keywords.length ? `Keywords: ${e.keywords.join(", ")} · ` : ""}Updated {when(e.updatedAt)}{e.updatedBy ? ` by ${e.updatedBy}` : ""}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setForm({ id: e.id, question: e.question, answer: e.answer, keywords: e.keywords.join(", ") })} className="p-2 text-gray-500 hover:text-[#1B3FA8]" title="Edit"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => confirm("Delete this answer?") && post({ action: "delete", id: e.id })} className="p-2 text-gray-500 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* System facts */}
      <section className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-900">Facts Sarah reads from the system</h2>
        <p className="text-xs text-gray-500 mb-2">Change them where they live (dispatch settings for hours, plan settings for prices).</p>
        <dl className="text-sm space-y-1.5">
          {facts && Object.entries(facts).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[140px_1fr] gap-2">
              <dt className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, " $1").toLowerCase()}</dt>
              <dd className="text-gray-800">{Array.isArray(v) ? v.join(" · ") : String(v)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {form && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !saving && setForm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{form.id ? "Edit answer" : "New answer"}</h3>
              <button onClick={() => setForm(null)}><X className="w-5 h-5" /></button>
            </div>
            <label className="block text-sm font-semibold">Question callers ask
              <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-normal" placeholder="Do you offer financing?" />
            </label>
            <label className="block text-sm font-semibold">Answer Sarah gives
              <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={5} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-normal" />
            </label>
            <label className="block text-sm font-semibold">Keywords (optional, comma separated)
              <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-normal" placeholder="financing, payment plan, credit" />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button onClick={save} disabled={saving || form.question.trim().length < 3 || form.answer.trim().length < 2} className="w-full py-2.5 bg-[#1B3FA8] text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
