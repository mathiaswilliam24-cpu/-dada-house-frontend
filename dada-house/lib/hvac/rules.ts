import type { EngineResult, EquipmentSpec } from "./engine";
import type { Ctx } from "./catalog";

/**
 * HVAC Diagnostic Pro — Layer B (troubleshooting rule engine).
 * Every fault is a HYPOTHESIS built from evidence. Statuses:
 *   INSUFFICIENT_DATA  — a symptom points to it but key data is missing
 *   POSSIBLE           — some supporting evidence
 *   STRONGLY_SUSPECTED — several independent supports, no contradiction, key data present
 *   CONFIRMED          — only ever set by the technician
 * No confidence percentages: not calibrated yet (see Phase 4 validation).
 * Superheat/subcooling are only called high/low against the MANUFACTURER target ± tolerance.
 */
export const RULESET_VERSION = "hvac-rules 1.0.0";

/** Company field rules — not manufacturer data. Shown to the technician as such. Values can be changed by an
 *  administrator in Admin → HVAC Diagnostics (two-step: proposed, then approved), stored in Setting "hvac.fieldRules". */
export const FIELD_RULE_DEFS = {
  drierDropF: { value: 3, unit: "°F", min: 0.5, max: 15, label: (v: number) => `Temperature drop across the liquid-line filter drier above ${v} °F suggests a restriction`, source: "Common field practice (drier manufacturers' service guidance)" },
  windingMismatchPct: { value: 10, unit: "%", min: 1, max: 50, label: (v: number) => `C–S + C–R should equal R–S within ${v} %`, source: "Field practice for single-phase PSC compressors" },
  lowCompressionRatio: { value: 2.0, unit: ":1", min: 1.1, max: 5, label: (v: number) => `Compression ratio below ${v}:1 in cooling with the compressor running suggests poor pumping`, source: "Field practice — confirm with the manufacturer's performance data" },
  voltageImbalancePct: { value: 2, unit: "%", min: 0.5, max: 10, label: (v: number) => `Voltage imbalance above ${v} % — many manufacturers set this limit; check the unit's instructions`, source: "Common manufacturer limit (verify per unit)" },
  transformerMinVac: { value: 20, unit: "VAC", min: 10, max: 24, label: (v: number) => `Control voltage below ${v} VAC on a 24 VAC system is suspect`, source: "Field practice" },
} as const;
export type FieldRuleKey = keyof typeof FIELD_RULE_DEFS;
export type FieldRuleValues = Record<FieldRuleKey, number>;
export const DEFAULT_FIELD_RULES = Object.fromEntries(Object.entries(FIELD_RULE_DEFS).map(([k, d]) => [k, d.value])) as FieldRuleValues;
export function resolveFieldRules(overrides?: Partial<FieldRuleValues> | null): FieldRuleValues {
  const out = { ...DEFAULT_FIELD_RULES };
  for (const [k, v] of Object.entries(overrides ?? {})) {
    const d = FIELD_RULE_DEFS[k as FieldRuleKey];
    if (d && typeof v === "number" && v >= d.min && v <= d.max) out[k as FieldRuleKey] = v;
  }
  return out;
}

export type HypothesisStatus = "INSUFFICIENT_DATA" | "POSSIBLE" | "STRONGLY_SUSPECTED" | "CONFIRMED" | "RULED_OUT";
export type Decision = { decision: "CONFIRMED" | "REJECTED"; note?: string | null; at?: string; by?: string | null };
export type Hypothesis = {
  id: string; fault: string; category: "REFRIGERANT" | "AIRFLOW" | "ELECTRICAL" | "CONTROLS" | "COMPRESSOR" | "HEAT_PUMP" | "GAS_HEAT" | "SAFETY" | "WATER";
  status: HypothesisStatus; support: string[]; contradict: string[]; missing: string[];
  confirmationTest: string; safety?: string; safetyCritical?: boolean;
  corrective: { repair?: string; clean?: string; adjust?: string; replace?: string; verify: string };
  followUps: string[]; fieldRules: string[]; decision?: Decision;
};
export type RulesResult = { rulesetVersion: string; hypotheses: Hypothesis[]; nextMeasurements: { key: string; reason: string }[]; summary: string };

type M = Record<number, Record<string, { value?: number | null; text?: string | null }>>;
type Facts = {
  ctx: Ctx; eq: EquipmentSpec; mode: string | null; complaint: string | null; safety: Record<string, boolean>;
  num: (k: string, c?: number) => number | null; txt: (k: string, c?: number) => string | null;
  calc: (k: string, c?: number) => number | null; alert: (code: string) => boolean;
  sh: "HIGH" | "LOW" | "OK" | null; sc: "HIGH" | "LOW" | "OK" | null; shNote: string | null; scNote: string | null;
  cooling: boolean; circuit: number; fr: FieldRuleValues;
};

type Out = { support: string[]; contradict: string[]; missing: string[]; fieldRules?: string[] };
type Rule = Omit<Hypothesis, "status" | "support" | "contradict" | "missing" | "fieldRules" | "decision"> & {
  applies: (f: Facts) => boolean;
  evaluate: (f: Facts) => Out;
  /** keys that must be present before the rule can be "strongly suspected" */
  key?: string[];
};

const r1 = (n: number) => Math.round(n * 10) / 10;

