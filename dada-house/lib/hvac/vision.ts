import { getOpenAI } from "@/lib/openai";
import { FIELDS, FIELD_BY_KEY } from "./catalog";
import { REFRIGERANT_KEYS } from "./refrigerants";
import { toCanonical, type TempUnit, type PressureUnit, type StaticUnit } from "./units";

/**
 * Reads nameplates, digital manifolds, thermometers and meters from photos / video frames.
 * The AI only TRANSCRIBES what is legible. Everything it returns is a proposal the technician
 * must verify before it is saved; the AI never diagnoses here — the deterministic engine does.
 */

export const VISION_MODEL = process.env.HVAC_VISION_MODEL || "gpt-4o";

const EQUIPMENT_TARGETS: Record<string, { label: string; type: "text" | "number" }> = {
  manufacturer: { label: "Manufacturer / brand", type: "text" },
  modelNumber: { label: "Model number", type: "text" },
  serialNumber: { label: "Serial number", type: "text" },
  indoorModel: { label: "Indoor unit / coil model", type: "text" },
  refrigerant: { label: `Refrigerant type — one of ${REFRIGERANT_KEYS.join(", ")}`, type: "text" },
  ratedVoltage: { label: "Rated voltage as printed (e.g. 208/230)", type: "text" },
  phase: { label: "Phase (1 or 3)", type: "number" },
  minVoltage: { label: "Minimum voltage", type: "number" },
  maxVoltage: { label: "Maximum voltage", type: "number" },
  rla: { label: "Compressor RLA (amps)", type: "number" },
  lra: { label: "Compressor LRA (amps)", type: "number" },
  mca: { label: "Minimum circuit ampacity (amps)", type: "number" },
  mocp: { label: "Max overcurrent protection / max fuse-breaker (amps)", type: "number" },
  capacityTons: { label: "Nominal capacity in tons — ONLY if printed in tons or BTU/h (convert BTU/h ÷ 12000)", type: "number" },
  "specs.targetSubcooling": { label: "Factory target subcooling printed on the label (°F)", type: "number" },
  "specs.tempRiseMin": { label: "Furnace temperature rise minimum (°F)", type: "number" },
  "specs.tempRiseMax": { label: "Furnace temperature rise maximum (°F)", type: "number" },
  "specs.maxTesp": { label: "Max external static pressure (in. w.c.)", type: "number" },
};

const MEASUREMENT_TARGETS = FIELDS.filter((f) => f.input === "number" || f.key === "fault_code");

export type Proposal = {
  target: "equipment" | "measurement";
  key: string; label: string; circuit: number;
  value: number | null; text: string | null;     // canonical value for measurements (°F, psig, in. w.c.)
  display: string;                                // what the technician sees ("118 psig")
  read: string;                                   // verbatim text the AI read
  image: number; confidence: "high" | "medium" | "low";
  warning?: string;
};

