"use client";
import { useEffect, useMemo, useState } from "react";
import { MessageSquareText, Loader2, Save, Lock, RotateCcw, CheckCircle2 } from "lucide-react";
import {
  TEMPLATE_DEFS, TEMPLATE_KEYS, LANGS, LANG_LABEL, TEMPLATE_VARS, DEFAULT_BUSINESS_PHONE,
  fillTemplate, localDate, localWindow, type Lang, type TemplateKey, type TemplateOverrides,
} from "@/lib/notification-templates";

const SAMPLE_START = new Date(Date.now() + 86400000);
const sample = (lang: Lang): Record<string, string> => ({
  name: "Maria", number: "DH-2026-000123",
  service: lang === "fr" ? "entretien de climatisation" : lang === "es" ? "mantenimiento de aire acondicionado" : "AC tune-up",
  date: localDate(SAMPLE_START, lang), window: localWindow("8 AM - 10 AM", lang), tech: "James", link: "dada-house.com/track/…",
});

const segments = (s: string) => {
  const ucs2 = /[^\x00-\x7F’“”–—…]/.test(s) || /[’“”–—…]/.test(s);
  const per = ucs2 ? 70 : 160, multi = ucs2 ? 67 : 153;
  return s.length <= per ? 1 : Math.ceil(s.length / multi);
};

export default function CustomerMessages() {
  const [o, setO] = useState<TemplateOverrides | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [key, setKey] = useState<TemplateKey>("JOB_SCHEDULED");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/dispatch/customer-messages", { cache: "no-store" }).then(async (r) => {
      if (!r.ok) { setMsg({ text: "Could not load messages.", error: true }); return; }
      const d = await r.json();
      setO(d.overrides ?? {}); setCanEdit(d.canEdit);
    });
  }, []);

  const phone = o?.phone || DEFAULT_BUSINESS_PHONE;
  const def = TEMPLATE_DEFS[key];
  const tpl = o?.templates?.[key];
  const enabled = tpl?.enabled !== false;
  const textFor = (lang: Lang) => tpl?.text?.[lang] ?? "";

  const setTpl = (patch: { enabled?: boolean; lang?: Lang; text?: string }) => {
    setMsg(null);
    setO((cur) => {
      const c = cur ?? {};
      const t = { ...(c.templates?.[key] ?? {}) };
      if (patch.enabled !== undefined) t.enabled = patch.enabled;
      if (patch.lang) t.text = { ...(t.text ?? {}), [patch.lang]: patch.text ?? "" };
      return { ...c, templates: { ...(c.templates ?? {}), [key]: t } };
    });
  };

  const customized = useMemo(() => new Set(TEMPLATE_KEYS.filter((k) => {
    const t = o?.templates?.[k];
    return t?.enabled === false || Object.values(t?.text ?? {}).some((v) => v && v.trim());
  })), [o]);

  async function save() {
    if (!o) return;
    setSaving(true); setMsg(null);
    const r = await fetch("/api/dispatch/customer-messages", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) });
    const d = await r.json().catch(() => ({}));
    setSaving(false);
    setMsg(r.ok ? { text: "Saved — new texts are used right away." } : { text: d.error ?? "Could not save", error: true });
  }

  if (!o) return <div className="p-6 flex justify-center text-gray-500">{msg ? <p className="text-red-600">{msg.text}</p> : <Loader2 className="animate-spin" />}</div>;

  const ta = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm font-mono leading-relaxed disabled:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30";

  return (
    <div className="p-4 md:p-6 max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><MessageSquareText size={24} className="text-[#1B3FA8]" /> Customer Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          Texts sent to customers in their language (English, French or Spanish — set per customer on the job panel). Customers who replied STOP are never texted.
        </p>
        {!canEdit && <p className="mt-2 text-sm text-amber-700 flex items-center gap-1.5"><Lock size={14} /> View only — a manager or admin can edit these texts.</p>}
      </div>

      <div className="grid md:grid-cols-[260px_1fr] gap-5">
        <aside className="space-y-1">
          {TEMPLATE_KEYS.map((k) => (
            <button key={k} onClick={() => setKey(k)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${key === k ? "bg-[#1B3FA8] text-white font-bold" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
              {TEMPLATE_DEFS[k].label}
              {o.templates?.[k]?.enabled === false ? <span className="ml-1 text-[10px] opacity-80">(off)</span> : customized.has(k) ? <span className="ml-1 text-[10px] opacity-80">(edited)</span> : null}
            </button>
          ))}
          <div className="pt-3">
            <label className="block text-xs font-bold text-gray-600 mb-1">Business phone in texts ({"{phone}"})</label>
            <input disabled={!canEdit} value={o.phone ?? ""} placeholder={DEFAULT_BUSINESS_PHONE} onChange={(e) => setO({ ...o, phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </div>
        </aside>

        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900">{def.label}</h2>
              <p className="text-xs text-gray-500">{def.when}</p>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <input type="checkbox" disabled={!canEdit} checked={enabled} onChange={(e) => setTpl({ enabled: e.target.checked })} /> Send this message
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Placeholders: {[...def.vars, "phone"].map((v) => <code key={v} className="mx-0.5 px-1 rounded bg-gray-100 text-gray-700" title={TEMPLATE_VARS[v]}>{`{${v}}`}</code>)}
          </p>

          {LANGS.map((lang) => {
            const custom = textFor(lang);
            const body = custom.trim() ? custom : def.text[lang];
            const preview = fillTemplate(body, sample(lang), phone);
            return (
              <div key={lang} className={`rounded-lg border p-3 ${enabled ? "border-gray-200" : "border-dashed border-gray-200 opacity-60"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-bold text-gray-800">{LANG_LABEL[lang]} {custom.trim() ? <span className="text-[10px] font-semibold text-[#F7921A]">custom</span> : <span className="text-[10px] font-semibold text-gray-400">default</span>}</p>
                  {canEdit && custom.trim() && (
                    <button onClick={() => setTpl({ lang, text: "" })} className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-800"><RotateCcw size={12} /> Use default</button>
                  )}
                </div>
                <textarea rows={3} disabled={!canEdit} className={ta} value={custom.trim() ? custom : def.text[lang]}
                  onChange={(e) => setTpl({ lang, text: e.target.value === def.text[lang] ? "" : e.target.value })} />
                <div className="mt-2 rounded-lg bg-green-50 border border-green-100 px-3 py-2 text-sm text-gray-800">
                  <span className="text-[10px] font-bold uppercase text-green-700 block mb-0.5">Preview</span>{preview}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">{preview.length} characters · about {segments(preview)} SMS segment{segments(preview) > 1 ? "s" : ""}</p>
              </div>
            );
          })}
          <p className="text-[11px] text-gray-500">Payment-link texts (diagnostic fee, invoices, receipts) are still sent in English for now.</p>

          {msg && <p className={`text-sm flex items-center gap-1.5 ${msg.error ? "text-red-600" : "text-green-700"}`}>{!msg.error && <CheckCircle2 size={15} />}{msg.text}</p>}
          {canEdit && (
            <div className="flex justify-end">
              <button onClick={save} disabled={saving} className="px-5 py-2 rounded-lg bg-[#1B3FA8] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save messages
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