function vsTarget(actual: number | null, target: number | null | undefined, tol: number | null | undefined) {
  if (actual == null || target == null || tol == null) return { state: null, note: null };
  const d = actual - target;
  const state = d > tol ? "HIGH" as const : d < -tol ? "LOW" as const : "OK" as const;
  return { state, note: `${r1(actual)} °F vs manufacturer target ${target} ±${tol} °F` };
}

const RULES: Rule[] = [
  // ── Refrigerant circuit ──
  {
    id: "LOW_CHARGE", fault: "Low refrigerant charge (leak)", category: "REFRIGERANT", followUps: ["suction_line_f", "liquid_line_f", "outdoor_ambient_f"],
    applies: (f) => f.ctx.refrigeration && !f.ctx.inverter && f.cooling,
    key: ["suction_psig", "high_psig", "suction_line_f", "liquid_line_f"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      if (f.sh === "HIGH") o.support.push(`High superheat (${f.shNote})`);
      if (f.sc === "LOW") o.support.push(`Low subcooling (${f.scNote})`);
      if (f.sh === "LOW") o.contradict.push(`Superheat is low (${f.shNote})`);
      if (f.sc === "HIGH") o.contradict.push(`Subcooling is high (${f.scNote})`);
      if (f.safety.oil_stains) o.support.push("Oil stains / visible leak evidence");
      if (f.sh == null && f.sc == null) o.missing.push("Manufacturer superheat or subcooling target and tolerance");
      return o;
    },
    confirmationTest: "Leak-check the system (electronic detector rated for the refrigerant, bubbles, or nitrogen pressure test). Do not add refrigerant before the leak is located.",
    safety: "Recover refrigerant with certified equipment (EPA Section 608). A2L refrigerants need A2L-rated tools.",
    corrective: { repair: "Locate and repair the leak", replace: "Filter drier after opening the system", verify: "Evacuate to the manufacturer's micron level, weigh in charge per nameplate, then verify superheat/subcooling against the manufacturer target." },
  },
  {
    id: "OVERCHARGE", fault: "Refrigerant overcharge", category: "REFRIGERANT", followUps: ["condenser_coil_condition", "outdoor_ambient_f"],
    applies: (f) => f.ctx.refrigeration && !f.ctx.inverter && f.cooling,
    key: ["high_psig", "liquid_line_f", "suction_psig", "suction_line_f"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      if (f.sc === "HIGH") o.support.push(`High subcooling (${f.scNote})`);
      if (f.sh === "LOW") o.support.push(`Low superheat (${f.shNote})`);
      if (f.sc === "LOW") o.contradict.push(`Subcooling is low (${f.scNote})`);
      if (f.sh === "HIGH") o.contradict.push(`Superheat is high (${f.shNote})`);
      if (f.txt("condenser_coil_condition") === "DIRTY" || f.txt("condenser_coil_condition") === "RESTRICTED") o.contradict.push("Dirty condenser coil can raise head pressure and subcooling — rule it out first");
      if (f.sc == null) o.missing.push("Manufacturer subcooling target and tolerance");
      return o;
    },
    confirmationTest: "Clean/verify condenser airflow first, then compare charge with the manufacturer's charging procedure. Check service history for recent refrigerant added.",
    corrective: { adjust: "Recover refrigerant to the manufacturer's target (never vent)", verify: "Re-check superheat/subcooling against the manufacturer target after stabilization." },
  },
  {
    id: "METERING_RESTRICTION", fault: "Restricted metering device (TXV/EEV/piston)", category: "REFRIGERANT", followUps: ["drier_in_f", "drier_out_f"],
    applies: (f) => f.ctx.refrigeration && !f.ctx.inverter && f.cooling,
    key: ["suction_psig", "high_psig", "suction_line_f", "liquid_line_f"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      if (f.sh === "HIGH") o.support.push(`High superheat (${f.shNote})`);
      if (f.sc === "HIGH") o.support.push(`High subcooling (${f.scNote}) — liquid backing up before the restriction`);
      if (f.sc === "LOW") o.contradict.push(`Subcooling is low (${f.scNote}) — points to undercharge instead`);
      const dropIn = f.num("drier_in_f"), dropOut = f.num("drier_out_f");
      if (dropIn != null && dropOut != null && dropIn - dropOut <= f.fr.drierDropF) o.support.push(`No significant drop across the filter drier (${r1(dropIn - dropOut)} °F) — restriction is downstream`);
      if (f.sh == null || f.sc == null) o.missing.push("Both superheat and subcooling targets");
      return o;
    },
    confirmationTest: "Check the TXV bulb mounting/insulation and equalizer, measure temperature drop across the metering device and filter drier, and inspect the piston/strainer for debris.",
    corrective: { repair: "Correct TXV bulb mounting if loose", replace: "Metering device or strainer as found, plus filter drier", verify: "Superheat and subcooling within the manufacturer target after repair." },
  },
  {
    id: "DRIER_RESTRICTION", fault: "Restricted liquid-line filter drier", category: "REFRIGERANT", followUps: ["drier_in_f", "drier_out_f"],
    applies: (f) => f.ctx.refrigeration && f.cooling,
    key: ["drier_in_f", "drier_out_f"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [], fieldRules: [FIELD_RULE_DEFS.drierDropF.label(f.fr.drierDropF)] };
      const a = f.num("drier_in_f"), b = f.num("drier_out_f");
      if (a != null && b != null) {
        const d = a - b;
        if (d > f.fr.drierDropF) o.support.push(`Temperature drop across the drier ${r1(d)} °F`);
        else o.contradict.push(`Drop across the drier is only ${r1(d)} °F`);
      } else if (f.sh === "HIGH" && f.sc === "HIGH") {
        o.support.push("High superheat with high subcooling (restriction pattern)");
        o.missing.push("Liquid-line temperature before and after the filter drier");
      }
      return o;
    },
    confirmationTest: "Measure the liquid-line temperature immediately before and after the drier with the system stabilized; sweating or frost at the outlet also indicates restriction.",
    corrective: { replace: "Filter drier (recover, replace, evacuate, recharge per nameplate)", verify: "Drop across the new drier and superheat/subcooling against the manufacturer target." },
  },
  // ── Airflow ──
  {
    id: "LOW_INDOOR_AIRFLOW", fault: "Insufficient indoor airflow", category: "AIRFLOW", followUps: ["tesp_inwc", "filter_condition", "evap_coil_condition", "blower_wheel_condition", "airflow_cfm"],
    applies: (f) => f.mode === "COOLING" || f.mode === "HEATING_GAS" || f.mode === "HEATING_HP" || f.mode === "HEATING_ELECTRIC" || f.complaint === "WEAK_AIRFLOW" || f.complaint === "FREEZING",
    key: ["tesp_inwc", "filter_condition"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      const filt = f.txt("filter_condition"), coil = f.txt("evap_coil_condition"), wheel = f.txt("blower_wheel_condition");
      if (filt === "DIRTY" || filt === "RESTRICTED") o.support.push("Dirty / restricted filter");
      if (filt === "CLEAN") o.contradict.push("Filter is clean");
      if (coil === "DIRTY" || coil === "RESTRICTED") o.support.push("Dirty evaporator coil");
      if (wheel === "DIRTY" || wheel === "RESTRICTED") o.support.push("Dirty blower wheel");
      if (f.alert("TESP_ABOVE_RATED")) o.support.push("Total external static above the equipment rating");
      const tesp = f.num("tesp_inwc"), max = f.eq.specs?.maxTesp;
      if (tesp != null && max != null && tesp <= max) o.contradict.push(`Static pressure ${tesp} in. w.c. is within the rated ${max}`);
      const cfm = f.num("airflow_cfm"), rated = f.eq.specs?.ratedCfm;
      if (cfm != null && rated != null) (cfm < rated * 0.9 ? o.support : o.contradict).push(`Measured airflow ${cfm} CFM vs manufacturer ${rated} CFM`);
      const evap = f.calc("evap_sat_f");
      if (f.cooling && evap != null && evap < 32) o.support.push(`Evaporator saturation ${r1(evap)} °F is below freezing`);
      if (f.mode === "HEATING_GAS" && f.alert("TEMP_RISE_OUT_OF_RANGE") && (f.calc("temp_rise_f") ?? 0) > (f.eq.specs?.tempRiseMax ?? Infinity)) o.support.push("Temperature rise above the nameplate range");
      if (f.txt("evap_coil_ice") === "HEAVY" || f.txt("evap_coil_ice") === "LIGHT") o.support.push("Ice on the indoor coil");
      if (f.sh === "LOW" && f.eq.meteringDevice === "PISTON") o.support.push(`Low superheat on a fixed orifice (${f.shNote})`);
      if (tesp == null && f.num("return_static_inwc") == null) o.missing.push("Total external static pressure");
      return o;
    },
    confirmationTest: "Measure total external static pressure and compare with the blower table at the selected speed; inspect filter, coil and blower wheel; measure airflow if a method is available.",
    corrective: { clean: "Filter, evaporator coil, blower wheel as needed", adjust: "Blower speed to the manufacturer's required airflow", repair: "Duct restrictions / undersized return", verify: "Static pressure and airflow (or temperature rise in heating) within the manufacturer range." },
  },
  {
    id: "DIRTY_CONDENSER", fault: "Dirty condenser coil / poor outdoor airflow", category: "AIRFLOW", followUps: ["condenser_coil_condition", "ofm_amps", "outdoor_ambient_f"],
    applies: (f) => f.ctx.refrigeration && f.cooling,
    key: ["condenser_coil_condition"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      const cc = f.txt("condenser_coil_condition");
      if (cc === "DIRTY" || cc === "RESTRICTED") o.support.push("Condenser coil dirty / blocked");
      if (cc === "CLEAN") o.contradict.push("Condenser coil is clean");
      if (f.txt("pressure_switch_status") === "OPEN_HIGH") o.support.push("High-pressure switch open");
      if (f.sc === "HIGH") o.support.push(`High subcooling (${f.scNote})`);
      if (f.alert("COMP_ABOVE_RLA")) o.support.push("Compressor current above RLA");
      return o;
    },
    confirmationTest: "Inspect the coil face and fins with power off, check recirculation/clearances, confirm the outdoor fan speed and direction.",
    safety: "Disconnect power and lock out before cleaning the coil.",
    corrective: { clean: "Condenser coil (manufacturer-approved cleaner) and clear obstructions", verify: "Head pressure / condensing temperature and amps after cleaning." },
  },
  {
    id: "DUCT_RESTRICTION", fault: "Ductwork restriction", category: "AIRFLOW", followUps: ["return_static_inwc", "supply_static_inwc", "duct_restriction"],
    applies: (f) => f.complaint === "WEAK_AIRFLOW" || f.complaint === "UNEVEN_TEMPS" || f.complaint === "FREEZING" || f.num("tesp_inwc") != null,
    key: ["return_static_inwc", "supply_static_inwc"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      if (f.alert("TESP_ABOVE_RATED")) o.support.push("Total external static above the rating");
      if ((f.txt("duct_restriction") ?? "").trim()) o.support.push(`Technician noted: ${f.txt("duct_restriction")}`);
      if (f.txt("filter_condition") === "CLEAN" && f.alert("TESP_ABOVE_RATED")) o.support.push("High static with a clean filter");
      if (f.num("return_static_inwc") == null || f.num("supply_static_inwc") == null) o.missing.push("Separate return and supply static readings");
      return o;
    },
    confirmationTest: "Split the static reading (return vs supply side), inspect for crushed flex, closed dampers, undersized return.",
    corrective: { repair: "Correct the restriction / add return capacity", verify: "Total external static within the equipment rating." },
  },
  // ── Electrical / components ──
  {
    id: "CAPACITOR", fault: "Run capacitor failure", category: "ELECTRICAL", followUps: ["cap_herm_measured_uf", "cap_fan_measured_uf", "cap_tolerance_pct"],
    applies: (f) => !f.ctx.inverter,
    key: ["cap_tolerance_pct"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      if (f.alert("CAP_HERM_OUT_OF_TOL")) o.support.push("HERM capacitor outside its label tolerance");
      if (f.alert("CAP_FAN_OUT_OF_TOL")) o.support.push("FAN capacitor outside its label tolerance");
      const devH = f.calc("cap_herm_dev_pct"), devF = f.calc("cap_fan_dev_pct"), tol = f.num("cap_tolerance_pct");
      if (tol != null && devH != null && Math.abs(devH) <= tol) o.contradict.push("HERM capacitor within tolerance");
      if (tol != null && devF != null && Math.abs(devF) <= tol) o.contradict.push("FAN capacitor within tolerance");
      if ((f.complaint === "COMPRESSOR_NOT_STARTING" || f.complaint === "OUTDOOR_FAN_NOT_RUNNING") && devH == null && devF == null) {
        o.support.push("Symptom matches a capacitor fault"); o.missing.push("Capacitor measured value, rating and tolerance");
      }
      return o;
    },
    confirmationTest: "Power off, lock out, discharge the capacitor, then measure µF out of circuit and compare with the label tolerance. Check for bulging/leaking.",
    safety: "Stored energy: discharge before handling.", corrective: { replace: "Capacitor with the same µF rating and equal-or-higher voltage rating", verify: "Motor starts and runs; running amps vs nameplate." },
  },
  {
    id: "CONTACTOR", fault: "Contactor failure", category: "ELECTRICAL", followUps: ["contactor_condition", "contactor_coil_v"],
    applies: (f) => !f.ctx.inverter && f.ctx.refrigeration,
    key: ["contactor_condition", "contactor_coil_v"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      const cond = f.txt("contactor_condition"), coil = f.num("contactor_coil_v");
      if (cond === "PITTED" || cond === "WELDED") o.support.push(`Contacts ${cond === "WELDED" ? "welded closed" : "pitted / burnt"}`);
      if (cond === "NOT_PULLING_IN" && coil != null && coil >= f.fr.transformerMinVac) o.support.push(`Coil has ${coil} VAC but does not pull in`);
      if (cond === "NOT_PULLING_IN" && coil != null && coil < f.fr.transformerMinVac) o.contradict.push(`Coil only gets ${coil} VAC — the control signal is missing, not the contactor`);
      if (cond === "OK") o.contradict.push("Contactor inspected OK");
      return o;
    },
    confirmationTest: "With a call for cooling, measure coil voltage; with power off and locked out, inspect contacts and measure coil resistance.",
    safety: "Line-voltage terminals — qualified live testing only, then lock out to inspect.", corrective: { replace: "Contactor (same coil voltage and ratings)", verify: "Pull-in on call, voltage drop across contacts under load." },
  },
  {
    id: "CONTROL_SIGNAL", fault: "Thermostat / low-voltage control fault", category: "CONTROLS", followUps: ["transformer_v", "thermostat_signals", "contactor_coil_v"],
    applies: (f) => ["THERMOSTAT_NOT_RESPONDING", "AC_NOT_ON", "COMPRESSOR_NOT_STARTING", "OUTDOOR_FAN_NOT_RUNNING", "SHORT_CYCLING"].includes(f.complaint ?? ""),
    key: ["transformer_v", "thermostat_signals"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [], fieldRules: [FIELD_RULE_DEFS.transformerMinVac.label(f.fr.transformerMinVac)] };
      const tv = f.num("transformer_v");
      if (tv != null && tv < f.fr.transformerMinVac) o.support.push(`Transformer secondary ${tv} VAC`);
      if (tv != null && tv >= f.fr.transformerMinVac) o.contradict.push(`Transformer secondary ${tv} VAC is normal`);
      const coil = f.num("contactor_coil_v");
      if (coil != null && coil < f.fr.transformerMinVac && tv != null && tv >= f.fr.transformerMinVac) o.support.push("Control voltage at the transformer but not at the contactor — open thermostat call, wiring or safety switch");
      if (f.txt("pressure_switch_status")?.startsWith("OPEN") || f.txt("pressure_switch_status") === "LOCKOUT") o.support.push("A pressure switch is open / locked out (find WHY before resetting)");
      if (tv == null) o.missing.push("Control transformer secondary voltage");
      return o;
    },
    confirmationTest: "Trace 24 VAC from the transformer through the thermostat (R→Y/G/W), the safety switches and the board to the contactor/relay.",
    safety: "Never jumper out a safety switch to make the unit run.", corrective: { repair: "Wiring, thermostat, fuse or transformer as found", verify: "Each call energizes the right component." },
  },
  {
    id: "SUPPLY_POWER", fault: "Supply voltage / power quality problem", category: "ELECTRICAL", followUps: ["supply_v", "loaded_v", "v_l1l2", "v_l2l3", "v_l1l3"],
    applies: () => true,
    key: ["supply_v"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [], fieldRules: [FIELD_RULE_DEFS.voltageImbalancePct.label(f.fr.voltageImbalancePct)] };
      for (const c of ["LOW_supply_v", "HIGH_supply_v", "LOW_loaded_v", "HIGH_loaded_v"]) if (f.alert(c)) o.support.push(c.includes("LOW") ? "Voltage below the nameplate minimum" : "Voltage above the nameplate maximum");
      const imb = f.calc("voltage_imbalance_pct");
      if (imb != null && imb > f.fr.voltageImbalancePct) o.support.push(`Voltage imbalance ${r1(imb)} %`);
      if (o.support.length === 0 && f.num("supply_v") != null && f.eq.minVoltage != null) o.contradict.push("Supply voltage within the nameplate range");
      return o;
    },
    confirmationTest: "Measure at the disconnect and at the unit with the compressor starting and running; check lugs, breaker and conductor size.",
    safety: "Energized test — qualified technicians, rated meter and PPE.", corrective: { repair: "Loose connections / undersized wiring; contact the utility for supply issues", verify: "Voltage and imbalance within the manufacturer limits under load." },
  },
  {
    id: "COMPRESSOR_ELECTRICAL", fault: "Compressor electrical fault (windings / overload)", category: "COMPRESSOR", followUps: ["winding_c_s_ohm", "winding_c_r_ohm", "winding_r_s_ohm", "insulation_megohm", "comp_start_amps"],
    applies: (f) => f.ctx.refrigeration && !f.ctx.inverter && ["COMPRESSOR_NOT_STARTING", "BREAKER_TRIPPING", "AC_NOT_COOLING", "SHORT_CYCLING"].includes(f.complaint ?? ""),
    key: ["winding_c_s_ohm", "winding_c_r_ohm", "winding_r_s_ohm"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [], fieldRules: [FIELD_RULE_DEFS.windingMismatchPct.label(f.fr.windingMismatchPct)] };
      const cs = f.num("winding_c_s_ohm", f.circuit), cr = f.num("winding_c_r_ohm", f.circuit), rs = f.num("winding_r_s_ohm", f.circuit);
      if (cs != null && cr != null && rs != null) {
        if (cs === 0 || cr === 0 || rs === 0) o.support.push("A winding reads 0 Ω (shorted)");
        else if (Math.abs(cs + cr - rs) / rs * 100 > f.fr.windingMismatchPct) o.support.push(`C–S + C–R (${r1(cs + cr)} Ω) ≠ R–S (${rs} Ω)`);
        else o.contradict.push("Winding resistances are consistent");
      } else o.missing.push("Compressor winding resistances (power off, locked out; let an overload cool first)");
      const start = f.num("comp_start_amps", f.circuit), lra = f.eq.lra;
      if (start != null && lra != null && start >= lra * 0.9 && f.txt("comp_running") === "NO") o.support.push(`Draws ${start} A (≈ LRA ${lra} A) without starting — locked rotor`);
      if (f.alert("COMP_ABOVE_RLA")) o.support.push("Running current above RLA");
      return o;
    },
    confirmationTest: "Power off and lock out. Let the internal overload reset (compressor shell cool), measure windings and insulation to ground per the compressor manufacturer; verify the start components.",
    safety: "Never energize a compressor with a suspected ground fault; keep terminals covered when energized.",
    corrective: { replace: "Compressor or start components as confirmed", verify: "Amps, voltage, superheat/subcooling after the repair." },
  },
  {
    id: "COMPRESSOR_MECHANICAL", fault: "Compressor mechanical fault (poor pumping)", category: "COMPRESSOR", followUps: ["comp_amps", "discharge_line_f"],
    applies: (f) => f.ctx.refrigeration && !f.ctx.inverter && f.cooling,
    key: ["suction_psig", "high_psig", "comp_amps"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [], fieldRules: [FIELD_RULE_DEFS.lowCompressionRatio.label(f.fr.lowCompressionRatio)] };
      const cr = f.calc("compression_ratio", f.circuit);
      if (cr != null && f.txt("comp_running") !== "NO" && cr < f.fr.lowCompressionRatio) o.support.push(`Compression ratio ${r1(cr)}:1`);
      if (cr != null && cr >= f.fr.lowCompressionRatio) o.contradict.push(`Compression ratio ${r1(cr)}:1 is normal for cooling`);
      if (f.sc === "LOW" && f.sh === "LOW") o.support.push("Low subcooling with low superheat (not an undercharge pattern)");
      if (f.sh === "HIGH" && f.sc === "LOW") o.contradict.push("High superheat + low subcooling points to undercharge first");
      return o;
    },
    confirmationTest: "Compare suction/discharge pressures and amps with the manufacturer performance data; on a scroll, verify rotation (3-phase). Rule out charge, metering and airflow first.",
    corrective: { replace: "Compressor only after charge, airflow and metering are verified", verify: "Pressures and amps vs manufacturer performance data." },
  },
  {
    id: "OUTDOOR_FAN", fault: "Outdoor fan motor fault", category: "ELECTRICAL", followUps: ["ofm_running", "ofm_amps", "cap_fan_measured_uf"],
    applies: (f) => f.ctx.refrigeration && (f.complaint === "OUTDOOR_FAN_NOT_RUNNING" || f.txt("ofm_running") === "NO" || f.txt("pressure_switch_status") === "OPEN_HIGH"),
    key: ["ofm_running"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      if (f.txt("ofm_running") === "NO") o.support.push("Outdoor fan not running with the compressor called");
      if (f.txt("ofm_running") === "YES") o.contradict.push("Outdoor fan runs");
      if (f.alert("CAP_FAN_OUT_OF_TOL")) o.contradict.push("Fan capacitor out of tolerance — replace it first and retest the motor");
      if (f.txt("pressure_switch_status") === "OPEN_HIGH") o.support.push("High-pressure switch open");
      return o;
    },
    confirmationTest: "Verify voltage at the motor, capacitor value, bearings (spin by hand, power off), motor windings / thermal overload.",
    safety: "Power off and lock out before touching the fan blade.", corrective: { replace: "Fan motor (match HP, RPM, rotation) and capacitor", verify: "Motor amps vs nameplate, head pressure normal." },
  },
  {
    id: "INDOOR_BLOWER", fault: "Indoor blower motor / control fault", category: "ELECTRICAL", followUps: ["blower_running", "blower_amps", "blower_motor_type"],
    applies: (f) => f.complaint === "INDOOR_BLOWER_NOT_RUNNING" || f.txt("blower_running") === "NO",
    key: ["blower_running"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      if (f.txt("blower_running") === "NO") o.support.push("Blower not running on a call");
      if (f.txt("blower_running") === "YES") o.contradict.push("Blower runs");
      if (f.txt("blower_motor_type")?.startsWith("ECM")) o.missing.push("ECM: check the manufacturer's motor test (signal/power) — module vs motor");
      return o;
    },
    confirmationTest: "Confirm the G/blower call reaches the board and the board outputs to the motor; PSC: capacitor and windings; ECM: line voltage + control signal per the manufacturer test.",
    corrective: { replace: "Motor, module or capacitor as confirmed", verify: "Airflow/static and amps after repair." },
  },
  // ── Heat pump ──
  {
    id: "REVERSING_VALVE", fault: "Reversing valve / O-B control fault", category: "HEAT_PUMP", followUps: ["rv_signal", "supply_db_f", "return_db_f"],
    applies: (f) => f.ctx.heatPump && (f.mode === "HEATING_HP" || f.complaint === "HP_NOT_HEATING"),
    key: ["rv_signal", "supply_db_f", "return_db_f"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      const s = f.num("supply_db_f"), r = f.num("return_db_f");
      if (f.mode === "HEATING_HP" && s != null && r != null && s < r) o.support.push("Supply air colder than return in heat-pump heating");
      if (f.mode === "HEATING_HP" && s != null && r != null && s > r + 5) o.contradict.push("Supply air is warmer than return — the unit is heating");
      if (f.txt("rv_signal")) o.support.push(`O/B signal ${f.txt("rv_signal") === "YES" ? "present" : "absent"} — compare with the thermostat's O or B configuration and the manufacturer`);
      return o;
    },
    confirmationTest: "Verify the thermostat O/B setting matches the unit, check coil voltage at the reversing valve solenoid, and temperatures of the valve lines per the manufacturer procedure.",
    corrective: { repair: "Thermostat O/B configuration or wiring", replace: "Solenoid coil or reversing valve as confirmed", verify: "Mode change on call; heating supply temperature rise." },
  },
  {
    id: "DEFROST", fault: "Defrost failure", category: "HEAT_PUMP", followUps: ["outdoor_coil_ice", "defrost_status", "outdoor_coil_f"],
    applies: (f) => f.ctx.heatPump && (f.mode === "HEATING_HP" || f.mode === "DEFROST" || f.complaint === "HP_NOT_HEATING"),
    key: ["outdoor_coil_ice", "defrost_status"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      if (f.txt("outdoor_coil_ice") === "HEAVY") o.support.push("Outdoor coil heavily iced / blocked");
      if (f.txt("outdoor_coil_ice") === "NONE") o.contradict.push("No ice on the outdoor coil");
      if ((f.txt("defrost_status") ?? "").trim()) o.support.push(`Defrost board: ${f.txt("defrost_status")} (interpret with the manufacturer's code table)`);
      return o;
    },
    confirmationTest: "Force a defrost per the manufacturer (test pins), verify the coil sensor/thermostat closes at the specified temperature and the outdoor fan stops / valve shifts.",
    corrective: { replace: "Defrost sensor or board as confirmed", verify: "Complete defrost cycle observed." },
  },
  {
    id: "AUX_HEAT", fault: "Auxiliary heat failure", category: "HEAT_PUMP", followUps: ["aux_heat_ok"],
    applies: (f) => f.ctx.heatPump && (f.mode === "AUX_HEAT" || f.complaint === "HP_NOT_HEATING"),
    key: ["aux_heat_ok"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      if (f.txt("aux_heat_ok") === "NO") o.support.push("Auxiliary heat does not energize on the call");
      if (f.txt("aux_heat_ok") === "YES") o.contradict.push("Auxiliary heat energizes");
      return o;
    },
    confirmationTest: "Verify W2/E call, sequencer/relay, limits and element resistance (power off) per the manufacturer.",
    safety: "High-amperage circuit — lock out before resistance checks.", corrective: { replace: "Element, sequencer or limit as confirmed", verify: "Amps per element and temperature rise." },
  },
  // ── Gas heat ──
  {
    id: "GAS_IGNITION", fault: "Gas ignition / flame-proving failure", category: "GAS_HEAT", followUps: ["ignition_sequence", "inducer_ok", "furnace_ps_status", "igniter_ok", "flame_sensor_ua", "gas_valve_ok"],
    applies: (f) => f.ctx.furnace && (f.complaint === "FURNACE_NOT_HEATING" || f.mode === "HEATING_GAS"),
    key: ["inducer_ok", "furnace_ps_status", "igniter_ok"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      if (f.txt("heat_call") === "NO") { o.contradict.push("No W call from the thermostat — the furnace isn't being asked to heat"); return o; }
      if (f.txt("inducer_ok") === "NO") o.support.push("Inducer does not run");
      if (f.txt("inducer_ok") === "YES" && f.txt("furnace_ps_status") === "NO") o.support.push("Inducer runs but the pressure switch does not close (venting, drain, tubing, switch)");
      if (f.txt("igniter_ok") === "NO") o.support.push("Igniter / spark does not operate");
      if (f.txt("gas_valve_ok") === "NO") o.support.push("Gas valve does not open on call");
      if ((f.txt("ignition_sequence") ?? "").trim()) o.support.push(`Observed sequence: ${f.txt("ignition_sequence")}`);
      if (f.num("flame_sensor_ua") != null) o.missing.push("Manufacturer minimum flame signal (µA) to judge the flame sensor");
      return o;
    },
    confirmationTest: "Follow the manufacturer's sequence-of-operation chart and the board's flash code; check inlet/manifold pressure against the rating plate.",
    safety: "Never bypass a pressure switch or limit. Check for gas leaks after any gas-train work.",
    corrective: { repair: "Component identified in the failed step", clean: "Flame sensor if signal is low per the manufacturer", verify: "Full ignition sequence, flame signal, temperature rise and combustion analysis." },
  },
  {
    id: "COMBUSTION_VENTING", fault: "Combustion or venting fault", category: "SAFETY", safetyCritical: true, followUps: ["co_flue_ppm", "venting_observation", "hx_inspection"],
    applies: (f) => f.ctx.furnace,
    key: ["hx_inspection", "venting_observation"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      if (f.safety.vent_problem) o.support.push("Vent disconnected / blocked / spilling");
      if (f.safety.flame_rollout) o.support.push("Flame rollout / scorching observed");
      if (f.safety.co_alarm) o.support.push("CO alarm / CO in the living space");
      if (f.alert("ROLLOUT_TRIPPED")) o.support.push("Rollout switch tripped");
      if (f.txt("hx_inspection") === "CONFIRMED" || f.txt("hx_inspection") === "SUSPECT") o.support.push(`Heat exchanger ${f.txt("hx_inspection") === "CONFIRMED" ? "breach confirmed" : "breach suspected"}`);
      if (f.num("co_flue_ppm") != null) o.missing.push("Manufacturer combustion specification to judge flue CO");
      if (f.txt("hx_inspection") === "NO_DEFECT" && !f.safety.vent_problem && !f.safety.flame_rollout && !f.safety.co_alarm) o.contradict.push("No heat exchanger defect or venting problem found");
      return o;
    },
    confirmationTest: "Combustion analysis per the manufacturer, vent inspection and draft test, heat-exchanger inspection (camera).",
    safety: "Unsafe condition: shut down and do not operate. Inform the customer in writing; follow company red-tag policy and local code.",
    corrective: { repair: "Venting / combustion fault as found", replace: "Heat exchanger or furnace if breached", verify: "Combustion analysis within the manufacturer specification and CO-free living space before returning to service." },
  },
  // ── Water ──
  {
    id: "CONDENSATE", fault: "Condensate drain / pan problem", category: "WATER", followUps: ["condensate_observation", "evap_coil_ice"],
    applies: (f) => f.complaint === "WATER_LEAK",
    key: ["condensate_observation"],
    evaluate: (f) => {
      const o: Out = { support: [], contradict: [], missing: [] };
      if ((f.txt("condensate_observation") ?? "").trim()) o.support.push(`Observed: ${f.txt("condensate_observation")}`);
      if (f.txt("evap_coil_ice") === "HEAVY" || f.txt("evap_coil_ice") === "LIGHT") o.support.push("Coil ice melting can overflow the pan — find the cause of icing");
      return o;
    },
    confirmationTest: "Inspect trap, drain line slope and pan; test the float switch; verify the coil isn't icing.",
    corrective: { clean: "Drain line and trap", repair: "Pan / float switch / slope", verify: "Water flows freely; float switch cuts the call when tripped." },
  },
];