function normTemp(u: string): TempUnit | null { const x = u.toLowerCase().replace(/[°º\s]/g, ""); return x === "f" ? "F" : x === "c" ? "C" : null; }
function normPressure(u: string): PressureUnit | "psia" | null {
  const x = u.toLowerCase().replace(/[\s()]/g, "");
  if (x === "psig" || x === "psi") return "psig";
  if (x === "psia") return "psia";
  if (x === "kpa" || x === "kpag") return "kPag";
  if (x === "bar" || x === "barg") return "barg";
  return null;
}
function normStatic(u: string): StaticUnit | null { const x = u.toLowerCase().replace(/[\s."]/g, ""); return ["inwc", "inh2o", "wc", "iwc"].includes(x) ? "inwc" : x === "pa" ? "Pa" : null; }

const DEFAULT_PREFS = { temp: "F" as TempUnit, pressure: "psig" as PressureUnit, static: "inwc" as StaticUnit };

export async function readImages(imageUrls: string[], context: { refrigerant?: string | null; circuits: number }) {
  const system = `You transcribe HVAC data from photos for a licensed technician. Rules:
- Report ONLY values that are clearly legible in the images. Never guess, infer, estimate or calculate. If a value is blurry or cut off, skip it.
- Do NOT diagnose and do NOT give advice.
- Ignore superheat/subcooling/target values computed by a digital manifold; report the raw pressures and temperatures instead. (Exception: a factory "target subcooling" printed on the equipment label.)
- Digital manifold: low side / suction / "LOW" → suction_psig; high side / liquid / "HIGH" → high_psig; suction line clamp (SLT, "Suction temp") → suction_line_f; liquid line clamp (LLT) → liquid_line_f. Note the refrigerant shown on the manifold screen as equipment.refrigerant.
- Report the unit exactly as displayed (°F, °C, psig, psia, kPa, bar, in. w.c., Pa, V, A, µF, Hz, µA, ppm, CFM, Ω, MΩ, min).
- "read" = the exact characters you read for that value.
Return JSON: {"readings":[{"target":"equipment"|"measurement","key":"...","value":number|null,"text":string|null,"unit":"...","read":"...","image":<0-based image index>,"circuit":1,"confidence":"high"|"medium"|"low"}],"notes":"short note about what the images show / what was unreadable"}`;
  const keys = `Allowed equipment keys:\n${Object.entries(EQUIPMENT_TARGETS).map(([k, v]) => `- ${k}: ${v.label}`).join("\n")}\n\nAllowed measurement keys:\n${MEASUREMENT_TARGETS.map((f) => `- ${f.key}: ${f.label}${f.unit ? ` (${f.unit})` : ""}`).join("\n")}\n\nThe system has ${context.circuits} refrigeration circuit(s).${context.refrigerant ? ` Nameplate refrigerant already recorded: ${context.refrigerant}.` : ""}`;

  const res = await getOpenAI().chat.completions.create({
    model: VISION_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: [
        { type: "text", text: keys },
        ...imageUrls.map((url) => ({ type: "image_url" as const, image_url: { url, detail: "high" as const } })),
      ] },
    ],
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  let parsed: { readings?: unknown[]; notes?: string } = {};
  try { parsed = JSON.parse(raw); } catch { /* handled below */ }
  return { proposals: normalize(parsed.readings ?? [], context.circuits), notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 1000) : null, model: VISION_MODEL };
}

function normalize(readings: unknown[], circuits: number): Proposal[] {
  const out: Proposal[] = [];
  for (const r0 of readings) {
    const r = r0 as Record<string, unknown>;
    const key = String(r.key ?? "");
    const unit = String(r.unit ?? "");
    const read = String(r.read ?? "").slice(0, 120);
    const image = Number.isInteger(r.image) ? (r.image as number) : 0;
    const confidence = (["high", "medium", "low"].includes(String(r.confidence)) ? r.confidence : "low") as Proposal["confidence"];
    const circuit = Math.min(circuits, Math.max(1, Number(r.circuit) || 1));
    const num = typeof r.value === "number" && Number.isFinite(r.value) ? r.value : (typeof r.value === "string" && r.value.trim() !== "" && Number.isFinite(Number(r.value)) ? Number(r.value) : null);
    const text = typeof r.text === "string" ? r.text.trim().slice(0, 200) : null;

    if (r.target === "equipment" && key in EQUIPMENT_TARGETS) {
      const t = EQUIPMENT_TARGETS[key];
      if (t.type === "number") {
        if (num == null) continue;
        out.push({ target: "equipment", key, label: t.label.split(" — ")[0], circuit: 1, value: num, text: null, display: `${num}${unit ? ` ${unit}` : ""}`, read, image, confidence });
      } else {
        let v = text ?? (num != null ? String(num) : null);
        if (!v) continue;
        let warning: string | undefined;
        if (key === "refrigerant") {
          const raw = v;
          const k = REFRIGERANT_KEYS.find((x) => x.replace("-", "").toLowerCase() === raw.replace(/[-\s]/g, "").toLowerCase());
          if (!k) {
            out.push({ target: "equipment", key, label: "Refrigerant", circuit: 1, value: null, text: null, display: raw, read, image, confidence: "low", warning: `"${raw}" is not a supported refrigerant — select it manually.` });
            continue;
          }
          v = k;
        }
        out.push({ target: "equipment", key, label: t.label.split(" — ")[0], circuit: 1, value: null, text: v, display: v, read, image, confidence, warning });
      }
      continue;
    }

    const f = FIELD_BY_KEY[key];
    if (r.target !== "measurement" || !f || !MEASUREMENT_TARGETS.includes(f)) continue;
    if (f.input !== "number") {
      if (!text) continue;
      out.push({ target: "measurement", key, label: f.label, circuit: 1, value: null, text, display: text, read, image, confidence });
      continue;
    }
    if (num == null) continue;
    let canonical: number | null = null, warning: string | undefined;
    if (f.kind === "temp" || f.kind === "tempDiff") {
      const u = normTemp(unit);
      if (!u) warning = `Unit "${unit}" unclear — confirm °F/°C`;
      canonical = toCanonical(f.kind, num, { ...DEFAULT_PREFS, temp: u ?? "F" });
    } else if (f.kind === "pressure") {
      const u = normPressure(unit);
      if (u === "psia") { canonical = num - 14.696; warning = "Converted from psia to psig"; }
      else { if (!u) warning = `Unit "${unit}" unclear — confirm psig`; canonical = toCanonical("pressure", num, { ...DEFAULT_PREFS, pressure: u ?? "psig" }); }
    } else if (f.kind === "static") {
      const u = normStatic(unit);
      if (!u) warning = `Unit "${unit}" unclear — confirm in. w.c.`;
      canonical = toCanonical("static", num, { ...DEFAULT_PREFS, static: u ?? "inwc" });
    } else {
      canonical = num;
      if (f.unit && unit && !unit.toLowerCase().replace(/\s/g, "").includes(f.unit.toLowerCase().replace(/[\s±]/g, "").slice(0, 2))) warning = `Displayed unit "${unit}" — expected ${f.unit}`;
    }
    const cu = f.kind === "temp" || f.kind === "tempDiff" ? "°F" : f.kind === "pressure" ? "psig" : f.kind === "static" ? "in. w.c." : f.unit ?? "";
    out.push({
      target: "measurement", key, label: f.label, circuit: f.perCircuit ? circuit : 1, value: Math.round(canonical * 100) / 100, text: null,
      display: `${Math.round(canonical * 10) / 10} ${cu}${unit && cu.replace("°", "").toLowerCase() !== unit.replace("°", "").toLowerCase() ? ` (read ${num} ${unit})` : ""}`,
      read, image, confidence, warning,
    });
  }
  return out;
}
