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

// ── Validation & calibration (priority 4) ──
import { splitFor, evaluateCase, wilson, runEvaluation, calibrate, NO_FAULT, MIN_CALIBRATION_N, type EvalCase, type CaseInputs } from "../validation";
const lowChargeInputs = base({ equipment: tgt }, { suction_psig: 100, high_psig: 300, suction_line_f: 55, liquid_line_f: 94, outdoor_ambient_f: 90, stabilized_min: 20, comp_running: "YES", ofm_running: "YES", supply_v: 240, return_db_f: 76, supply_db_f: 62, return_wb_f: 63 }) as unknown as CaseInputs;
const mk = (id: string, inputs: CaseInputs, gt: string[], split: EvalCase["split"] = "TEST"): EvalCase => ({ id, split, category: "STRAIGHT_AC", refrigerant: "R-410A", manufacturer: "Acme", inputs, groundTruth: gt });

test("split is deterministic per equipment and roughly 60/20/20", () => {
  assert.equal(splitFor("eq:abc"), splitFor("EQ:ABC "));
  const n = { TRAIN: 0, VALIDATION: 0, TEST: 0 };
  for (let i = 0; i < 3000; i++) n[splitFor(`eq:${i}`)]++;
  near(n.TRAIN / 3000, 0.6, 0.04); near(n.VALIDATION / 3000, 0.2, 0.04); near(n.TEST / 3000, 0.2, 0.04);
});

test("replay ignores technician decisions and scores top-1 / top-3", () => {
  const o = evaluateCase(mk("a", lowChargeInputs, ["LOW_CHARGE"]));
  assert.equal(o.abstained, false);
  assert.equal(o.prediction, "LOW_CHARGE");
  assert.ok(o.top1 && o.top3);
  const wrong = evaluateCase(mk("b", lowChargeInputs, ["CAPACITOR"]));
  assert.equal(wrong.top1, false);
});

test("engine abstains without measurements; verified 'no fault' is correct only when abstaining", () => {
  const empty = base({ equipment: tgt }, {}) as unknown as CaseInputs;
  const o = evaluateCase(mk("c", empty, [NO_FAULT]));
  assert.equal(o.abstained, true);
  assert.equal(o.top1, true);
  assert.equal(evaluateCase(mk("d", lowChargeInputs, [NO_FAULT])).top1, false);
});

test("missed safety-critical fault is counted as a false negative", () => {
  const o = evaluateCase(mk("e", lowChargeInputs, ["COMBUSTION_VENTING"]));
  assert.deepEqual(o.safetyMissed, ["COMBUSTION_VENTING"]);
});

test("Wilson interval and the 95 % target are never declared on small samples", () => {
  const w = wilson(95, 100);
  near(w.low!, 0.888, 0.002); near(w.high!, 0.978, 0.002);
  assert.equal(wilson(0, 0).rate, null);
  const r = runEvaluation(Array.from({ length: 20 }, (_, i) => mk(`t${i}`, lowChargeInputs, ["LOW_CHARGE"])));
  assert.equal(r.metrics.TEST.top1.rate, 1);
  assert.equal(r.target.met, false); // 20/20 is not evidence of ≥95 %
});

test("calibration needs enough validation cases before a percentage is usable", () => {
  const few = calibrate(Array.from({ length: MIN_CALIBRATION_N - 1 }, (_, i) => evaluateCase(mk(`v${i}`, lowChargeInputs, ["LOW_CHARGE"], "VALIDATION"))));
  assert.ok(few.entries.every((e) => !e.calibrated));
  const enough = calibrate(Array.from({ length: MIN_CALIBRATION_N }, (_, i) => evaluateCase(mk(`v${i}`, lowChargeInputs, i % 3 ? ["LOW_CHARGE"] : ["CAPACITOR"], "VALIDATION"))));
  const e = enough.entries.find((x) => x.fault === "LOW_CHARGE")!;
  assert.equal(e.calibrated, true);
  assert.equal(e.hits, 20);
});

// ── AI assistant guard ──
import { guardOutput, type AssistantContext } from "../assistant";
const actx = {
  equipment: { refrigerant: "R-410A" }, measurements: [{ key: "suction_psig", label: "Suction", circuit: 1, value: 100, text: null, unit: "psig" }],
  calculated: [{ key: "superheat_f", label: "Superheat", circuit: 1, value: 22.37, formula: "", note: null }],
  hypotheses: [{ id: "LOW_CHARGE", fault: "Low charge", status: "STRONGLY_SUSPECTED" }],
  nextMeasurements: [{ key: "drier_in_f", label: "Drier inlet", reason: "" }], stillRequired: [],
} as unknown as AssistantContext;