export function runRules(input: {
  engine: EngineResult; equipment: EquipmentSpec; mode: string | null; complaint: string | null; safety: Record<string, boolean>;
  measurements: M; decisions?: Record<string, Decision>; fieldRules?: Partial<FieldRuleValues> | null;
}): RulesResult {
  const fr = resolveFieldRules(input.fieldRules);
  const { engine } = input;
  const ctx = engine.ctx;
  const circuits = Math.max(1, engine.charge.length || 1);
  const hyps: Hypothesis[] = [];

  for (let circuit = 1; circuit <= circuits; circuit++) {
    const ch = engine.charge.find((c) => c.circuit === circuit);
    const calc = (k: string, c?: number) => engine.calculated.find((x) => x.key === k && (x.circuit == null || x.circuit === (c ?? circuit)))?.value ?? null;
    const sh = vsTarget(calc("superheat_f"), input.equipment.specs?.targetSuperheat, input.equipment.specs?.chargeTolerance);
    const sc = vsTarget(calc("subcooling_f"), input.equipment.specs?.targetSubcooling, input.equipment.specs?.chargeTolerance);
    void ch;
    const f: Facts = {
      ctx, eq: input.equipment, mode: input.mode, complaint: input.complaint, safety: input.safety ?? {}, circuit,
      num: (k, c) => { const v = input.measurements[c ?? 1]?.[k]?.value ?? input.measurements[1]?.[k]?.value; return typeof v === "number" && Number.isFinite(v) ? v : null; },
      txt: (k, c) => input.measurements[c ?? 1]?.[k]?.text ?? input.measurements[1]?.[k]?.text ?? null,
      calc, alert: (code) => engine.alerts.some((a) => a.code === code && (a.circuit == null || a.circuit === circuit)),
      sh: sh.state, sc: sc.state, shNote: sh.note, scNote: sc.note,
      cooling: input.mode === "COOLING", fr,
    };
    for (const rule of RULES) {
      if (circuit > 1 && !["REFRIGERANT", "COMPRESSOR"].includes(rule.category)) continue;
      if (!rule.applies(f)) continue;
      const o = rule.evaluate(f);
      if (o.support.length === 0) continue;
      const keyMissing = (rule.key ?? []).filter((k) => f.num(k, circuit) == null && !f.txt(k, circuit));
      let status: HypothesisStatus =
        o.contradict.length >= o.support.length ? "POSSIBLE"
        : o.support.length >= 2 && o.contradict.length === 0 && keyMissing.length === 0 && o.missing.length === 0 ? "STRONGLY_SUSPECTED"
        : o.missing.length > 0 && o.support.length === 1 ? "INSUFFICIENT_DATA"
        : "POSSIBLE";
      const id = circuits > 1 && ["REFRIGERANT", "COMPRESSOR"].includes(rule.category) ? `${rule.id}#${circuit}` : rule.id;
      const decision = input.decisions?.[id];
      if (decision?.decision === "CONFIRMED") status = "CONFIRMED";
      if (decision?.decision === "REJECTED") status = "RULED_OUT";
      hyps.push({
        id, fault: circuits > 1 && id.includes("#") ? `${rule.fault} — circuit ${circuit}` : rule.fault, category: rule.category, status,
        support: o.support, contradict: o.contradict, missing: [...o.missing, ...keyMissing.map((k) => `Measurement: ${k}`)],
        confirmationTest: rule.confirmationTest, safety: rule.safety, safetyCritical: rule.safetyCritical,
        corrective: rule.corrective, followUps: rule.followUps, fieldRules: o.fieldRules ?? [], decision,
      });
    }
  }

  const rank: Record<HypothesisStatus, number> = { CONFIRMED: 0, STRONGLY_SUSPECTED: 1, POSSIBLE: 2, INSUFFICIENT_DATA: 3, RULED_OUT: 4 };
  hyps.sort((a, b) =>
    (b.safetyCritical ? 1 : 0) - (a.safetyCritical ? 1 : 0) ||
    rank[a.status] - rank[b.status] ||
    (b.support.length - b.contradict.length) - (a.support.length - a.contradict.length));

  // Next highest-value measurements: follow-ups of the top open hypotheses not yet recorded.
  const have = (k: string) => Object.values(input.measurements).some((m) => m[k] && (m[k].value != null || (m[k].text ?? "").trim()));
  const next: { key: string; reason: string }[] = [];
  for (const h of hyps.filter((x) => x.status !== "RULED_OUT" && x.status !== "CONFIRMED").slice(0, 4)) {
    for (const k of h.followUps) if (!have(k) && !next.some((n) => n.key === k)) next.push({ key: k, reason: `to confirm or rule out: ${h.fault}` });
  }

  const open = hyps.filter((h) => h.status !== "RULED_OUT");
  const summary = hyps.some((h) => h.status === "CONFIRMED")
    ? "Technician-confirmed finding(s) recorded."
    : open.some((h) => h.status === "STRONGLY_SUSPECTED")
      ? "Strongly suspected cause(s) identified — confirm with the listed test before repairing."
      : open.length
        ? "Possible causes identified — more evidence is needed before a reliable diagnosis."
        : "A reliable diagnosis cannot yet be established from the recorded measurements.";

  return { rulesetVersion: RULESET_VERSION, hypotheses: hyps, nextMeasurements: next.slice(0, 8), summary };
}

/** Fault catalog of the rule set (for ground-truth labelling and evaluation). */
export const FAULT_CATALOG = RULES.map((r) => ({ id: r.id, fault: r.fault, category: r.category, safetyCritical: !!r.safetyCritical }));
export type FaultId = (typeof FAULT_CATALOG)[number]["id"];
