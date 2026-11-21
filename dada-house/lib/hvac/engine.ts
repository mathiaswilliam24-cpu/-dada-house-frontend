import { FIELDS, FIELD_BY_KEY, SAFETY_CHECKS, buildCtx, isRequired, categoryInfo, type Ctx } from "./catalog";
import { saturationF, refrigerantInfo, isA2L, PT_DATA_VERSION, OutOfRangeError, type RefrigerantInfo } from "./refrigerants";
import { ATM_PSI, type Kind } from "./units";
import { airState, pressureAtElevation, PSYCHRO_SOURCE, type AirState } from "./psychro";

/**
 * HVAC Diagnostic Pro — Layer A (deterministic engine).
 * Pure function: same inputs → same outputs. Calculations only use the technician's measurements,
 * the verified equipment specifications and the generated refrigerant tables. Nothing is estimated:
 * when data is missing the result says so.
 */
export const ENGINE_VERSION = "hvac-engine 1.1.0";

export type Specs = {
  targetSuperheat?: number | null;   // °F — from the manufacturer charging chart at today's conditions
  targetSubcooling?: number | null;  // °F — from the nameplate / installation instructions
  chargeTolerance?: number | null;   // ±°F stated by the manufacturer
  tempRiseMin?: number | null;       // °F — furnace nameplate
  tempRiseMax?: number | null;
  maxTesp?: number | null;           // in. w.c. — rated external static
  ratedCfm?: number | null;          // CFM required/rated by the manufacturer at this speed
  manifoldMin?: number | null;       // in. w.c.
  manifoldMax?: number | null;
  inletMin?: number | null;
  inletMax?: number | null;
  // Manufacturer charging chart / operating data at today's conditions (never generic values)
  suctionTargetPsig?: number | null;   // expected suction pressure from the manufacturer chart
  highTargetPsig?: number | null;      // expected liquid/high-side pressure from the manufacturer chart
  pressureTolerancePsi?: number | null; // ± psi stated by the manufacturer chart
  cfmTolerancePct?: number | null;     // ± % around ratedCfm
  filterMaxDrop?: number | null;       // in. w.c. — filter manufacturer max / design drop
  coilMaxDrop?: number | null;         // in. w.c. — coil manufacturer pressure drop at rated airflow (wet coil)
  indoorWbMin?: number | null;         // °F — range covered by the charging chart / operating envelope
  indoorWbMax?: number | null;
  outdoorDbMin?: number | null;        // °F
  outdoorDbMax?: number | null;
  ofmFla?: number | null;              // A — outdoor fan motor FLA (nameplate)
  blowerFla?: number | null;           // A — indoor blower motor FLA (nameplate)
};

export type EquipmentSpec = {
  category?: string | null; manufacturer?: string | null; modelNumber?: string | null; serialNumber?: string | null;
  refrigerant?: string | null; meteringDevice?: string | null; compressorType?: string | null;
  phase?: number | null; minVoltage?: number | null; maxVoltage?: number | null;
  rla?: number | null; lra?: number | null; mca?: number | null; mocp?: number | null;
  capacityTons?: number | null; circuits?: number | null;
  specs?: Specs | null;
};

export type MeasurementValue = { value?: number | null; text?: string | null };
export type EngineInput = {
  equipment: EquipmentSpec;
  mode: string | null;
  complaint: string | null;
  circuits: number;
  /** measurements[circuit][key]; non-circuit values live in circuit 1 */
  measurements: Record<number, Record<string, MeasurementValue>>;
  safety: Record<string, boolean>;
};