test("assistant guard drops invented numbers, unknown ids, certainty and unconfirmed major repairs", () => {
  const { output, removed } = guardOutput({
    overview: "Suction is 100 psig on R-410A. Superheat is 22.4 °F, which is high. Saturation should be 52 °F.",
    hypotheses: [
      { id: "LOW_CHARGE", explanation: "High superheat fits a low charge. It is definitely a leak. Add refrigerant to bring it back.", contradictions: null },
      { id: "MADE_UP", explanation: "Something else." },
    ],
    nextTest: { key: "compressor_megger", why: "Check 2 readings across the drier." },
    cautions: ["Expect 95% chance of a leak."],
  }, actx);
  assert.equal(output.overview, "Suction is 100 psig on R-410A. Superheat is 22.4 °F, which is high.");
  assert.equal(output.hypotheses.length, 1);
  assert.equal(output.hypotheses[0].explanation, "High superheat fits a low charge.");
  assert.equal(output.nextTest?.key, null);
  assert.equal(output.cautions.length, 0);
  assert.ok(removed.some((r) => r.reason.includes("52")));
  assert.ok(removed.some((r) => r.reason.includes("certainty")));
  assert.ok(removed.some((r) => r.reason.includes("major repair")));
  assert.ok(removed.some((r) => r.text === "MADE_UP"));
});

// ── Photo instruments (priority 5) ──
import { mergeFrames, type Proposal } from "../vision";
import { targetKeys, instrumentFor } from "../instruments";
const prop = (image: number, value: number, key = "suction_psig"): Proposal => ({ target: "measurement", key, label: key, circuit: 1, value, text: null, display: "", read: String(value), image, confidence: "high" });

test("video frames: stable readings merge into the latest value", () => {
  const [p] = mergeFrames([prop(0, 118), prop(1, 119), prop(2, 120)]);
  assert.equal(p.value, 120); assert.equal(p.frames, 3); assert.equal(p.unstable, false); assert.equal(p.warning, undefined);
});

test("video frames: drifting readings are flagged as not stabilized", () => {
  const [p] = mergeFrames([prop(0, 40, "suction_line_f"), prop(1, 44, "suction_line_f"), prop(2, 47, "suction_line_f")]);
  assert.equal(p.unstable, true); assert.deepEqual(p.range, [40, 47]); assert.match(p.warning ?? "", /not be stabilized/);
});

test("instrument targeting: the technician's choice limits what the AI may report", () => {
  assert.deepEqual(targetKeys("CLAMP_METER", ["comp_amps"]), ["comp_amps"]);
  assert.deepEqual(targetKeys("CLAMP_METER", []), []);
  assert.deepEqual(targetKeys("PSYCHROMETER", ["supply_db_f+supply_wb_f+supply_rh_pct"]), ["supply_db_f", "supply_wb_f", "supply_rh_pct"]);
  assert.ok(targetKeys("DIGITAL_MANIFOLD", null).includes("liquid_line_f"));
  assert.deepEqual(instrumentFor("tesp_inwc"), { instrument: "MANOMETER", option: "tesp_inwc" });
  assert.equal(instrumentFor("filter_condition"), null);
});

test("assistant guard drops A2L precautions on a non-A2L refrigerant", () => {
  const ctx = { ...actx, equipment: { refrigerant: "R-410A", refrigerantIsA2L: false } } as unknown as AssistantContext;
  const { output } = guardOutput({ overview: "Low charge is suspected.", cautions: ["A2L refrigerants require A2L-rated tools.", "Wear safety glasses."] }, ctx);
  assert.deepEqual(output.cautions, ["Wear safety glasses."]);
  const a2l = { ...actx, equipment: { refrigerant: "R-454B", refrigerantIsA2L: true } } as unknown as AssistantContext;
  assert.equal(guardOutput({ cautions: ["A2L refrigerants require A2L-rated tools."] }, a2l).output.cautions.length, 1);
});

