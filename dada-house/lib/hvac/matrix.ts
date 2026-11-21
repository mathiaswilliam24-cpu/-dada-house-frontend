import type { EngineResult, EquipmentSpec, MeasurementValue } from "./engine";
import type { FieldRuleValues } from "./rules";
import { FIELD_BY_KEY } from "./catalog";

/**
 * Diagnostic matrix — classifies each parameter LOW / NORMAL / HIGH only against a VERIFIED reference:
 * the manufacturer data entered for this unit (charging chart, nameplate, blower/coil/filter data) or an
 * administrator-approved company field rule (shown as such). Without a reference a value is shown as
 * NO_REFERENCE — there are no universal "normal" PSI or temperature ranges in this module.
 * MISSING = relevant but not measured; INVALID = flagged as physically impossible / a probable entry error.
 */
export const MATRIX_VERSION = "hvac-matrix 1.0.0";

export type ParamStatus = "LOW" | "NORMAL" | "HIGH" | "MISSING" | "INVALID" | "NO_REFERENCE";
export type ParamGroup = "REFRIGERANT" | "AIR" | "PSYCHRO" | "ELECTRICAL";
export type ParamRow = {
  key: string; label: string; group: ParamGroup; circuit?: number;
  value: number | null; unit: string; expected: string | null; status: ParamStatus;
  basis: string | null; interpretation: string;
};
export type ShScState = "HIGH" | "LOW" | "NORMAL";
export type ShScCellId = `${ShScState}_${ShScState}`;
export type MatrixResult = {
  version: string;
  parameters: ParamRow[];
  shsc: { circuit: number; sh: ShScState | null; sc: ShScState | null; cell: ShScCellId | null; reason: string }[];
  correlations: string[];
};