export type CalcValue = { circuit?: number; key: string; label: string; value: number; kind: Kind; unit: string; formula: string; note?: string };
export type Severity = "CRITICAL" | "WARNING" | "INFO";
export type Alert = { severity: Severity; code: string; message: string; circuit?: number; action?: string };
export type ChargeStatus = "WITHIN_TARGET" | "OUTSIDE_TARGET" | "DEVIATION_ONLY" | "INSUFFICIENT_DATA" | "NOT_APPLICABLE";
export type ChargeAssessment = { circuit: number; status: ChargeStatus; method: "SUBCOOLING" | "SUPERHEAT" | null; actual?: number; target?: number; tolerance?: number; reason: string };
export type EngineResult = {
  engineVersion: string; ptDataVersion: string; computedAt: string;
  refrigerant: RefrigerantInfo | null;
  calculated: CalcValue[];
  charge: ChargeAssessment[];
  alerts: Alert[];
  missing: { key: string; label: string; circuit?: number }[];
  ctx: Ctx;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const num = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

export function runEngine(input: EngineInput): EngineResult {
  const eq = input.equipment ?? {};
  const specs = eq.specs ?? {};
  const ctx = buildCtx({ category: eq.category, complaint: input.complaint, mode: input.mode, phase: eq.phase, compressorType: eq.compressorType });
  const ref = refrigerantInfo(eq.refrigerant);
  const calculated: CalcValue[] = [];
  const alerts: Alert[] = [];
  const charge: ChargeAssessment[] = [];
  const m1 = input.measurements[1] ?? {};
  const v = (key: string, circuit = 1): number | null => {
    const x = (input.measurements[circuit] ?? {})[key]?.value;
    return num(x) ? x : null;
  };
  const t = (key: string, circuit = 1) => (input.measurements[circuit] ?? {})[key]?.text ?? null;
  const add = (c: CalcValue) => calculated.push({ ...c, value: c.kind === "static" ? Math.round(c.value * 100) / 100 : r1(c.value) });
  const cooling = input.mode === "COOLING";
  const running = input.mode !== "NOT_RUNNING" && input.mode !== "FAN_ONLY";
  const circuits = Math.max(1, Math.min(8, input.circuits || 1));

  // ── Safety ──
  for (const s of SAFETY_CHECKS) {
    if (input.safety?.[s.key]) {
      alerts.push({ severity: s.critical ? "CRITICAL" : "WARNING", code: `SAFETY_${s.key.toUpperCase()}`, message: s.label, action: s.action });
    }
  }
  const hx = t("hx_inspection");
  if (hx === "CONFIRMED") alerts.push({ severity: "CRITICAL", code: "HX_BREACH", message: "Heat exchanger crack / breach confirmed", action: "Shut the furnace down and do not operate it. Inform the customer in writing and follow company red-tag policy and local code." });
  else if (hx === "SUSPECT") alerts.push({ severity: "WARNING", code: "HX_SUSPECT", message: "Heat exchanger breach suspected", action: "Confirm with the manufacturer's inspection procedure (camera, combustion analysis) before operating long-term." });
  const lim = t("limit_status");
  if (lim === "ROLLOUT_OPEN") alerts.push({ severity: "CRITICAL", code: "ROLLOUT_TRIPPED", message: "Flame rollout switch is open / tripped", action: "Do not reset repeatedly or bypass it. A rollout trip means flame left the combustion area — inspect venting, heat exchanger and burners first." });
  else if (lim === "HIGH_LIMIT_OPEN") alerts.push({ severity: "WARNING", code: "HIGH_LIMIT_OPEN", message: "High limit is open", action: "Never jumper a limit. Check airflow (filter, blower, static pressure) and temperature rise." });
  if (ref && isA2L(ref.key)) {
    alerts.push({ severity: "WARNING", code: "A2L_REFRIGERANT", message: `${ref.label} is an A2L (mildly flammable) refrigerant`,
      action: "Use A2L-rated recovery equipment, vacuum pump and leak detector; no ignition sources in the work area; follow the manufacturer's A2L service instructions and the unit's UL 60335-2-40 labels." });
  }
  if (ref && !ref.verified) {
    alerts.push({ severity: "INFO", code: "PT_UNVERIFIED", message: `${ref.label} saturation values come from the CoolProp ${ref.kind.includes("blend") ? "mixture model" : "model"} and have not yet been checked against the refrigerant manufacturer's PT chart — cross-check before acting on them.` });
  }
  if (ctx.inverter) {
    alerts.push({ severity: "INFO", code: "INVERTER_LIMITS", message: "Inverter / variable-speed equipment: fixed-speed charging rules do not apply. Use the manufacturer's service mode, diagnostic tree and operating envelope. Capacitor tests do not apply to inverter compressors." });
  }

  // ── Range checks (probable entry errors) ──
  for (let c = 1; c <= circuits; c++) {
    for (const [key, mv] of Object.entries(input.measurements[c] ?? {})) {
      const f = FIELD_BY_KEY[key];
      if (!f?.range || !num(mv.value)) continue;
      if (mv.value < f.range[0] || mv.value > f.range[1]) {
        alerts.push({ severity: "WARNING", code: `RANGE_${key}`, circuit: f.perCircuit ? c : undefined,
          message: `${f.label}: ${mv.value} ${f.kind === "temp" ? "°F" : f.kind === "pressure" ? "psig" : f.unit ?? ""} is outside the plausible range — check the reading and the unit.` });
      }
    }
  }
  const wbCheck = (db: string, wb: string, label: string) => {
    const d = v(db), w = v(wb);
    if (d != null && w != null && w > d + 0.1) alerts.push({ severity: "WARNING", code: `WB_GT_DB_${label}`, message: `${label} wet-bulb (${w} °F) is higher than its dry-bulb (${d} °F) — physically impossible; re-measure.` });
  };
  wbCheck("return_db_f", "return_wb_f", "Return");
  wbCheck("supply_db_f", "supply_wb_f", "Supply");

  // ── Refrigeration, per circuit ──
  const ambient = v("outdoor_ambient_f");
  const returnDb = v("return_db_f");
  const stab = v("stabilized_min");
  for (let c = 1; c <= circuits; c++) {
    const suction = v("suction_psig", c), high = v("high_psig", c);
    const sl = v("suction_line_f", c), ll = v("liquid_line_f", c), dl = v("discharge_line_f", c);
    if (!ref && (suction != null || high != null)) {
      alerts.push({ severity: "WARNING", code: "NO_REFRIGERANT", circuit: c, message: "Select the refrigerant (from the nameplate) to calculate saturation, superheat and subcooling." });
      continue;
    }
    if (!ref) continue;
    let evapDew: number | null = null, condBubble: number | null = null, condDew: number | null = null;
    try {
      if (suction != null) {
        evapDew = saturationF(ref.key, suction, "dew");
        if (!running) {
          add({ circuit: c, key: "standing_sat_f", label: "Standing saturation temperature", value: evapDew, kind: "temp", unit: "°F", formula: `dew point of ${ref.label} at ${suction} psig`,
            note: "Equipment off: with the system equalized, compare with the ambient temperature around the unit." });
        } else {
          add({ circuit: c, key: "evap_sat_f", label: "Evaporator saturation (dew)", value: evapDew, kind: "temp", unit: "°F", formula: `dew point of ${ref.label} at ${suction} psig` });
          if (ref.hasGlide) add({ circuit: c, key: "evap_bubble_f", label: "Evaporator saturation (bubble)", value: saturationF(ref.key, suction, "bubble"), kind: "temp", unit: "°F", formula: `bubble point at ${suction} psig` });
        }
      }
    } catch (e) { if (e instanceof OutOfRangeError) alerts.push({ severity: "WARNING", code: "SUCTION_OUT_OF_RANGE", circuit: c, message: `Suction: ${e.message}. Check the refrigerant selection and gauge.` }); else throw e; }
    try {
      if (high != null && running) {
        condBubble = saturationF(ref.key, high, "bubble");
        condDew = saturationF(ref.key, high, "dew");
        add({ circuit: c, key: "cond_sat_bubble_f", label: "Condensing saturation (bubble)", value: condBubble, kind: "temp", unit: "°F", formula: `bubble point of ${ref.label} at ${high} psig` });
        if (ref.hasGlide) add({ circuit: c, key: "cond_sat_dew_f", label: "Condensing saturation (dew)", value: condDew, kind: "temp", unit: "°F", formula: `dew point at ${high} psig` });
      }
    } catch (e) { if (e instanceof OutOfRangeError) alerts.push({ severity: "WARNING", code: "HIGH_OUT_OF_RANGE", circuit: c, message: `High side: ${e.message}. Check the refrigerant selection and gauge.` }); else throw e; }

    if (!running) continue;
    if (suction != null && high != null) {
      if (suction >= high) alerts.push({ severity: "WARNING", code: "SUCTION_GE_HIGH", circuit: c, message: "Suction pressure is equal to or above the high side — the compressor is not pumping, the gauges are swapped, or the reading was taken with the unit off." });
      else add({ circuit: c, key: "compression_ratio", label: "Compression ratio (absolute)", value: (high + ATM_PSI) / (suction + ATM_PSI), kind: "plain", unit: ":1", formula: `(${high} + ${ATM_PSI}) ÷ (${suction} + ${ATM_PSI}) psia` });
    }
    let superheat: number | null = null, subcooling: number | null = null;
    if (evapDew != null && sl != null) {
      superheat = sl - evapDew;
      add({ circuit: c, key: "superheat_f", label: "Superheat", value: superheat, kind: "tempDiff", unit: "°F", formula: `suction line ${sl} °F − evaporator dew ${r1(evapDew)} °F` });
      if (superheat < -0.5) alerts.push({ severity: "WARNING", code: "NEGATIVE_SUPERHEAT", circuit: c, message: `Superheat is negative (${r1(superheat)} °F): check probe contact/insulation and location, the refrigerant selected and the gauge — or liquid is reaching the measuring point.` });
    }
    if (condBubble != null && ll != null) {
      subcooling = condBubble - ll;
      add({ circuit: c, key: "subcooling_f", label: "Subcooling", value: subcooling, kind: "tempDiff", unit: "°F", formula: `condensing bubble ${r1(condBubble)} °F − liquid line ${ll} °F` });
      if (subcooling < -0.5) alerts.push({ severity: "WARNING", code: "NEGATIVE_SUBCOOLING", circuit: c, message: `Subcooling is negative (${r1(subcooling)} °F): check probe contact and placement, the refrigerant selected and the high-side gauge.` });
    }
    if (condDew != null && dl != null) add({ circuit: c, key: "discharge_superheat_f", label: "Discharge superheat", value: dl - condDew, kind: "tempDiff", unit: "°F", formula: `discharge line ${dl} °F − condensing dew ${r1(condDew)} °F` });
    if (cooling && condDew != null && ambient != null) {
      add({ circuit: c, key: "ctoa_f", label: "Condensing temp over ambient", value: condDew - ambient, kind: "tempDiff", unit: "°F", formula: `condensing dew ${r1(condDew)} °F − outdoor ${ambient} °F` });
      if (condDew < ambient) alerts.push({ severity: "WARNING", code: "COND_BELOW_AMBIENT", circuit: c, message: "Condensing temperature is below outdoor ambient in cooling — not possible while the condenser rejects heat. Verify the refrigerant type, the high-side gauge and that the compressor is running." });
    }
    if (cooling && evapDew != null && returnDb != null) {
      add({ circuit: c, key: "evap_td_f", label: "Evaporator TD (return − evap sat.)", value: returnDb - evapDew, kind: "tempDiff", unit: "°F", formula: `return ${returnDb} °F − evaporator dew ${r1(evapDew)} °F` });
      if (evapDew > returnDb) alerts.push({ severity: "WARNING", code: "EVAP_ABOVE_RETURN", circuit: c, message: "Evaporator saturation is above return-air temperature in cooling — verify the refrigerant type, gauge and mode." });
    }

    // Charge — only against a manufacturer target.
    charge.push(assessCharge({ c, ctx, mode: input.mode, metering: eq.meteringDevice ?? null, specs, superheat, subcooling, stab }));
  }

  // ── Air ──
  const supplyDb = v("supply_db_f");
  if (returnDb != null && supplyDb != null) {
    const heating = ["HEATING_GAS", "HEATING_ELECTRIC", "HEATING_HP", "AUX_HEAT"].includes(input.mode ?? "");
    const dt = heating ? supplyDb - returnDb : returnDb - supplyDb;
    add({ key: heating ? "temp_rise_f" : "air_dt_f", label: heating ? "Temperature rise" : "Air temperature split (return − supply)", value: dt, kind: "tempDiff", unit: "°F",
      formula: heating ? `supply ${supplyDb} °F − return ${returnDb} °F` : `return ${returnDb} °F − supply ${supplyDb} °F`,
      note: heating ? undefined : "A temperature split alone does not prove the refrigerant charge." });
    if (cooling && supplyDb > returnDb) alerts.push({ severity: "WARNING", code: "SUPPLY_WARMER_COOLING", message: "Supply air is warmer than return in cooling mode — check probe placement, the mode, and whether heat is also running." });
    if (input.mode === "HEATING_GAS" && num(specs.tempRiseMin) && num(specs.tempRiseMax)) {
      if (dt < specs.tempRiseMin || dt > specs.tempRiseMax) alerts.push({ severity: "WARNING", code: "TEMP_RISE_OUT_OF_RANGE", message: `Temperature rise ${r1(dt)} °F is outside the nameplate range ${specs.tempRiseMin}–${specs.tempRiseMax} °F.`, action: "Check airflow and gas input (manifold pressure / clocking) per the manufacturer before changing anything." });
    }
    const cfm = v("airflow_cfm");
    if (cfm != null && !heating) add({ key: "sensible_btuh", label: "Sensible capacity (measured airflow)", value: 1.08 * cfm * dt, kind: "plain", unit: "BTU/h", formula: `1.08 × ${cfm} CFM × ${r1(dt)} °F`, note: "Standard-air constant 1.08 (0.075 lb/ft³); see the density-corrected value when psychrometric data is entered." });
  }

  // ── Psychrometrics (return / supply) ──
  const elev = v("elevation_ft");
  const pAtm = elev != null ? pressureAtElevation(elev) : ATM_PSI;
  if (elev != null) add({ key: "barometric_psia", label: "Barometric pressure (standard atmosphere)", value: pAtm, kind: "plain", unit: "psia", formula: `14.696 × (1 − 6.8754e-6 × ${elev} ft)^5.2559 (ASHRAE)` });
  const airs: Record<"return" | "supply", AirState | null> = { return: null, supply: null };
  for (const side of ["return", "supply"] as const) {
    const db = v(`${side}_db_f`); if (db == null) continue;
    const wb = v(`${side}_wb_f`), rh = v(`${side}_rh_pct`);
    if (wb == null && rh == null) continue;
    const label = side === "return" ? "Return" : "Supply";
    const res = airState({ db, wb, rh, p: pAtm });
    if (res.error) { alerts.push({ severity: "WARNING", code: `PSYCHRO_${side.toUpperCase()}_${res.error.code}`, message: `${label} air: ${res.error.message}` }); continue; }
    const st = res.state!; airs[side] = st;
    const basis = res.from === "WB" ? `${db} °F DB / ${wb} °F WB` : `${db} °F DB / ${rh} % RH`;
    const src = `${basis}, ${r1(pAtm * 100) / 100} psia — ${PSYCHRO_SOURCE}`;
    if (res.from === "RH") add({ key: `${side}_wb_calc_f`, label: `${label} wet-bulb (calculated)`, value: st.wb, kind: "temp", unit: "°F", formula: src });
    else add({ key: `${side}_rh_calc_pct`, label: `${label} relative humidity`, value: st.rh, kind: "plain", unit: "%", formula: src });
    add({ key: `${side}_dp_f`, label: `${label} dew point`, value: st.dewPoint, kind: "temp", unit: "°F", formula: src });
    add({ key: `${side}_w_gr`, label: `${label} humidity ratio`, value: st.grains, kind: "plain", unit: "gr/lb", formula: src });
    add({ key: `${side}_h_btulb`, label: `${label} enthalpy`, value: st.h, kind: "plain", unit: "BTU/lb", formula: `0.240 × DB + W × (1061 + 0.444 × DB); ${src}` });
    if (wb != null && rh != null) {
      const diff = Math.abs(st.rh - rh);
      if (diff > 5) alerts.push({ severity: "WARNING", code: `PSYCHRO_${side.toUpperCase()}_INCONSISTENT`, message: `${label} air: RH entered ${rh} % but the wet-bulb gives ${r1(st.rh)} % — the readings disagree by more than 5 points; check the instruments (wet wick, probe placement, sensor calibration).` });
    }
  }
  if (airs.return && airs.supply && cooling) {
    const R = airs.return, S = airs.supply;
    if (S.w > R.w + 0.0003) alerts.push({ severity: "WARNING", code: "SUPPLY_MOISTER_THAN_RETURN", message: `Supply air holds more moisture (${r1(S.grains)} gr/lb) than return (${r1(R.grains)} gr/lb) in cooling — not possible across a cooling coil; check the wet-bulb/RH readings and probe locations.` });
    const dh = R.h - S.h;
    add({ key: "delta_h_btulb", label: "Enthalpy difference (return − supply)", value: dh, kind: "plain", unit: "BTU/lb", formula: `${r1(R.h * 100) / 100} − ${r1(S.h * 100) / 100} BTU/lb` });
    const cfm = v("airflow_cfm");
    if (cfm != null && returnDb != null && supplyDb != null) {
      const total = 4.5 * cfm * dh;
      add({ key: "total_btuh", label: "Total cooling capacity (measured airflow)", value: total, kind: "plain", unit: "BTU/h", formula: `4.5 × ${cfm} CFM × ${r1(dh * 100) / 100} BTU/lb`, note: "Standard-air constant 4.5 (= 60 × 0.075 lb/ft³)." });
      const mass = (60 * cfm) / R.v; // lb dry air / h, airflow measured at return conditions
      const totalC = mass * dh;
      const sensC = mass * (0.24 + 0.444 * R.w) * (returnDb - supplyDb);
      add({ key: "total_btuh_corr", label: "Total cooling capacity (density-corrected)", value: totalC, kind: "plain", unit: "BTU/h", formula: `60 × ${cfm} CFM ÷ ${r1(R.v * 1000) / 1000} ft³/lb × ${r1(dh * 100) / 100} BTU/lb`, note: "Air mass flow from the return-air specific volume at the site pressure; assumes the CFM was measured at return conditions." });
      add({ key: "sensible_btuh_corr", label: "Sensible capacity (density-corrected)", value: sensC, kind: "plain", unit: "BTU/h", formula: `60 × ${cfm} ÷ ${r1(R.v * 1000) / 1000} × (0.240 + 0.444 × W) × ${r1(returnDb - supplyDb)} °F` });
      if (totalC > 0) {
        add({ key: "latent_btuh", label: "Latent capacity", value: Math.max(0, totalC - sensC), kind: "plain", unit: "BTU/h", formula: "total − sensible (density-corrected)" });
        add({ key: "shr", label: "Sensible heat ratio", value: Math.min(100, (sensC / totalC) * 100), kind: "plain", unit: "%", formula: "sensible ÷ total (density-corrected)", note: "Compare with the manufacturer's expanded performance data at the same conditions." });
      }
      const tons = eq.capacityTons;
      if (tons && totalC > 0) add({ key: "capacity_pct_nominal", label: "Measured capacity vs nominal", value: (totalC / (tons * 12000)) * 100, kind: "plain", unit: "%", formula: `${Math.round(totalC)} ÷ (${tons} tons × 12,000) × 100`, note: "Nominal tons are rated at AHRI conditions — compare with the manufacturer's expanded data at today's conditions before judging." });
    }
  }
  const rs = v("return_static_inwc"), ss = v("supply_static_inwc"), tesp = v("tesp_inwc");
  if (rs != null && ss != null) add({ key: "tesp_calc_inwc", label: "Total external static (calculated)", value: Math.abs(rs) + ss, kind: "static", unit: "in. w.c.", formula: `|${rs}| + ${ss} in. w.c.` });
  const tespVal = tesp ?? (rs != null && ss != null ? Math.abs(rs) + ss : null);
  if (tespVal != null && num(specs.maxTesp) && tespVal > specs.maxTesp) alerts.push({ severity: "WARNING", code: "TESP_ABOVE_RATED", message: `Total external static ${r1(tespVal * 100) / 100} in. w.c. is above the equipment's rated ${specs.maxTesp} in. w.c.` });

  // ── Electrical ──
  const voltages = ["v_l1l2", "v_l2l3", "v_l1l3"].map((k) => v(k));
  if (voltages.every((x) => x != null)) {
    const vs = voltages as number[];
    const avg = vs.reduce((a, b) => a + b, 0) / 3;
    const imb = (Math.max(...vs.map((x) => Math.abs(x - avg))) / avg) * 100;
    add({ key: "voltage_imbalance_pct", label: "Voltage imbalance", value: imb, kind: "plain", unit: "%", formula: `max deviation from average ${r1(avg)} V ÷ average × 100 (NEMA)`, note: "Compare with the equipment manufacturer's maximum allowed imbalance." });
  }
  for (const [key, label] of [["supply_v", "Supply voltage"], ["loaded_v", "Voltage under load"]] as const) {
    const x = v(key);
    if (x == null) continue;
    if (num(eq.minVoltage) && x < eq.minVoltage) alerts.push({ severity: "WARNING", code: `LOW_${key}`, message: `${label} ${x} V is below the nameplate minimum ${eq.minVoltage} V.` });
    if (num(eq.maxVoltage) && x > eq.maxVoltage) alerts.push({ severity: "WARNING", code: `HIGH_${key}`, message: `${label} ${x} V is above the nameplate maximum ${eq.maxVoltage} V.` });
  }
  for (let c = 1; c <= circuits; c++) {
    const amps = v("comp_amps", c);
    if (amps != null && num(eq.rla) && eq.rla > 0) {
      add({ circuit: c, key: "comp_pct_rla", label: "Compressor current vs RLA", value: (amps / eq.rla) * 100, kind: "plain", unit: "%", formula: `${amps} A ÷ RLA ${eq.rla} A × 100` });
      if (amps > eq.rla) alerts.push({ severity: "WARNING", code: "COMP_ABOVE_RLA", circuit: c, message: `Compressor running current ${amps} A is above nameplate RLA ${eq.rla} A.` });
    }
    const start = v("comp_start_amps", c);
    if (start != null && num(eq.lra) && eq.lra > 0) add({ circuit: c, key: "start_pct_lra", label: "Start current vs LRA", value: (start / eq.lra) * 100, kind: "plain", unit: "%", formula: `${start} A ÷ LRA ${eq.lra} A × 100` });
  }
  if (!ctx.inverter) {
    const tol = v("cap_tolerance_pct");
    for (const [rated, measured, label] of [["cap_herm_rated_uf", "cap_herm_measured_uf", "HERM"], ["cap_fan_rated_uf", "cap_fan_measured_uf", "FAN"]] as const) {
      const r = v(rated), mm = v(measured);
      if (r == null || mm == null || r <= 0) continue;
      const dev = ((mm - r) / r) * 100;
      add({ key: `cap_${label.toLowerCase()}_dev_pct`, label: `Capacitor ${label} deviation`, value: dev, kind: "plain", unit: "%", formula: `(${mm} − ${r}) ÷ ${r} µF × 100`,
        note: tol == null ? "Enter the tolerance printed on the capacitor to judge it." : undefined });
      if (tol != null && Math.abs(dev) > tol) alerts.push({ severity: "WARNING", code: `CAP_${label}_OUT_OF_TOL`, message: `${label} capacitor measures ${mm} µF vs ${r} µF rated (${r1(dev)}%) — outside its ±${tol}% label tolerance.` });
    }
  }
  if (t("contactor_condition") === "WELDED") alerts.push({ severity: "WARNING", code: "CONTACTOR_WELDED", message: "Contactor contacts welded closed — the outdoor unit can run without a call.", action: "De-energize and lock out before replacing." });

  // Gas pressures vs entered manufacturer spec
  const man = v("manifold_gas_inwc");
  if (man != null && num(specs.manifoldMin) && num(specs.manifoldMax) && (man < specs.manifoldMin || man > specs.manifoldMax)) {
    alerts.push({ severity: "WARNING", code: "MANIFOLD_OUT_OF_SPEC", message: `Manifold pressure ${man} in. w.c. is outside the manufacturer range ${specs.manifoldMin}–${specs.manifoldMax}.` });
  }
  const inlet = v("inlet_gas_inwc");
  if (inlet != null && num(specs.inletMin) && num(specs.inletMax) && (inlet < specs.inletMin || inlet > specs.inletMax)) {
    alerts.push({ severity: "WARNING", code: "INLET_OUT_OF_SPEC", message: `Inlet gas pressure ${inlet} in. w.c. is outside the manufacturer range ${specs.inletMin}–${specs.inletMax}.` });
  }

  // ── Missing required measurements ──
  const missing: EngineResult["missing"] = [];
  for (const f of FIELDS) {
    if ((f.show && !f.show(ctx)) || !isRequired(f, ctx)) continue;
    const cs = f.perCircuit ? Array.from({ length: circuits }, (_, i) => i + 1) : [1];
    for (const c of cs) {
      const mv = (input.measurements[c] ?? {})[f.key];
      const present = f.input === "number" ? num(mv?.value) : !!(mv?.text && mv.text.trim());
      if (!present) missing.push({ key: f.key, label: f.label, circuit: f.perCircuit && circuits > 1 ? c : undefined });
    }
  }
  void m1;

  const order: Record<Severity, number> = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  return { engineVersion: ENGINE_VERSION, ptDataVersion: PT_DATA_VERSION, computedAt: new Date().toISOString(), refrigerant: ref, calculated, charge, alerts, missing, ctx };
}

function assessCharge(a: { c: number; ctx: Ctx; mode: string | null; metering: string | null; specs: Specs; superheat: number | null; subcooling: number | null; stab: number | null }): ChargeAssessment {
  const base = { circuit: a.c };
  if (a.ctx.inverter) return { ...base, status: "NOT_APPLICABLE", method: null, reason: "Inverter / variable-speed system — verify charge only with the manufacturer's service-mode procedure." };
  if (a.mode !== "COOLING") return { ...base, status: "NOT_APPLICABLE", method: null, reason: a.mode === "HEATING_HP" ? "Heating mode — use the manufacturer's heating-mode charging procedure (most require verifying charge in cooling)." : "Charge is only evaluated with the system running in cooling." };
  const m = a.metering;
  const method = m === "TXV" || m === "EEV" ? "SUBCOOLING" : m === "PISTON" || m === "CAP_TUBE" ? "SUPERHEAT" : null;
  if (!method) return { ...base, status: "INSUFFICIENT_DATA", method: null, reason: "Identify the metering device (TXV/EEV or fixed orifice) — it decides the manufacturer's charging method." };
  const target = method === "SUBCOOLING" ? a.specs.targetSubcooling : a.specs.targetSuperheat;
  const actual = method === "SUBCOOLING" ? a.subcooling : a.superheat;
  if (actual == null) return { ...base, status: "INSUFFICIENT_DATA", method, reason: method === "SUBCOOLING" ? "High-side pressure and liquid-line temperature are needed for subcooling." : "Suction pressure and suction-line temperature are needed for superheat." };
  if (!num(target)) return { ...base, status: "INSUFFICIENT_DATA", method, actual: r1(actual),
    reason: method === "SUBCOOLING" ? "Enter the manufacturer's target subcooling (unit label / installation instructions)." : "Enter the manufacturer's target superheat from the charging chart at today's indoor wet-bulb and outdoor dry-bulb." };
  const dev = actual - target;
  const stabNote = a.stab != null && a.stab < 15 ? " Readings were taken after less than 15 minutes of operation — confirm the manufacturer's stabilization time." : "";
  if (!num(a.specs.chargeTolerance)) return { ...base, status: "DEVIATION_ONLY", method, actual: r1(actual), target, reason: `${r1(dev) >= 0 ? "+" : ""}${r1(dev)} °F from target. Enter the manufacturer's tolerance to judge it.${stabNote}` };
  const ok = Math.abs(dev) <= a.specs.chargeTolerance;
  return { ...base, status: ok ? "WITHIN_TARGET" : "OUTSIDE_TARGET", method, actual: r1(actual), target, tolerance: a.specs.chargeTolerance,
    reason: `${method === "SUBCOOLING" ? "Subcooling" : "Superheat"} ${r1(actual)} °F vs target ${target} ±${a.specs.chargeTolerance} °F (${r1(dev) >= 0 ? "+" : ""}${r1(dev)} °F).${ok ? "" : " This is a symptom, not a diagnosis — confirm airflow, metering device and restrictions before adjusting charge."}${stabNote}` };
}

export { categoryInfo };