// ── Phase 6: psychrometrics, diagnostic matrix, new fault scenarios ──
import { pws, airState, pressureAtElevation } from "../psychro";
import { buildMatrix } from "../matrix";
import { DEFAULT_FIELD_RULES } from "../rules";

// Reference values: ASHRAE Handbook—Fundamentals ch.1 tables (saturation pressure, standard atmosphere)
// and the ASHRAE psychrometric chart state at the AHRI 80 °F DB / 67 °F WB rating point.
test("saturation pressure of water matches the ASHRAE table", () => {
  near(pws(32), 0.08865, 0.0001);
  near(pws(70), 0.36334, 0.0005);
  near(pws(100), 0.95052, 0.002);
});
test("standard atmosphere vs elevation", () => {
  near(pressureAtElevation(0), 14.696, 0.001);
  near(pressureAtElevation(5000), 12.231, 0.01);
});
test("80 °F DB / 67 °F WB at sea level", () => {
  const s = airState({ db: 80, wb: 67, p: 14.696 }).state!;
  near(s.rh, 51.1, 1);
  near(s.dewPoint, 60.3, 0.5);
  near(s.grains, 78, 1.5);
  near(s.h, 31.5, 0.3);
});
test("DB + RH gives back the same wet bulb (round trip)", () => {
  const a = airState({ db: 75, wb: 62, p: 14.696 }).state!;
  const b = airState({ db: 75, rh: a.rh, p: 14.696 }).state!;
  near(b.wb, 62, 0.05);
});
test("impossible psychrometric inputs are rejected", () => {
  assert.equal(airState({ db: 70, wb: 72, p: 14.696 }).error?.code, "WB_ABOVE_DB");
  assert.equal(airState({ db: 70, rh: 120, p: 14.696 }).error?.code, "RH_OUT_OF_RANGE");
});

const air = { return_db_f: 80, return_wb_f: 67, supply_db_f: 60, supply_wb_f: 57, airflow_cfm: 1200 };
test("delta T, sensible (1.08) and total (4.5 × CFM × Δh) capacity", () => {
  const r = runEngine(base({}, air));
  const v = (k: string) => r.calculated.find((c) => c.key === k)!.value;
  assert.equal(v("air_dt_f"), 20);
  near(v("sensible_btuh"), 1.08 * 1200 * 20, 1);
  const dh = v("delta_h_btulb");
  near(v("total_btuh"), 4.5 * 1200 * dh, 200); // dh is rounded to 0.1 in the output
  assert.ok(v("shr") > 0 && v("shr") <= 1);
});
test("supply moister than return in cooling is flagged", () => {
  const r = runEngine(base({}, { return_db_f: 78, return_wb_f: 60, supply_db_f: 58, supply_wb_f: 57.5 }));
  assert.ok(r.alerts.some((a) => a.code === "SUPPLY_MOISTER_THAN_RETURN"));
});
test("RH disagreeing with wet bulb is flagged", () => {
  const r = runEngine(base({}, { return_db_f: 80, return_wb_f: 67, return_rh_pct: 70 }));
  assert.ok(r.alerts.some((a) => a.code === "PSYCHRO_RETURN_INCONSISTENT"));
});

const matrixFor = (input: EngineInput) => buildMatrix({ engine: runEngine(input), equipment: input.equipment, mode: input.mode, circuits: input.circuits, measurements: input.measurements, fieldRules: DEFAULT_FIELD_RULES });
const row = (m: ReturnType<typeof matrixFor>, k: string) => m.parameters.find((p) => p.key === k);
const lowCharge = { suction_psig: 100, high_psig: 300, suction_line_f: 55, liquid_line_f: 94, outdoor_ambient_f: 90 };