type Input = {
  engine: EngineResult; equipment: EquipmentSpec; mode: string | null; circuits: number;
  measurements: Record<number, Record<string, MeasurementValue>>; fieldRules: FieldRuleValues;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function band(value: number, lo: number, hi: number): ParamStatus { return value < lo ? "LOW" : value > hi ? "HIGH" : "NORMAL"; }

export function buildMatrix(i: Input): MatrixResult {
  const { engine, equipment: eq, mode } = i;
  const sp = eq.specs ?? {};
  const ctx = engine.ctx;
  const circuits = Math.max(1, Math.min(8, i.circuits || 1));
  const cooling = mode === "COOLING";
  const heatingGas = mode === "HEATING_GAS";
  const running = mode !== "NOT_RUNNING" && mode !== "FAN_ONLY" && mode != null;
  const rows: ParamRow[] = [];
  const meas = (k: string, c = 1) => { const x = i.measurements[c]?.[k]?.value; return num(x) ? x : null; };
  const calc = (k: string, c?: number) => engine.calculated.find((x) => x.key === k && (c == null || x.circuit == null || x.circuit === c))?.value ?? null;
  const PSY_ERR = ["WB_ABOVE_DB", "RH_OUT_OF_RANGE", "BELOW_ZERO_W", "OUT_OF_RANGE"];
  const invalid = (k: string, c?: number) => engine.alerts.some((a) => {
    if (a.circuit != null && c != null && a.circuit !== c) return false;
    if (a.code === `RANGE_${k}`) return true;
    const side = k.startsWith("return_") ? "RETURN" : k.startsWith("supply_") && k !== "supply_v" && !k.includes("static") ? "SUPPLY" : null;
    return !!side && PSY_ERR.some((e) => a.code === `PSYCHRO_${side}_${e}`);
  });
  const wbOutside = (() => {
    const wb = meas("return_wb_f") ?? calc("return_wb_calc_f"), od = meas("outdoor_ambient_f");
    const out: string[] = [];
    if (wb != null && num(sp.indoorWbMin) && num(sp.indoorWbMax) && (wb < sp.indoorWbMin || wb > sp.indoorWbMax)) out.push(`indoor WB ${r1(wb)} °F outside the chart's ${sp.indoorWbMin}–${sp.indoorWbMax} °F`);
    if (od != null && num(sp.outdoorDbMin) && num(sp.outdoorDbMax) && (od < sp.outdoorDbMin || od > sp.outdoorDbMax)) out.push(`outdoor ${r1(od)} °F outside the chart's ${sp.outdoorDbMin}–${sp.outdoorDbMax} °F`);
    return out;
  })();

  type Def = { key: string; label: string; group: ParamGroup; unit: string; perCircuit?: boolean; source: "m" | "c"; relevant: boolean;
    classify?: (v: number, c: number) => { status: ParamStatus; expected: string; basis: string } | null };
  const chart = (target: unknown, tol: unknown, unit: string, what: string) => (v: number) => {
    if (!num(target) || !num(tol)) return null;
    if (wbOutside.length) return { status: "NO_REFERENCE" as const, expected: `${target} ±${tol} ${unit}`, basis: `Manufacturer chart not applicable: ${wbOutside.join("; ")}` };
    return { status: band(v, target - tol, target + tol), expected: `${target} ±${tol} ${unit}`, basis: `Manufacturer ${what} entered for this unit` };
  };
  const refRelevant = ctx.refrigeration && running && !ctx.inverter;
  const defs: Def[] = [
    { key: "suction_psig", label: "Suction pressure", group: "REFRIGERANT", unit: "psig", perCircuit: true, source: "m", relevant: ctx.refrigeration && running, classify: cooling ? chart(sp.suctionTargetPsig, sp.pressureTolerancePsi, "psig", "charging-chart suction pressure") : undefined },
    { key: "high_psig", label: "High-side pressure", group: "REFRIGERANT", unit: "psig", perCircuit: true, source: "m", relevant: ctx.refrigeration && running, classify: cooling ? chart(sp.highTargetPsig, sp.pressureTolerancePsi, "psig", "charging-chart high-side pressure") : undefined },
    { key: "evap_sat_f", label: "Evaporator saturation (dew)", group: "REFRIGERANT", unit: "°F", perCircuit: true, source: "c", relevant: ctx.refrigeration && running },
    { key: "cond_sat_bubble_f", label: "Condensing saturation (bubble)", group: "REFRIGERANT", unit: "°F", perCircuit: true, source: "c", relevant: ctx.refrigeration && running },
    { key: "suction_line_f", label: "Suction line temperature", group: "REFRIGERANT", unit: "°F", perCircuit: true, source: "m", relevant: ctx.refrigeration && running },
    { key: "liquid_line_f", label: "Liquid line temperature", group: "REFRIGERANT", unit: "°F", perCircuit: true, source: "m", relevant: ctx.refrigeration && running },
    { key: "superheat_f", label: "Superheat", group: "REFRIGERANT", unit: "°F", perCircuit: true, source: "c", relevant: refRelevant, classify: cooling ? chart(sp.targetSuperheat, sp.chargeTolerance, "°F", "target superheat") : undefined },
    { key: "subcooling_f", label: "Subcooling", group: "REFRIGERANT", unit: "°F", perCircuit: true, source: "c", relevant: refRelevant, classify: cooling ? chart(sp.targetSubcooling, sp.chargeTolerance, "°F", "target subcooling") : undefined },
    { key: "compression_ratio", label: "Compression ratio", group: "REFRIGERANT", unit: ":1", perCircuit: true, source: "c", relevant: ctx.refrigeration && running,
      classify: (v) => cooling ? { status: v < i.fieldRules.lowCompressionRatio ? "LOW" : "NORMAL", expected: `≥ ${i.fieldRules.lowCompressionRatio}:1`, basis: "Company field rule (cooling) — confirm with manufacturer performance data" } : null },
    { key: "outdoor_ambient_f", label: "Outdoor ambient", group: "AIR", unit: "°F", source: "m", relevant: ctx.refrigeration,
      classify: (v) => num(sp.outdoorDbMin) && num(sp.outdoorDbMax) ? { status: band(v, sp.outdoorDbMin, sp.outdoorDbMax), expected: `${sp.outdoorDbMin}–${sp.outdoorDbMax} °F`, basis: "Range covered by the manufacturer charging chart / operating envelope" } : null },
    { key: "return_db_f", label: "Return dry bulb", group: "PSYCHRO", unit: "°F", source: "m", relevant: true },
    { key: "return_wb_f", label: "Return wet bulb", group: "PSYCHRO", unit: "°F", source: "m", relevant: cooling,
      classify: (v) => num(sp.indoorWbMin) && num(sp.indoorWbMax) ? { status: band(v, sp.indoorWbMin, sp.indoorWbMax), expected: `${sp.indoorWbMin}–${sp.indoorWbMax} °F`, basis: "Range covered by the manufacturer charging chart" } : null },
    { key: "return_rh_calc_pct", label: "Return relative humidity", group: "PSYCHRO", unit: "%", source: "c", relevant: false },
    { key: "return_dp_f", label: "Return dew point", group: "PSYCHRO", unit: "°F", source: "c", relevant: false },
    { key: "supply_db_f", label: "Supply dry bulb", group: "PSYCHRO", unit: "°F", source: "m", relevant: true },
    { key: "supply_wb_f", label: "Supply wet bulb", group: "PSYCHRO", unit: "°F", source: "m", relevant: false },
    { key: "supply_rh_calc_pct", label: "Supply relative humidity", group: "PSYCHRO", unit: "%", source: "c", relevant: false },
    { key: "supply_dp_f", label: "Supply dew point", group: "PSYCHRO", unit: "°F", source: "c", relevant: false },
    { key: "air_dt_f", label: "Delta T (return − supply)", group: "AIR", unit: "°F", source: "c", relevant: cooling },
    { key: "temp_rise_f", label: "Temperature rise", group: "AIR", unit: "°F", source: "c", relevant: heatingGas,
      classify: (v) => num(sp.tempRiseMin) && num(sp.tempRiseMax) ? { status: band(v, sp.tempRiseMin, sp.tempRiseMax), expected: `${sp.tempRiseMin}–${sp.tempRiseMax} °F`, basis: "Furnace nameplate temperature-rise range" } : null },
    { key: "airflow_cfm", label: "Airflow (measured)", group: "AIR", unit: "CFM", source: "m", relevant: cooling || heatingGas,
      classify: (v) => num(sp.ratedCfm) && num(sp.cfmTolerancePct) ? { status: band(v, sp.ratedCfm * (1 - sp.cfmTolerancePct / 100), sp.ratedCfm * (1 + sp.cfmTolerancePct / 100)), expected: `${sp.ratedCfm} CFM ±${sp.cfmTolerancePct} %`, basis: "Manufacturer airflow target and tolerance for this mode/speed" } : null },
    { key: "tesp_inwc", label: "Total external static pressure", group: "AIR", unit: "in. w.c.", source: "m", relevant: cooling || heatingGas || mode === "HEATING_HP",
      classify: (v) => num(sp.maxTesp) ? { status: v > sp.maxTesp ? "HIGH" : "NORMAL", expected: `≤ ${sp.maxTesp} in. w.c.`, basis: "Equipment rated maximum external static" } : null },
    { key: "return_static_inwc", label: "Return static", group: "AIR", unit: "in. w.c.", source: "m", relevant: false },
    { key: "supply_static_inwc", label: "Supply static", group: "AIR", unit: "in. w.c.", source: "m", relevant: false },
    { key: "filter_drop_inwc", label: "Filter pressure drop", group: "AIR", unit: "in. w.c.", source: "m", relevant: false,
      classify: (v) => num(sp.filterMaxDrop) ? { status: v > sp.filterMaxDrop ? "HIGH" : "NORMAL", expected: `≤ ${sp.filterMaxDrop} in. w.c.`, basis: "Filter manufacturer / design pressure drop" } : null },
    { key: "coil_drop_inwc", label: "Coil pressure drop", group: "AIR", unit: "in. w.c.", source: "m", relevant: false,
      classify: (v) => num(sp.coilMaxDrop) ? { status: v > sp.coilMaxDrop ? "HIGH" : "NORMAL", expected: `≤ ${sp.coilMaxDrop} in. w.c.`, basis: "Coil manufacturer pressure drop at rated airflow" } : null },
    { key: "comp_amps", label: "Compressor amps", group: "ELECTRICAL", unit: "A", perCircuit: true, source: "m", relevant: ctx.refrigeration && running && !ctx.inverter,
      classify: (v) => num(eq.rla) ? { status: v > eq.rla ? "HIGH" : "NORMAL", expected: `≤ RLA ${eq.rla} A`, basis: "Compressor nameplate RLA (maximum continuous)" } : null },
    { key: "ofm_amps", label: "Outdoor fan amps", group: "ELECTRICAL", unit: "A", source: "m", relevant: false,
      classify: (v) => num(sp.ofmFla) ? { status: v > sp.ofmFla ? "HIGH" : "NORMAL", expected: `≤ FLA ${sp.ofmFla} A`, basis: "Fan motor nameplate FLA" } : null },
    { key: "blower_amps", label: "Blower amps", group: "ELECTRICAL", unit: "A", source: "m", relevant: false,
      classify: (v) => num(sp.blowerFla) ? { status: v > sp.blowerFla ? "HIGH" : "NORMAL", expected: `≤ FLA ${sp.blowerFla} A`, basis: "Blower motor nameplate FLA" } : null },
    { key: "supply_v", label: "Supply voltage", group: "ELECTRICAL", unit: "V", source: "m", relevant: true,
      classify: (v) => num(eq.minVoltage) && num(eq.maxVoltage) ? { status: band(v, eq.minVoltage, eq.maxVoltage), expected: `${eq.minVoltage}–${eq.maxVoltage} V`, basis: "Nameplate voltage range" } : null },
    { key: "voltage_imbalance_pct", label: "Voltage imbalance", group: "ELECTRICAL", unit: "%", source: "c", relevant: eq.phase === 3,
      classify: (v) => ({ status: v > i.fieldRules.voltageImbalancePct ? "HIGH" : "NORMAL", expected: `≤ ${i.fieldRules.voltageImbalancePct} %`, basis: "Company field rule — verify the manufacturer's limit" }) },
    { key: "cap_herm_measured_uf", label: "Capacitor µF (HERM)", group: "ELECTRICAL", unit: "µF", source: "m", relevant: false,
      classify: (v) => { const r = meas("cap_herm_rated_uf"), t = meas("cap_tolerance_pct"); return r != null && t != null ? { status: band(v, r * (1 - t / 100), r * (1 + t / 100)), expected: `${r} µF ±${t} %`, basis: "Capacitor label rating and tolerance" } : null; } },
    { key: "cap_fan_measured_uf", label: "Capacitor µF (FAN)", group: "ELECTRICAL", unit: "µF", source: "m", relevant: false,
      classify: (v) => { const r = meas("cap_fan_rated_uf"), t = meas("cap_tolerance_pct"); return r != null && t != null ? { status: band(v, r * (1 - t / 100), r * (1 + t / 100)), expected: `${r} µF ±${t} %`, basis: "Capacitor label rating and tolerance" } : null; } },
  ];

  for (const d of defs) {
    const cs = d.perCircuit ? Array.from({ length: circuits }, (_, k) => k + 1) : [1];
    for (const c of cs) {
      const value = d.source === "m" ? meas(d.key, c) : calc(d.key, d.perCircuit ? c : undefined);
      if (value == null && !d.relevant) continue;
      const circuit = d.perCircuit && circuits > 1 ? c : undefined;
      let status: ParamStatus, expected: string | null = null, basis: string | null = null;
      if (value == null) status = "MISSING";
      else if (invalid(d.key, d.perCircuit ? c : undefined) || (d.key === "superheat_f" && value < -0.5) || (d.key === "subcooling_f" && value < -0.5)) { status = "INVALID"; basis = "Flagged as impossible or a probable entry error — re-measure"; }
      else {
        const k = d.classify?.(value, c) ?? null;
        if (k) ({ status, expected, basis } = k); else status = "NO_REFERENCE";
      }
      const info = PARAM_INFO[d.key];
      const interpretation = status === "LOW" ? info?.low ?? "" : status === "HIGH" ? info?.high ?? "" : status === "NORMAL" ? "Within the reference." : status === "MISSING" ? (info?.how ?? "Not measured yet.") : status === "INVALID" ? "Reading not usable." : "No verified reference for this unit — enter the manufacturer data to classify it.";
      rows.push({ key: d.key, label: d.label, group: d.group, circuit, value: value != null ? r1(value) : null, unit: d.unit, expected, status, basis, interpretation });
    }
  }

  // ── Superheat / subcooling cell per circuit ──
  const shsc: MatrixResult["shsc"] = [];
  if (ctx.refrigeration && cooling) {
    for (let c = 1; c <= circuits; c++) {
      const state = (k: string): ShScState | null => { const r = rows.find((x) => x.key === k && (x.circuit ?? 1) === c); return r && (r.status === "LOW" || r.status === "HIGH" || r.status === "NORMAL") ? r.status : null; };
      const sh = state("superheat_f"), sc = state("subcooling_f");
      const reason = ctx.inverter ? "Inverter / variable-speed: fixed-speed superheat/subcooling patterns are not applied — use the manufacturer's service mode."
        : sh && sc ? "Both classified against the manufacturer targets."
        : "Needs superheat AND subcooling with the manufacturer targets and tolerance (charging chart / unit label).";
      shsc.push({ circuit: c, sh: ctx.inverter ? null : sh, sc: ctx.inverter ? null : sc, cell: !ctx.inverter && sh && sc ? `${sh}_${sc}` as ShScCellId : null, reason });
    }
  }

  // ── Refrigeration ↔ airflow correlation ──
  const correlations: string[] = [];
  const st = (k: string) => rows.find((x) => x.key === k)?.status;
  const airflowBad = st("airflow_cfm") === "LOW" || st("airflow_cfm") === "HIGH" || st("tesp_inwc") === "HIGH" || st("filter_drop_inwc") === "HIGH" || st("coil_drop_inwc") === "HIGH";
  const refAbnormal = shsc.some((x) => x.cell && x.cell !== "NORMAL_NORMAL") || st("suction_psig") === "LOW" || st("suction_psig") === "HIGH";
  if (cooling && airflowBad && refAbnormal) correlations.push("Indoor airflow is outside its reference AND the refrigerant readings are abnormal: correct the airflow first, let the system stabilize and re-measure before judging the charge. Do not add or remove refrigerant yet.");
  if (cooling && refAbnormal && !airflowBad && st("airflow_cfm") !== "NORMAL" && st("tesp_inwc") !== "NORMAL") correlations.push("Refrigerant readings are abnormal but airflow has not been verified against a manufacturer reference — measure static pressure (and airflow if possible) before concluding a charge or metering fault.");
  if (cooling && refAbnormal && (st("airflow_cfm") === "NORMAL" || st("tesp_inwc") === "NORMAL") && !airflowBad) correlations.push("Airflow is within its reference, so the refrigerant pattern is more likely a refrigerant-side cause (charge, metering, restriction, compressor). Confirm with the tests listed for the matrix cell.");
  if (cooling && st("high_psig") === "HIGH" && st("outdoor_ambient_f") === "HIGH") correlations.push("High head pressure with the outdoor temperature above the chart range: the manufacturer chart cannot be used to separate overcharge from heat-rejection problems today.");
  if (wbOutside.length && cooling) correlations.push(`Today's conditions are outside the manufacturer charging chart (${wbOutside.join("; ")}) — chart-based classifications are not applied.`);

  return { version: MATRIX_VERSION, parameters: rows, shsc, correlations };
}

// ─────────────────────────────────────────────────────────────────────────────
// Parameter explanations (general field guidance — not manufacturer data)
// ─────────────────────────────────────────────────────────────────────────────
export type ParamInfo = { what: string; how: string; low: string; high: string; next: string };
export const PARAM_INFO: Record<string, ParamInfo> = {
  suction_psig: { what: "Low-side (vapor) pressure; sets the evaporator saturation temperature.", how: "Gauge or transducer on the suction service port with the system stabilized.", low: "Low charge, restriction (metering, drier, liquid line), low indoor airflow or low indoor load.", high: "Overcharge, overfeeding metering device, high indoor load, inefficient compressor.", next: "Compare superheat with the manufacturer target and verify indoor airflow." },
  high_psig: { what: "High-side (liquid/discharge) pressure; sets the condensing saturation temperature.", how: "Gauge or transducer on the liquid service port.", low: "Low charge, low outdoor temperature, inefficient compressor, restriction upstream of the liquid port.", high: "Dirty condenser or poor outdoor airflow, overcharge, non-condensables, high outdoor temperature, restriction downstream.", next: "Check condenser coil and fan, then compare subcooling with the manufacturer target." },
  evap_sat_f: { what: "Refrigerant boiling (dew) temperature in the evaporator at the measured suction pressure.", how: "Calculated from suction pressure and the refrigerant's verified property data.", low: "Low airflow/load, low charge or restriction — below 32 °F the coil can freeze.", high: "High load, overfeeding or compressor not pumping.", next: "Compare with return-air temperature (evaporator TD) and superheat." },
  cond_sat_bubble_f: { what: "Refrigerant condensing (bubble) temperature at the measured high-side pressure.", how: "Calculated from high-side pressure and verified property data.", low: "Low charge, low ambient, compressor not pumping.", high: "Heat-rejection problem, overcharge, non-condensables.", next: "Compare with outdoor ambient (condensing over ambient) and subcooling." },
  suction_line_f: { what: "Vapor line temperature used for superheat.", how: "Insulated clamp probe within 6 in. of the suction pressure port.", low: "Liquid reaching the measuring point (overfeed, low load/airflow).", high: "Starved evaporator (low charge, restriction).", next: "Calculate superheat." },
  liquid_line_f: { what: "Liquid line temperature used for subcooling.", how: "Insulated clamp probe near the liquid pressure port.", low: "Large subcooling (refrigerant stacking in the condenser).", high: "Little subcooling (low charge, flash gas).", next: "Calculate subcooling." },
  superheat_f: { what: "Heat added to the vapor after it finished boiling: suction line temp − evaporator dew temp.", how: "Pressure + temperature at the same suction point, stabilized.", low: "Overfeeding: overcharge (fixed orifice), TXV overfeeding/bulb problem, low indoor airflow or load.", high: "Starving: low charge, metering or liquid-line restriction, high indoor load (fixed orifice).", next: "Read it together with subcooling and airflow (see the matrix)." },
  subcooling_f: { what: "Cooling of the liquid below its condensing (bubble) temperature: condensing bubble − liquid line temp.", how: "Pressure + temperature at the liquid line, stabilized.", low: "Low charge or a restriction before the measuring point.", high: "Overcharge, or refrigerant backing up behind a restriction (metering, drier).", next: "Read it together with superheat (see the matrix)." },
  compression_ratio: { what: "Absolute discharge ÷ absolute suction pressure — how hard the compressor is pumping.", how: "Calculated from both pressures (psia).", low: "Compressor not pumping (valves, scroll), or bypass inside.", high: "Low suction and/or high head — check airflow, charge, condenser.", next: "Compare amps and pressures with the manufacturer performance data." },
  outdoor_ambient_f: { what: "Air temperature entering the condenser.", how: "Shaded probe at the condenser air inlet.", low: "Below the charging-chart range: charge checks are not reliable.", high: "Above the chart range: head pressure will be high; chart may not apply.", next: "Use the manufacturer chart only inside its range." },
  return_db_f: { what: "Dry-bulb temperature of the air entering the indoor coil.", how: "Probe in the return near the unit.", low: "Low indoor load.", high: "High indoor load.", next: "Measure wet bulb or RH for enthalpy." },
  return_wb_f: { what: "Wet-bulb of the entering air — sets the latent load and the charging-chart row.", how: "Psychrometer with a wet wick, or calculated from RH.", low: "Low load — fixed-orifice superheat will be low.", high: "High latent load — superheat on a fixed orifice will be higher.", next: "Check it is inside the manufacturer chart range." },
  supply_db_f: { what: "Dry-bulb temperature leaving the coil/unit.", how: "Probe in the supply plenum, out of radiant heat.", low: "Large split: low airflow or low load.", high: "Small split: low capacity or high airflow.", next: "Calculate Delta T / temperature rise." },
  air_dt_f: { what: "Return dry bulb − supply dry bulb.", how: "Calculated.", low: "High airflow, low capacity (charge, compressor) or high latent load.", high: "Low airflow or low latent load.", next: "A split alone never proves the charge — combine with airflow and enthalpy." },
  temp_rise_f: { what: "Supply − return temperature in heating.", how: "Calculated after the furnace reaches steady state.", low: "High airflow or under-firing.", high: "Low airflow or over-firing — can trip the high limit.", next: "Check static pressure and gas pressures / clocking." },
  airflow_cfm: { what: "Volume of air moved by the blower.", how: "Measured (flow hood, traverse, flow grid) — not estimated.", low: "Dirty filter/coil/wheel, duct restriction, wrong blower setting, motor fault.", high: "Wrong blower setting, missing filter, oversized ducts — reduces dehumidification.", next: "Measure static pressure and check the blower setting against the manufacturer table." },
  tesp_inwc: { what: "Total external static pressure the blower works against.", how: "Return static (before the blower) + supply static (after coil/heat exchanger).", low: "Missing filter, oversized ducts, or a reading taken in the wrong place.", high: "Restrictions: filter, coil, ducts, dampers, undersized return.", next: "Split return vs supply static and check filter/coil drops." },
  filter_drop_inwc: { what: "Pressure lost across the filter.", how: "Static before and after the filter.", low: "Clean or missing filter.", high: "Dirty or too restrictive filter.", next: "Replace / upgrade the filter and re-measure TESP." },
  coil_drop_inwc: { what: "Pressure lost across the indoor coil.", how: "Static before and after the coil.", low: "—", high: "Dirty or iced coil, or airflow above design.", next: "Inspect the coil; compare with the manufacturer wet-coil drop." },
  comp_amps: { what: "Compressor running current.", how: "Clamp meter on the common lead, stabilized.", low: "Light load, low charge, or compressor not pumping.", high: "High head, voltage problem, mechanical wear.", next: "Check voltage and head pressure; compare with the manufacturer performance data." },
  ofm_amps: { what: "Outdoor fan motor current.", how: "Clamp meter on the motor lead.", low: "Slipping/light load.", high: "Bearings, weak capacitor, wrong blade.", next: "Check capacitor and bearings." },
  blower_amps: { what: "Indoor blower motor current.", how: "Clamp meter on the motor lead.", low: "Restricted airflow on a PSC (less air moved = less load).", high: "Bearings, high airflow, wrong speed.", next: "Check static pressure and the motor/capacitor." },
  supply_v: { what: "Line voltage at the unit.", how: "Meter at the disconnect / contactor, idle and under load.", low: "Undersized wiring, loose connections, utility supply.", high: "Utility supply.", next: "Measure under load (compressor starting and running)." },
  voltage_imbalance_pct: { what: "Largest deviation of the three line voltages from their average.", how: "Measure L1-L2, L2-L3, L1-L3.", low: "—", high: "Utility or connection problem — overheats 3-phase motors.", next: "Check connections, then contact the utility." },
  cap_herm_measured_uf: { what: "Measured capacitance of the compressor side.", how: "Power off, discharged, measured out of circuit.", low: "Weak capacitor — compressor hard-starts or runs hot.", high: "Wrong capacitor installed.", next: "Replace with the rated µF and voltage." },
  cap_fan_measured_uf: { what: "Measured capacitance of the fan side.", how: "Power off, discharged, measured out of circuit.", low: "Weak capacitor — slow fan, high head.", high: "Wrong capacitor installed.", next: "Replace with the rated µF and voltage." },
};

// ─────────────────────────────────────────────────────────────────────────────
// Superheat & subcooling diagnostic matrix — fixed-speed equipment in cooling, readings classified against
// the MANUFACTURER targets. General field patterns, not universal truths: airflow must be verified first.
// ─────────────────────────────────────────────────────────────────────────────
export type ShScCell = {
  sh: ShScState; sc: ShScState; suction: string; head: string;
  likely: { label: string; ruleId?: string }[]; evidence: string[]; tests: string[]; actions: string[];
};
export const SHSC_MATRIX: ShScCell[] = [
  { sh: "HIGH", sc: "LOW", suction: "Low", head: "Low or normal",
    likely: [{ label: "Refrigerant undercharge / leak", ruleId: "LOW_CHARGE" }],
    evidence: ["Normal indoor airflow", "Oil stains / leak evidence", "Service history of refrigerant added"],
    tests: ["Confirm indoor airflow and static pressure first", "Verify metering device type", "Compare with the manufacturer charging data", "Leak search before adding any refrigerant"],
    actions: ["Locate and repair the leak", "Replace drier if the system is opened", "Evacuate and weigh in the nameplate charge, then verify"] },
  { sh: "HIGH", sc: "HIGH", suction: "Low", head: "Normal or high",
    likely: [{ label: "Restricted metering device (TXV/piston)", ruleId: "METERING_RESTRICTION" }, { label: "Restricted filter drier / liquid line", ruleId: "DRIER_RESTRICTION" }],
    evidence: ["Temperature drop across the drier", "Frost/sweat after the restriction", "TXV bulb lost charge"],
    tests: ["Measure temperature before/after the filter drier", "Measure temperature drop across the metering device", "Check TXV bulb and equalizer; inspect piston/strainer"],
    actions: ["Replace the restricted component and the drier", "Evacuate, weigh in charge, verify SH/SC"] },
  { sh: "LOW", sc: "HIGH", suction: "High", head: "High",
    likely: [{ label: "Refrigerant overcharge", ruleId: "OVERCHARGE" }],
    evidence: ["Recent refrigerant added", "Clean condenser coil and fan running normally"],
    tests: ["Clean / verify the condenser first", "Compare with the manufacturer charging chart at today's conditions"],
    actions: ["Recover refrigerant to the manufacturer target (never vent)"] },
  { sh: "LOW", sc: "LOW", suction: "High or normal", head: "Low",
    likely: [{ label: "Inefficient / not-pumping compressor", ruleId: "COMPRESSOR_MECHANICAL" }, { label: "TXV overfeeding", ruleId: "TXV_OVERFEED" }, { label: "Low evaporator load / airflow (fixed orifice)", ruleId: "LOW_EVAP_LOAD" }],
    evidence: ["Low compression ratio", "Low amps for the conditions", "Loose TXV bulb"],
    tests: ["Compare pressures and amps with the manufacturer performance data", "Verify indoor airflow and load", "Check the TXV bulb mounting"],
    actions: ["Correct airflow/bulb first; replace the compressor only after charge, airflow and metering are verified"] },
  { sh: "NORMAL", sc: "HIGH", suction: "Normal", head: "High",
    likely: [{ label: "Overcharge on a TXV/EEV system (valve holds superheat)", ruleId: "OVERCHARGE" }, { label: "Condenser heat-rejection problem", ruleId: "DIRTY_CONDENSER" }],
    evidence: ["Dirty condenser / recirculation", "Outdoor fan speed"],
    tests: ["Inspect the condenser coil and fan", "Compare head pressure with the manufacturer chart"],
    actions: ["Clean the condenser; adjust charge to the target only after it is clean"] },
  { sh: "NORMAL", sc: "LOW", suction: "Normal or low", head: "Low",
    likely: [{ label: "Undercharge on a TXV/EEV system (valve compensating)", ruleId: "LOW_CHARGE" }],
    evidence: ["Bubbles in a sight glass (if fitted)", "Leak evidence"],
    tests: ["Leak search", "Check the outdoor temperature is within the chart range"],
    actions: ["Repair the leak, then charge by the manufacturer method"] },
  { sh: "HIGH", sc: "NORMAL", suction: "Low or normal", head: "Normal",
    likely: [{ label: "Metering device underfeeding (TXV bulb/adjustment)", ruleId: "METERING_RESTRICTION" }, { label: "High indoor load on a fixed orifice", ruleId: "HIGH_LATENT_LOAD" }],
    evidence: ["Indoor wet bulb above the chart range", "TXV bulb condition"],
    tests: ["Check indoor wet bulb against the chart", "Inspect TXV bulb and equalizer"],
    actions: ["Correct the metering problem; re-test when the load is within the chart range"] },
  { sh: "LOW", sc: "NORMAL", suction: "Normal or high", head: "Normal",
    likely: [{ label: "TXV overfeeding / bulb loose", ruleId: "TXV_OVERFEED" }, { label: "Low indoor airflow or load", ruleId: "LOW_INDOOR_AIRFLOW" }],
    evidence: ["High static / dirty filter or coil", "Loose or uninsulated TXV bulb"],
    tests: ["Measure static pressure and airflow", "Check the TXV bulb"],
    actions: ["Correct airflow or bulb mounting, then re-measure"] },
  { sh: "NORMAL", sc: "NORMAL", suction: "Normal", head: "Normal",
    likely: [],
    evidence: [],
    tests: ["If the complaint persists, look at airflow, duct losses, electrical and controls"],
    actions: ["No charge adjustment indicated"] },
];
export const SHSC_CELL = Object.fromEntries(SHSC_MATRIX.map((c) => [`${c.sh}_${c.sc}`, c])) as Record<ShScCellId, ShScCell>;
export const fieldLabel = (k: string) => FIELD_BY_KEY[k]?.label ?? k;
