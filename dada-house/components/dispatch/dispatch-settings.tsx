"use client";
import { useEffect, useState } from "react";
import { Loader2, Save, Settings2, RotateCcw, Lock, CheckCircle2 } from "lucide-react";

type Day = { start: string; end: string } | null;
type Week = Record<"sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat", Day>;
type Config = {
  boardStart: string; boardEnd: string; businessHours: Week; defaultMinutes: Record<string, number>;
  travelBufferMinutes: number; arrivalWindowHours: number;
};
type Data = { config: Config; defaults: Config; jobTypes: Record<string, { label: string; color: string }>; canEdit: boolean };

const DAYS: { key: keyof Week; label: string }[] = [
  { key: "mon", label: "Monday" }, { key: "tue", label: "Tuesday" }, { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" }, { key: "fri", label: "Friday" }, { key: "sat", label: "Saturday" }, { key: "sun", label: "Sunday" },
];

const toHM = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`;

export default function DispatchSettings() {
  const [data, setData] = useState<Data | null>(null);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/dispatch/settings", { cache: "no-store" }).then(async (r) => {
      if (!r.ok) { setMsg({ text: "Could not load settings.", error: true }); return; }
      const d: Data = await r.json();
      setData(d); setCfg(d.config);
    });
  }, []);

  if (!data || !cfg) return <div className="p-6 flex justify-center text-gray-500">{msg ? <p className="text-red-600">{msg.text}</p> : <Loader2 className="animate-spin" />}</div>;

  const ro = !data.canEdit;
  const set = <K extends keyof Config>(k: K, v: Config[K]) => { setCfg({ ...cfg, [k]: v }); setMsg(null); };
  const setDay = (d: keyof Week, v: Day) => set("businessHours", { ...cfg.businessHours, [d]: v });

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const r = await fetch("/api/dispatch/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setMsg({ text: d.error ?? "Could not save", error: true });
      else { setCfg(d.config); setMsg({ text: "Settings saved. The board and recommendations use them right away." }); }
    } finally {
      setSaving(false);
    }
  }

  const input = "px-3 py-2 rounded-lg border border-gray-200 text-sm disabled:bg-gray-50 disabled:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30";
  const card = "bg-white rounded-xl border border-gray-200 p-5";

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><Settings2 size={24} className="text-[#1B3FA8]" /> Dispatch Settings</h1>
        <p className="text-sm text-gray-500 mt-1">All times are North Carolina time (Eastern).</p>
        {ro && <p className="mt-2 text-sm text-amber-700 flex items-center gap-1.5"><Lock size={14} /> View only — a manager or admin can change these settings.</p>}
      </div>

      <section className={card}>
        <h2 className="font-bold text-gray-900">Company hours</h2>
        <p className="text-xs text-gray-500 mb-3">Default working hours for technicians who don&apos;t have their own hours on their profile. Scheduling outside them shows a warning.</p>
        <div className="space-y-1.5">
          {DAYS.map((d) => {
            const v = cfg.businessHours[d.key];
            return (
              <div key={d.key} className="flex items-center gap-2 text-sm">
                <label className="w-32 flex items-center gap-2">
                  <input type="checkbox" disabled={ro} checked={!!v} onChange={(e) => setDay(d.key, e.target.checked ? { start: "08:00", end: "17:00" } : null)} />
                  {d.label}
                </label>
                {v ? (
                  <>
                    <input type="time" step={900} disabled={ro} value={v.start} onChange={(e) => setDay(d.key, { ...v, start: e.target.value })} className={input} />
                    <span className="text-gray-400">to</span>
                    <input type="time" step={900} disabled={ro} value={v.end} onChange={(e) => setDay(d.key, { ...v, end: e.target.value })} className={input} />
                  </>
                ) : <span className="text-gray-400 text-xs">Closed</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className={card}>
        <h2 className="font-bold text-gray-900">Default job durations</h2>
        <p className="text-xs text-gray-500 mb-3">How long a new job blocks on the board when the call doesn&apos;t set a duration.</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {Object.entries(data.jobTypes).map(([k, t]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
              <span className="flex-1">{t.label}</span>
              <input type="number" min={15} step={15} disabled={ro} value={cfg.defaultMinutes[k] ?? 60}
                onChange={(e) => set("defaultMinutes", { ...cfg.defaultMinutes, [k]: Number(e.target.value) })} className={input + " w-24"} />
              <span className="text-xs text-gray-400 w-14">{toHM(cfg.defaultMinutes[k] ?? 60)}</span>
            </label>
          ))}
        </div>
      </section>

      <section className={card + " grid sm:grid-cols-2 gap-4"}>
        <div>
          <h2 className="font-bold text-gray-900 text-sm">Travel buffer between jobs</h2>
          <p className="text-xs text-gray-500 mb-2">Gap kept free when looking for the next open slot.</p>
          <div className="flex items-center gap-2">
            <input type="number" min={0} max={120} step={5} disabled={ro} value={cfg.travelBufferMinutes} onChange={(e) => set("travelBufferMinutes", Number(e.target.value))} className={input + " w-24"} />
            <span className="text-sm text-gray-500">minutes</span>
          </div>
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-sm">Customer arrival window</h2>
          <p className="text-xs text-gray-500 mb-2">Window given to the customer from the start time (e.g. 9 – 11 AM).</p>
          <div className="flex items-center gap-2">
            <input type="number" min={0.5} max={8} step={0.5} disabled={ro} value={cfg.arrivalWindowHours} onChange={(e) => set("arrivalWindowHours", Number(e.target.value))} className={input + " w-24"} />
            <span className="text-sm text-gray-500">hours</span>
          </div>
        </div>
        <div className="sm:col-span-2">
          <h2 className="font-bold text-gray-900 text-sm">Dispatch Board hours shown</h2>
          <p className="text-xs text-gray-500 mb-2">First and last hour visible on the board timeline.</p>
          <div className="flex items-center gap-2">
            <input type="time" step={3600} disabled={ro} value={cfg.boardStart} onChange={(e) => set("boardStart", e.target.value)} className={input} />
            <span className="text-gray-400">to</span>
            <input type="time" step={3600} disabled={ro} value={cfg.boardEnd} onChange={(e) => set("boardEnd", e.target.value)} className={input} />
          </div>
        </div>
      </section>

      {msg && (
        <p className={`text-sm flex items-center gap-1.5 ${msg.error ? "text-red-600" : "text-green-700"}`}>
          {!msg.error && <CheckCircle2 size={15} />}{msg.text}
        </p>
      )}

      {!ro && (
        <div className="flex justify-between gap-2">
          <button onClick={() => { setCfg({ ...cfg, ...data.defaults }); setMsg({ text: "Defaults loaded — click Save to apply." }); }}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 flex items-center gap-2 bg-white">
            <RotateCcw size={15} /> Restore defaults
          </button>
          <button onClick={save} disabled={saving} className="px-5 py-2 rounded-lg bg-[#1B3FA8] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save settings
          </button>
        </div>
      )}
    </div>
  );
}
