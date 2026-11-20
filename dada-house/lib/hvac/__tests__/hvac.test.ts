/**
 * HVAC Diagnostic Pro — engine tests.  Run:  npm run test:hvac
 * Reference PT points are the widely published saturation pressures (industry PT charts) at 40 °F and 100 °F.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { saturationF, saturationPsig, refrigerantInfo, isA2L, OutOfRangeError } from "../refrigerants";
import { toPsig, fromPsig, fToC, cToF, toCanonical, ATM_PSI } from "../units";
import { runEngine, type EngineInput } from "../engine";

const near = (a: number, b: number, tol: number, msg?: string) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ""} expected ${b} ±${tol}, got ${a}`);

// ── Refrigerant property lookups (reference-checked fluids) ──
const REFERENCE: [string, number, number][] = [
  // refrigerant, psig, published saturation °F
  ["R-22", 68.5, 40], ["R-22", 195.9, 100],
  ["R-410A", 118.0, 40], ["R-410A", 317.6, 100],
  ["R-134a", 35.0, 40], ["R-134a", 124.1, 100],
];
for (const [ref, psig, f] of REFERENCE) {
  test(`${ref} saturation at ${psig} psig ≈ ${f} °F`, () => {
    near(saturationF(ref, psig, "dew"), f, 0.6);
    near(saturationPsig(ref, f, "dew"), psig, 1.5);
  });
}

test("pure refrigerant: dew = bubble; zeotropic blend: dew > bubble (glide)", () => {
  near(saturationF("R-22", 70, "dew"), saturationF("R-22", 70, "bubble"), 0.01);
  const dew = saturationF("R-407C", 70, "dew"), bub = saturationF("R-407C", 70, "bubble");
  assert.ok(dew - bub > 8, `R-407C glide should be large, got ${dew - bub}`);
  assert.ok(refrigerantInfo("R-407C")!.hasGlide);
  assert.ok(!refrigerantInfo("R-22")!.hasGlide);
});

test("safety classes", () => {
  assert.equal(isA2L("R-32"), true);
  assert.equal(isA2L("R-454B"), true);
  assert.equal(isA2L("R-410A"), false);
});

test("pressure outside the property range throws", () => {
  assert.throws(() => saturationF("R-407C", 600, "dew"), OutOfRangeError);
});

// ── Units ──
test("unit conversions", () => {
  near(toPsig(100, "kPag"), 14.5038, 0.001);
  near(toPsig(1, "barg"), 14.5038, 0.001);
  near(fromPsig(toPsig(7.5, "barg"), "barg"), 7.5, 1e-9);
  near(fToC(32), 0, 1e-9); near(cToF(100), 212, 1e-9);
  near(toCanonical("tempDiff", 5, { temp: "C", pressure: "psig", static: "inwc" }), 9, 1e-9);
  near(toCanonical("static", 124.54, { temp: "F", pressure: "psig", static: "Pa" }), 0.5, 0.001);
});

// ── Engine ──
const base = (over: Partial<EngineInput> = {}, m: Record<string, number | string> = {}): EngineInput => ({
  equipment: { category: "STRAIGHT_AC", refrigerant: "R-410A", meteringDevice: "TXV", phase: 1, rla: 10, specs: { targetSubcooling: 10, chargeTolerance: 3 } },
  mode: "COOLING", complaint: "AC_NOT_COOLING", circuits: 1, safety: {},
  measurements: { 1: Object.fromEntries(Object.entries(m).map(([k, x]) => [k, typeof x === "number" ? { value: x } : { text: x }])) },
  ...over,
});

test("superheat / subcooling use dew and bubble points", () => {
  const r = runEngine(base({}, { suction_psig: 118, high_psig: 317.6, suction_line_f: 50, liquid_line_f: 90, outdoor_ambient_f: 85, return_db_f: 75, supply_db_f: 56, stabilized_min: 20 }));
  const sh = r.calculated.find((c) => c.key === "superheat_f")!.value;
  const sc = r.calculated.find((c) => c.key === "subcooling_f")!.value;
  near(sh, 10, 0.7); near(sc, 10, 0.7);
  near(r.calculated.find((c) => c.key === "compression_ratio")!.value, (317.6 + ATM_PSI) / (118 + ATM_PSI), 0.06);
  assert.equal(r.charge[0].method, "SUBCOOLING");
  assert.equal(r.charge[0].status, "WITHIN_TARGET");
});

test("charge is never judged without a manufacturer target", () => {
  const r = runEngine(base({ equipment: { category: "STRAIGHT_AC", refrigerant: "R-410A", meteringDevice: "PISTON", specs: {} } }, { suction_psig: 118, suction_line_f: 60 }));
  assert.equal(r.charge[0].status, "INSUFFICIENT_DATA");
  assert.equal(r.charge[0].method, "SUPERHEAT");
});

test("blend superheat uses the dew point", () => {
  const r = runEngine(base({ equipment: { category: "STRAIGHT_AC", refrigerant: "R-407C", meteringDevice: "TXV" } }, { suction_psig: 70, suction_line_f: 55 }));
  near(r.calculated.find((c) => c.key === "superheat_f")!.value, 55 - saturationF("R-407C", 70, "dew"), 0.1);
});

test("negative superheat and impossible wet-bulb are flagged", () => {
  const r = runEngine(base({}, { suction_psig: 118, suction_line_f: 35, return_db_f: 75, return_wb_f: 80 }));
  assert.ok(r.alerts.some((a) => a.code === "NEGATIVE_SUPERHEAT"));
  assert.ok(r.alerts.some((a) => a.code.startsWith("WB_GT_DB")));
});

test("wrong refrigerant selection shows up (condensing below ambient)", () => {
  // R-410A-like high-side pressure entered while R-22 is selected would be fine; the reverse is the classic error:
  const r = runEngine(base({ equipment: { category: "STRAIGHT_AC", refrigerant: "R-410A", meteringDevice: "TXV" } }, { suction_psig: 68, high_psig: 200, outdoor_ambient_f: 95 }));
  assert.ok(r.alerts.some((a) => a.code === "COND_BELOW_AMBIENT"));
});

test("inverter: no charge verdict, no capacitor diagnostics", () => {
  const r = runEngine(base({ equipment: { category: "MINI_SPLIT", refrigerant: "R-410A", meteringDevice: "EEV" } }, { suction_psig: 118, high_psig: 317, suction_line_f: 50, liquid_line_f: 90, cap_herm_rated_uf: 45, cap_herm_measured_uf: 30, cap_tolerance_pct: 6 }));
  assert.equal(r.charge[0].status, "NOT_APPLICABLE");
  assert.ok(!r.alerts.some((a) => a.code.startsWith("CAP_")));
  assert.ok(r.alerts.some((a) => a.code === "INVERTER_LIMITS"));
});

test("heat pump heating: no charge verdict", () => {
  const r = runEngine(base({ equipment: { category: "HEAT_PUMP", refrigerant: "R-410A", meteringDevice: "TXV", specs: { targetSubcooling: 10, chargeTolerance: 3 } }, mode: "HEATING_HP", complaint: "HP_NOT_HEATING" }, { suction_psig: 100, high_psig: 350, suction_line_f: 40, liquid_line_f: 95 }));
  assert.equal(r.charge[0].status, "NOT_APPLICABLE");
});

test("three-phase voltage imbalance (NEMA)", () => {
  const r = runEngine(base({ equipment: { category: "RTU", refrigerant: "R-410A", phase: 3 } }, { v_l1l2: 460, v_l2l3: 467, v_l1l3: 450 }));
  near(r.calculated.find((c) => c.key === "voltage_imbalance_pct")!.value, 2.0, 0.05); // avg 459, max dev 9 → 1.96 %
});

test("capacitor outside its label tolerance", () => {
  const r = runEngine(base({}, { cap_herm_rated_uf: 45, cap_herm_measured_uf: 40, cap_tolerance_pct: 6 }));
  assert.ok(r.alerts.some((a) => a.code === "CAP_HERM_OUT_OF_TOL"));
});

test("running current above RLA", () => {
  const r = runEngine(base({}, { comp_amps: 12 }));
  assert.ok(r.alerts.some((a) => a.code === "COMP_ABOVE_RLA"));
});

test("critical safety findings", () => {
  const r = runEngine(base({ equipment: { category: "GAS_FURNACE", refrigerant: null }, mode: "HEATING_GAS", complaint: "FURNACE_NOT_HEATING", safety: { co_alarm: true } }, { hx_inspection: "CONFIRMED" }));
  assert.equal(r.alerts[0].severity, "CRITICAL");
  assert.ok(r.alerts.some((a) => a.code === "HX_BREACH"));
  assert.ok(r.alerts.some((a) => a.code === "SAFETY_CO_ALARM"));
});

test("A2L warning", () => {
  const r = runEngine(base({ equipment: { category: "STRAIGHT_AC", refrigerant: "R-454B" } }));
  assert.ok(r.alerts.some((a) => a.code === "A2L_REFRIGERANT"));
});

test("missing measurements depend on the complaint", () => {
  const cooling = runEngine(base({}, {}));
  assert.ok(cooling.missing.some((x) => x.key === "suction_psig"));
  const thermostat = runEngine(base({ complaint: "THERMOSTAT_NOT_RESPONDING", mode: "NOT_RUNNING" }, {}));
  assert.ok(!thermostat.missing.some((x) => x.key === "suction_psig"));
  assert.ok(thermostat.missing.some((x) => x.key === "transformer_v"));
});

test("multiple circuits are calculated separately", () => {
  const input = base({ circuits: 2, equipment: { category: "RTU", refrigerant: "R-410A", meteringDevice: "TXV", specs: { targetSubcooling: 10, chargeTolerance: 3 } } });
  input.measurements = { 1: { high_psig: { value: 317.6 }, liquid_line_f: { value: 90 } }, 2: { high_psig: { value: 317.6 }, liquid_line_f: { value: 80 } } };
  const r = runEngine(input);
  assert.equal(r.charge.length, 2);
  assert.equal(r.charge[0].status, "WITHIN_TARGET");
  assert.equal(r.charge[1].status, "OUTSIDE_TARGET");
});

test("unit off: standing saturation instead of superheat", () => {
  const r = runEngine(base({ mode: "NOT_RUNNING", complaint: "AC_NOT_ON" }, { suction_psig: 200, suction_line_f: 80 }));
  assert.ok(r.calculated.some((c) => c.key === "standing_sat_f"));
  assert.ok(!r.calculated.some((c) => c.key === "superheat_f"));
});

// ── Layer B: rule engine ──
import { runRules } from "../rules";
const rulesFor = (input: EngineInput, decisions = {}) => {
  const engine = runEngine(input);
  return runRules({ engine, equipment: input.equipment, mode: input.mode, complaint: input.complaint, safety: input.safety, measurements: input.measurements, decisions });
};
const tgt = { category: "STRAIGHT_AC", refrigerant: "R-410A", meteringDevice: "TXV", phase: 1, specs: { targetSubcooling: 10, targetSuperheat: 10, chargeTolerance: 3 } };

test("low charge pattern: high SH + low SC → strongly suspected", () => {
  const r = rulesFor(base({ equipment: tgt }, { suction_psig: 100, high_psig: 300, suction_line_f: 55, liquid_line_f: 94, outdoor_ambient_f: 90, stabilized_min: 20, comp_running: "YES", ofm_running: "YES", supply_v: 240, return_db_f: 76, supply_db_f: 62, return_wb_f: 63 }));
  const h = r.hypotheses.find((x) => x.id === "LOW_CHARGE")!;
  assert.equal(h.status, "STRONGLY_SUSPECTED");
  assert.ok(!r.hypotheses.some((x) => x.id === "OVERCHARGE" && x.status === "STRONGLY_SUSPECTED"));
});

test("restriction pattern: high SH + high SC points to metering device, not charge", () => {
  const r = rulesFor(base({ equipment: tgt }, { suction_psig: 100, high_psig: 340, suction_line_f: 55, liquid_line_f: 85 }));
  assert.ok(r.hypotheses.some((x) => x.id === "METERING_RESTRICTION" && x.contradict.length === 0));
  const low = r.hypotheses.find((x) => x.id === "LOW_CHARGE");
  assert.ok(!low || low.contradict.length > 0);
});

test("no manufacturer target → no charge hypothesis is strongly suspected", () => {
  const r = rulesFor(base({ equipment: { category: "STRAIGHT_AC", refrigerant: "R-410A", meteringDevice: "TXV" } }, { suction_psig: 100, high_psig: 300, suction_line_f: 55, liquid_line_f: 94 }));
  assert.ok(!r.hypotheses.some((x) => ["LOW_CHARGE", "OVERCHARGE"].includes(x.id)));
  assert.match(r.summary, /cannot yet|more evidence/);
});

test("airflow evidence and next measurements", () => {
  const r = rulesFor(base({ equipment: tgt, complaint: "FREEZING" }, { suction_psig: 90, filter_condition: "DIRTY", evap_coil_ice: "HEAVY" }));
  const h = r.hypotheses.find((x) => x.id === "LOW_INDOOR_AIRFLOW")!;
  assert.ok(h.support.length >= 2);
  assert.ok(r.nextMeasurements.some((n) => n.key === "tesp_inwc"));
});

test("technician decisions override status", () => {
  const input = base({ equipment: tgt, complaint: "FREEZING" }, { filter_condition: "DIRTY" });
  const r = rulesFor(input, { LOW_INDOOR_AIRFLOW: { decision: "CONFIRMED" } });
  assert.equal(r.hypotheses[0].id, "LOW_INDOOR_AIRFLOW");
  assert.equal(r.hypotheses[0].status, "CONFIRMED");
  const r2 = rulesFor(input, { LOW_INDOOR_AIRFLOW: { decision: "REJECTED" } });
  assert.equal(r2.hypotheses.find((x) => x.id === "LOW_INDOOR_AIRFLOW")!.status, "RULED_OUT");
});

test("safety-critical hypothesis ranks first", () => {
  const r = rulesFor(base({ equipment: { category: "GAS_FURNACE_AC", refrigerant: "R-410A" }, mode: "HEATING_GAS", complaint: "FURNACE_NOT_HEATING", safety: { vent_problem: true } }, { inducer_ok: "NO", heat_call: "YES" }));
  assert.equal(r.hypotheses[0].id, "COMBUSTION_VENTING");
});

test("contactor vs control signal", () => {
  const r = rulesFor(base({ complaint: "COMPRESSOR_NOT_STARTING" }, { contactor_condition: "NOT_PULLING_IN", contactor_coil_v: 0, transformer_v: 25 }));
  assert.ok(r.hypotheses.find((x) => x.id === "CONTROL_SIGNAL")!.support.length >= 1);
  const c = r.hypotheses.find((x) => x.id === "CONTACTOR");
  assert.ok(!c || c.contradict.length > 0);
});

test("inverter equipment: no fixed-speed charge rules", () => {
  const r = rulesFor(base({ equipment: { ...tgt, category: "MINI_SPLIT", meteringDevice: "EEV" } }, { suction_psig: 100, high_psig: 300, suction_line_f: 55, liquid_line_f: 94 }));
  assert.ok(!r.hypotheses.some((x) => ["LOW_CHARGE", "OVERCHARGE", "METERING_RESTRICTION", "COMPRESSOR_MECHANICAL"].includes(x.id)));
});

// ── Phase 3: admin-approved field rules ──
import { resolveFieldRules, DEFAULT_FIELD_RULES } from "../rules";
test("field-rule overrides: valid values apply, out-of-range values are ignored", () => {
  const fr = resolveFieldRules({ drierDropF: 5, transformerMinVac: 99 });
  assert.equal(fr.drierDropF, 5);
  assert.equal(fr.transformerMinVac, DEFAULT_FIELD_RULES.transformerMinVac);
});
test("a stricter drier threshold changes the evidence", () => {
  const input = base({ equipment: tgt }, { drier_in_f: 95, drier_out_f: 91 }); // 4 °F drop
  const engine = runEngine(input);
  const args = { engine, equipment: input.equipment, mode: input.mode, complaint: input.complaint, safety: input.safety, measurements: input.measurements };
  assert.ok(runRules(args).hypotheses.find((h) => h.id === "DRIER_RESTRICTION")?.support.length);
  assert.ok(!runRules({ ...args, fieldRules: { drierDropF: 5 } }).hypotheses.some((h) => h.id === "DRIER_RESTRICTION"));
});
