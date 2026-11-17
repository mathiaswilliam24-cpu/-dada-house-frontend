"use client";
import { useCallback, useEffect, useState } from "react";
import { HardHat, Loader2, MapPin, Save, Siren, X, Plus, Check, Clock, AlertTriangle } from "lucide-react";
import { SKILL_SUGGESTIONS, TECH_ROLES } from "@/lib/dispatch-catalog";

type Day = { start: string; end: string } | null;
type Week = Record<"sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat", Day>;
const DAYS: { key: keyof Week; label: string }[] = [
  { key: "mon", label: "Monday" }, { key: "tue", label: "Tuesday" }, { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" }, { key: "fri", label: "Friday" }, { key: "sat", label: "Saturday" }, { key: "sun", label: "Sunday" },
];
const COLORS = ["#1B3FA8", "#F7921A", "#059669", "#7c3aed", "#dc2626", "#0891b2", "#be185d", "#ca8a04", "#475569", "#16a34a", "#9333ea", "#ea580c"];
const ROLE_LABEL: Record<string, string> = { PRIMARY: "Technician", LEAD_INSTALLER: "Lead installer", HELPER: "Helper", SUPERVISOR: "Supervisor" };

type Tech = {
  id: string; name: string | null; email: string | null; phone: string | null; image: string | null;
  hasProfile: boolean; isActive: boolean; employeeId: string | null; employmentType: string | null; techRole: string | null;
  skills: string[]; specialties: string[]; serviceAreas: string[]; workingHours: Week | null; emergencyAvailable: boolean;
  boardColor: string | null; homeAddress: string | null; homeLat: number | null; homeLng: number | null;
  vehicle: string | null; licenseNumber: string | null; hourlyRate?: number | null; commissionRate?: number | null;
};
type Data = { canEditPay: boolean; businessHours: Week; technicians: Tech[] };

const fmt12 = (t: string) => { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`; };
const hoursSummary = (w: Week | null, fallback: Week) => {
  const wk = w ?? fallback;
  const on = DAYS.filter((d) => wk[d.key]);
  if (!on.length) return "No working days";
  const first = wk[on[0].key]!;
  const same = on.every((d) => wk[d.key]!.start === first.start && wk[d.key]!.end === first.end);
  return same ? `${on.map((d) => d.label.slice(0, 3)).join(", ")} · ${fmt12(first.start)}–${fmt12(first.end)}` : `${on.length} days/week, varied hours`;
};

export default function TechnicianProfiles() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Tech | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/dispatch/technicians", { cache: "no-store" });
    if (!res.ok) { setError("Could not load technicians."); return; }
    setData(await res.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return <div className="p-6 flex justify-center text-gray-500">{error ? <p className="text-red-600">{error}</p> : <Loader2 className="animate-spin" />}</div>;

  return (
    <div className="p-4 md:p-6 max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><HardHat size={24} className="text-[#1B3FA8]" /> Technician Profiles</h1>
        <p className="text-sm text-gray-500 mt-1">
          Working hours, skills, board color and home base used by the Dispatch Board and the technician recommendations.
          Technician accounts are created in Settings → Team accounts.
        </p>
      </div>

      {data.technicians.length === 0 ? (
        <p className="p-10 text-center bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">No technician accounts yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.technicians.map((t) => {
            const skills = [...t.skills, ...t.specialties];
            const missing = [!skills.length && "skills", !t.homeLat && "home base", !t.workingHours && "own hours"].filter(Boolean) as string[];
            return (
              <button key={t.id} onClick={() => setEditing(t)}
                className={`text-left bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${t.isActive ? "border-gray-200" : "border-dashed border-gray-300 opacity-60"}`}>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black shrink-0" style={{ background: t.boardColor ?? "#94a3b8" }}>
                    {(t.name?.trim() || "?").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 truncate">{t.name?.trim() || t.email || "Unnamed technician"}</p>
                    <p className="text-xs text-gray-500">{ROLE_LABEL[t.techRole ?? ""] ?? "Technician"}{t.employmentType ? ` · ${t.employmentType}` : ""}{t.employeeId ? ` · #${t.employeeId}` : ""}</p>
                  </div>
                  {!t.isActive && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                  {t.emergencyAvailable && t.isActive && <Siren size={16} className="text-red-500 shrink-0" />}
                </div>
                <p className="text-xs text-gray-600 mt-3 flex items-center gap-1"><Clock size={12} /> {hoursSummary(t.workingHours, data.businessHours)}{!t.workingHours && " (company hours)"}</p>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {skills.slice(0, 6).map((s) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-[#1B3FA8] font-semibold">{s}</span>)}
                    {skills.length > 6 && <span className="text-[10px] text-gray-400">+{skills.length - 6}</span>}
                  </div>
                )}
                {missing.length > 0 && t.isActive && (
                  <p className="text-[11px] text-amber-700 mt-2 flex items-center gap-1"><AlertTriangle size={11} /> Missing: {missing.join(", ")}</p>
                )}
              </button>
            );
          })}
        </div>
      )}

      {editing && (
        <Editor tech={editing} canEditPay={data.canEditPay} businessHours={data.businessHours}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function Editor({ tech, canEditPay, businessHours, onClose, onSaved }: {
  tech: Tech; canEditPay: boolean; businessHours: Week; onClose: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState(() => ({
    isActive: tech.isActive,
    emergencyAvailable: tech.emergencyAvailable,
    boardColor: tech.boardColor ?? "",
    techRole: tech.techRole ?? "PRIMARY",
    employmentType: tech.employmentType ?? "",
    employeeId: tech.employeeId ?? "",
    skills: [...new Set(tech.skills.map((s) => s.toLowerCase()))],
    serviceAreas: tech.serviceAreas,
    customHours: !!tech.workingHours,
    hours: (tech.workingHours ?? businessHours) as Week,
    homeAddress: tech.homeAddress ?? "",
    vehicle: tech.vehicle ?? "",
    licenseNumber: tech.licenseNumber ?? "",
    hourlyRate: tech.hourlyRate != null ? String(tech.hourlyRate) : "",
    commissionRate: tech.commissionRate != null ? String(tech.commissionRate) : "",
  }));
  const [skillInput, setSkillInput] = useState("");
  const [areaInput, setAreaInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const toggleSkill = (s: string) => set("skills", f.skills.includes(s) ? f.skills.filter((x) => x !== s) : [...f.skills, s]);
  const addTag = (k: "skills" | "serviceAreas", raw: string) => {
    const v = k === "skills" ? raw.trim().toLowerCase() : raw.trim();
    if (v && !f[k].includes(v)) set(k, [...f[k], v]);
  };
  const setDay = (d: keyof Week, v: Day) => set("hours", { ...f.hours, [d]: v });

  async function save() {
    setSaving(true); setMsg(null);
    const num = (s: string) => (s.trim() === "" ? null : Number(s));
    const body: Record<string, unknown> = {
      isActive: f.isActive, emergencyAvailable: f.emergencyAvailable,
      boardColor: f.boardColor || null, techRole: f.techRole || null, employmentType: f.employmentType || null, employeeId: f.employeeId || null,
      skills: f.skills, serviceAreas: f.serviceAreas,
      workingHours: f.customHours ? f.hours : null,
      homeAddress: f.homeAddress.trim() || null, vehicle: f.vehicle || null, licenseNumber: f.licenseNumber || null,
    };
    if (canEditPay) { body.hourlyRate = num(f.hourlyRate); body.commissionRate = num(f.commissionRate); }
    try {
      const res = await fetch(`/api/dispatch/technicians/${tech.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ text: d.error ?? "Could not save", error: true }); return; }
      if (d.geocodeWarning) { setMsg({ text: d.geocodeWarning, error: true }); setTimeout(onSaved, 2500); return; }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const input = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30";
  const label = "block text-xs font-bold text-gray-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-black text-lg text-gray-900">{tech.name?.trim() || "Technician"}</h2>
            <p className="text-xs text-gray-500">{[tech.phone, tech.email].filter(Boolean).join(" · ")}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-6">
          {/* Status */}
          <section className="grid grid-cols-2 gap-3">
            <Toggle on={f.isActive} onChange={(v) => set("isActive", v)} title="Active on the board" sub="Inactive techs are hidden from dispatch" />
            <Toggle on={f.emergencyAvailable} onChange={(v) => set("emergencyAvailable", v)} title="Takes emergencies" sub="Ranked higher for emergency calls" />
          </section>

          {/* Role */}
          <section className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Role</label>
              <select className={input} value={f.techRole} onChange={(e) => set("techRole", e.target.value)}>
                {TECH_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Employment</label>
              <select className={input} value={f.employmentType} onChange={(e) => set("employmentType", e.target.value)}>
                <option value="">—</option><option value="W2">W2</option><option value="1099">1099</option>
              </select>
            </div>
            <div>
              <label className={label}>Employee ID</label>
              <input className={input} value={f.employeeId} onChange={(e) => set("employeeId", e.target.value)} />
            </div>
          </section>

          {/* Color */}
          <section>
            <label className={label}>Board color</label>
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => set("boardColor", c)} className="w-8 h-8 rounded-full flex items-center justify-center ring-offset-2" style={{ background: c, boxShadow: f.boardColor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined }}>
                  {f.boardColor === c && <Check size={14} className="text-white" />}
                </button>
              ))}
              <input type="color" value={f.boardColor || "#94a3b8"} onChange={(e) => set("boardColor", e.target.value)} className="w-8 h-8 rounded cursor-pointer" title="Custom color" />
            </div>
          </section>

          {/* Skills */}
          <section>
            <label className={label}>Skills <span className="font-normal text-gray-400">— used to match job types (maintenance, diagnostic, repair, installation…)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([...SKILL_SUGGESTIONS, ...f.skills])].map((s) => (
                <button key={s} type="button" onClick={() => toggleSkill(s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${f.skills.includes(s) ? "bg-[#1B3FA8] text-white border-[#1B3FA8]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                  {s}
                </button>
              ))}
            </div>
            {tech.specialties.length > 0 && (
              <p className="text-[11px] text-gray-500 mt-2">Specialties the technician added in their app (also used for matching): {tech.specialties.join(", ")}</p>
            )}
            <div className="flex gap-2 mt-2">
              <input className={input} placeholder="Add another skill" value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag("skills", skillInput); setSkillInput(""); } }} />
              <button type="button" onClick={() => { addTag("skills", skillInput); setSkillInput(""); }} className="px-3 rounded-lg bg-gray-100 hover:bg-gray-200"><Plus size={16} /></button>
            </div>
          </section>

          {/* Hours */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className={label + " mb-0"}>Working hours (North Carolina time)</label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                <input type="checkbox" checked={f.customHours} onChange={(e) => { set("customHours", e.target.checked); if (!e.target.checked) set("hours", businessHours); }} />
                Custom hours for this technician
              </label>
            </div>
            {!f.customHours ? (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">Uses the company hours: {hoursSummary(businessHours, businessHours)}</p>
            ) : (
              <div className="space-y-1.5">
                {DAYS.map((d) => {
                  const v = f.hours[d.key];
                  return (
                    <div key={d.key} className="flex items-center gap-2 text-sm">
                      <label className="w-28 flex items-center gap-2">
                        <input type="checkbox" checked={!!v} onChange={(e) => setDay(d.key, e.target.checked ? { start: "08:00", end: "17:00" } : null)} />
                        {d.label}
                      </label>
                      {v ? (
                        <>
                          <input type="time" step={900} value={v.start} onChange={(e) => setDay(d.key, { ...v, start: e.target.value })} className={input + " max-w-[130px]"} />
                          <span className="text-gray-400">to</span>
                          <input type="time" step={900} value={v.end} onChange={(e) => setDay(d.key, { ...v, end: e.target.value })} className={input + " max-w-[130px]"} />
                        </>
                      ) : <span className="text-gray-400 text-xs">Day off</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Home base */}
          <section>
            <label className={label}>Home base / start-of-day address</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className={input + " pl-9"} placeholder="Street, city, state, ZIP" value={f.homeAddress} onChange={(e) => set("homeAddress", e.target.value)} />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Used for drive times to the first job of the day.{" "}
              {tech.homeLat != null ? <span className="text-green-700">Located on the map.</span> : tech.homeAddress ? <span className="text-amber-700">Not located yet.</span> : null}
            </p>
          </section>

          {/* Service areas */}
          <section>
            <label className={label}>Service areas <span className="font-normal text-gray-400">— cities or ZIP codes</span></label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {f.serviceAreas.map((a) => (
                <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                  {a}<button type="button" onClick={() => set("serviceAreas", f.serviceAreas.filter((x) => x !== a))}><X size={11} /></button>
                </span>
              ))}
              {!f.serviceAreas.length && <span className="text-xs text-gray-400">None — covers all areas</span>}
            </div>
            <div className="flex gap-2">
              <input className={input} placeholder="e.g. Houston or 77084" value={areaInput} onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag("serviceAreas", areaInput); setAreaInput(""); } }} />
              <button type="button" onClick={() => { addTag("serviceAreas", areaInput); setAreaInput(""); }} className="px-3 rounded-lg bg-gray-100 hover:bg-gray-200"><Plus size={16} /></button>
            </div>
          </section>

          {/* Vehicle */}
          <section className="grid grid-cols-2 gap-3">
            <div><label className={label}>Vehicle</label><input className={input} value={f.vehicle} onChange={(e) => set("vehicle", e.target.value)} placeholder="Van #2 — Ford Transit" /></div>
            <div><label className={label}>License #</label><input className={input} value={f.licenseNumber} onChange={(e) => set("licenseNumber", e.target.value)} /></div>
          </section>

          {/* Pay */}
          {canEditPay && (
            <section className="grid grid-cols-2 gap-3">
              <div><label className={label}>Hourly rate ($)</label><input className={input} inputMode="decimal" value={f.hourlyRate} onChange={(e) => set("hourlyRate", e.target.value.replace(/[^0-9.]/g, ""))} /></div>
              <div><label className={label}>Commission (%)</label><input className={input} inputMode="decimal" value={f.commissionRate} onChange={(e) => set("commissionRate", e.target.value.replace(/[^0-9.]/g, ""))} /></div>
            </section>
          )}

          {msg && <p className={`text-sm ${msg.error ? "text-amber-700" : "text-green-700"}`}>{msg.text}</p>}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-[#1B3FA8] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save profile
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange, title, sub }: { on: boolean; onChange: (v: boolean) => void; title: string; sub: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className={`text-left rounded-lg border p-3 ${on ? "border-[#1B3FA8] bg-blue-50/50" : "border-gray-200"}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        <span className={`w-9 h-5 rounded-full relative transition-colors ${on ? "bg-[#1B3FA8]" : "bg-gray-300"}`}>
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
        </span>
      </div>
      <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>
    </button>
  );
}