test("matrix: no manufacturer data → no LOW/NORMAL/HIGH (no universal ranges)", () => {
  const m = matrixFor(base({ equipment: { category: "STRAIGHT_AC", refrigerant: "R-410A", meteringDevice: "TXV", phase: 1 } }, { ...lowCharge, tesp_inwc: 0.9 }));
  for (const k of ["suction_psig", "high_psig", "superheat_f", "subcooling_f", "tesp_inwc"]) assert.equal(row(m, k)!.status, "NO_REFERENCE", k);
  assert.equal(m.shsc[0].cell, null);
});
test("matrix: classified against manufacturer targets; SH/SC cell for undercharge", () => {
  const m = matrixFor(base({ equipment: tgt }, lowCharge));
  assert.equal(row(m, "superheat_f")!.status, "HIGH");
  assert.equal(row(m, "subcooling_f")!.status, "LOW");
  assert.equal(m.shsc[0].cell, "HIGH_LOW");
});
test("matrix: chart pressure targets and the chart's condition range", () => {
  const eq = { ...tgt, specs: { ...tgt.specs, suctionTargetPsig: 125, highTargetPsig: 320, pressureTolerancePsi: 8, indoorWbMin: 57, indoorWbMax: 72 } };
  const m = matrixFor(base({ equipment: eq }, { ...lowCharge, return_db_f: 76, return_wb_f: 63 }));
  assert.equal(row(m, "suction_psig")!.status, "LOW");
  assert.equal(row(m, "high_psig")!.status, "LOW");
  const out = matrixFor(base({ equipment: eq }, { ...lowCharge, return_db_f: 76, return_wb_f: 52 }));
  assert.equal(row(out, "suction_psig")!.status, "NO_REFERENCE");
  assert.ok(out.correlations.some((c) => c.includes("outside the manufacturer charging chart")));
});
test("matrix: impossible reading is INVALID, not classified", () => {
  const m = matrixFor(base({ equipment: tgt }, { return_db_f: 70, return_wb_f: 75 }));
  assert.equal(row(m, "return_wb_f")!.status, "INVALID");
});
test("refrigeration + airflow correlation: high static → fix airflow before charge", () => {
  const eq = { ...tgt, specs: { ...tgt.specs, maxTesp: 0.5 } };
  const m = matrixFor(base({ equipment: eq }, { ...lowCharge, tesp_inwc: 0.95 }));
  assert.equal(row(m, "tesp_inwc")!.status, "HIGH");
  assert.ok(m.correlations[0].includes("correct the airflow first"));
});
test("matrix: inverter equipment gets no fixed-speed SH/SC cell", () => {
  const m = matrixFor(base({ equipment: { ...tgt, category: "MINI_SPLIT", compressorType: "INVERTER_ROTARY" } }, lowCharge));
  assert.ok(m.shsc.every((x) => x.cell == null));
});

test("TXV overfeeding: low SH, normal SC and a loose bulb", () => {
  const r = rulesFor(base({ equipment: tgt }, { suction_psig: 135, high_psig: 330, suction_line_f: 50, liquid_line_f: 90, txv_bulb_condition: "LOOSE" }));
  const h = r.hypotheses.find((x) => x.id === "TXV_OVERFEED")!;
  assert.ok(h && h.support.length >= 3);
  assert.notEqual(r.hypotheses.find((x) => x.id === "OVERCHARGE")?.status, "STRONGLY_SUSPECTED");
});
test("dirty filter needs inspection and/or a filter-drop reference", () => {
  const eq = { ...tgt, specs: { ...tgt.specs, filterMaxDrop: 0.15 } };
  const r = rulesFor(base({ equipment: eq }, { filter_condition: "DIRTY", filter_drop_inwc: 0.4 }));
  assert.equal(r.hypotheses.find((x) => x.id === "DIRTY_FILTER")!.status, "STRONGLY_SUSPECTED");
  const clean = rulesFor(base({ equipment: eq }, { filter_condition: "CLEAN", filter_drop_inwc: 0.08 }));
  assert.ok(!clean.hypotheses.some((x) => x.id === "DIRTY_FILTER"));
});
test("blower speed: airflow off target with normal static and clean filter/coil", () => {
  const eq = { ...tgt, specs: { ...tgt.specs, ratedCfm: 1200, cfmTolerancePct: 10, maxTesp: 0.5 } };
  const r = rulesFor(base({ equipment: eq }, { airflow_cfm: 900, tesp_inwc: 0.4, filter_condition: "CLEAN", evap_coil_condition: "CLEAN", blower_setting: "LOW" }));
  const h = r.hypotheses.find((x) => x.id === "BLOWER_SPEED")!;
  assert.equal(h.contradict.length, 0);
  assert.ok(h.support.length >= 2);
});
test("wrong refrigerant selection is raised as a hypothesis", () => {
  const r = rulesFor(base({}, { suction_psig: 40, high_psig: 120, outdoor_ambient_f: 95, return_db_f: 75 }));
  assert.ok(r.hypotheses.some((x) => x.id === "REFRIGERANT_MISID"));
});
