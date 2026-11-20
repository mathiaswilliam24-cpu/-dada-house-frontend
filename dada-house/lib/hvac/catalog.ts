import type { Kind } from "./units";

/** Static catalog for HVAC Diagnostic Pro: equipment types, complaints, modes and measurement fields. */

export const EQUIPMENT_CATEGORIES = {
  STRAIGHT_AC: { label: "Straight A/C (split)", group: "Residential", refrigeration: true, inverter: false },
  HEAT_PUMP: { label: "Heat pump (split)", group: "Residential", refrigeration: true, inverter: false, heatPump: true },
  GAS_FURNACE_AC: { label: "Gas furnace + A/C", group: "Residential", refrigeration: true, inverter: false, furnace: true },
  ELECTRIC_FURNACE_AC: { label: "Electric furnace / air handler + A/C", group: "Residential", refrigeration: true, inverter: false },
  AIR_HANDLER: { label: "Air handler only", group: "Residential", refrigeration: false, inverter: false },
  PACKAGE_UNIT: { label: "Package unit", group: "Residential", refrigeration: true, inverter: false },
  MINI_SPLIT: { label: "Mini-split (single zone)", group: "Residential", refrigeration: true, inverter: true, heatPump: true },
  MULTI_ZONE_MINI_SPLIT: { label: "Multi-zone mini-split", group: "Residential", refrigeration: true, inverter: true, heatPump: true },
  INVERTER_SPLIT: { label: "Inverter / variable-speed split", group: "Residential", refrigeration: true, inverter: true },
  DUAL_FUEL: { label: "Dual fuel (heat pump + gas furnace)", group: "Residential", refrigeration: true, inverter: false, heatPump: true, furnace: true },
  GAS_FURNACE: { label: "Gas furnace (heat only)", group: "Residential", refrigeration: false, inverter: false, furnace: true },
  RTU: { label: "Rooftop unit (RTU)", group: "Commercial", refrigeration: true, inverter: false },
  COMMERCIAL_PACKAGE: { label: "Commercial package (gas/electric)", group: "Commercial", refrigeration: true, inverter: false, furnace: true },
  COMMERCIAL_SPLIT: { label: "Commercial split", group: "Commercial", refrigeration: true, inverter: false },
  COMMERCIAL_HEAT_PUMP: { label: "Commercial heat pump", group: "Commercial", refrigeration: true, inverter: false, heatPump: true },
  VRF: { label: "VRF / VRV", group: "Commercial", refrigeration: true, inverter: true, heatPump: true },
} as const satisfies Record<string, { label: string; group: string; refrigeration: boolean; inverter: boolean; heatPump?: boolean; furnace?: boolean }>;
export type EquipmentCategory = keyof typeof EQUIPMENT_CATEGORIES;
export const categoryInfo = (c: string | null | undefined) =>
  (c && c in EQUIPMENT_CATEGORIES ? EQUIPMENT_CATEGORIES[c as EquipmentCategory] : null) as
  | { label: string; group: string; refrigeration: boolean; inverter: boolean; heatPump?: boolean; furnace?: boolean } | null;

export const METERING_DEVICES = { TXV: "TXV", EEV: "Electronic expansion valve (EEV)", PISTON: "Fixed orifice / piston", CAP_TUBE: "Capillary tube", UNKNOWN: "Unknown" } as const;
export const COMPRESSOR_TYPES = { SCROLL: "Scroll", RECIP: "Reciprocating", ROTARY: "Rotary", INVERTER_SCROLL: "Inverter scroll", INVERTER_ROTARY: "Inverter rotary", SCREW: "Screw", UNKNOWN: "Unknown" } as const;
export const HEATING_TYPES = { NONE: "None", HEAT_PUMP: "Heat pump", GAS: "Gas furnace", ELECTRIC: "Electric strips", DUAL_FUEL: "Dual fuel", HYDRONIC: "Hydronic" } as const;

export const COMPLAINTS = {
  AC_NOT_COOLING: "AC not cooling",
  AC_NOT_ON: "AC not turning on",
  WEAK_AIRFLOW: "Weak airflow",
  RUNNING_CONTINUOUSLY: "AC running continuously",
  INTERMITTENT_COOLING: "Intermittent cooling",
  FREEZING: "System freezing",
  WATER_LEAK: "Water leaking",
  HIGH_BILLS: "High electricity bills",
  NOISE: "Unusual noise",
  COMPRESSOR_NOT_STARTING: "Compressor not starting",
  OUTDOOR_FAN_NOT_RUNNING: "Outdoor fan not running",
  INDOOR_BLOWER_NOT_RUNNING: "Indoor blower not running",
  BREAKER_TRIPPING: "Breaker tripping",
  THERMOSTAT_NOT_RESPONDING: "Thermostat not responding",
  HP_NOT_HEATING: "Heat pump not heating",
  FURNACE_NOT_HEATING: "Gas furnace not heating",
  SHORT_CYCLING: "Short cycling",
  UNEVEN_TEMPS: "Uneven temperatures",
  POOR_HUMIDITY: "Poor humidity control",
  FAULT_CODE: "System displaying fault code",
  OTHER: "Other",
} as const;
export type Complaint = keyof typeof COMPLAINTS;

export const MODES = {
  COOLING: "Cooling",
  HEATING_HP: "Heating — heat pump",
  DEFROST: "Defrost",
  AUX_HEAT: "Auxiliary / emergency heat",
  HEATING_GAS: "Heating — gas",
  HEATING_ELECTRIC: "Heating — electric",
  FAN_ONLY: "Fan only",
  NOT_RUNNING: "Not running / won't start",
} as const;
export type Mode = keyof typeof MODES;

const COOLING_PERF: Complaint[] = ["AC_NOT_COOLING", "RUNNING_CONTINUOUSLY", "INTERMITTENT_COOLING", "FREEZING", "HIGH_BILLS", "POOR_HUMIDITY", "SHORT_CYCLING", "UNEVEN_TEMPS"];
const NO_RUN: Complaint[] = ["AC_NOT_ON", "COMPRESSOR_NOT_STARTING", "OUTDOOR_FAN_NOT_RUNNING", "INDOOR_BLOWER_NOT_RUNNING", "BREAKER_TRIPPING", "THERMOSTAT_NOT_RESPONDING"];
const AIRFLOW: Complaint[] = ["WEAK_AIRFLOW", "INDOOR_BLOWER_NOT_RUNNING", "UNEVEN_TEMPS", "FREEZING", "WATER_LEAK", "POOR_HUMIDITY"];

export type Ctx = {
  category: string | null; complaint: string | null; mode: string | null; phase: number | null;
  inverter: boolean; heatPump: boolean; furnace: boolean; refrigeration: boolean;
};

export function buildCtx(s: { category?: string | null; complaint?: string | null; mode?: string | null; phase?: number | null; compressorType?: string | null }): Ctx {
  const c = categoryInfo(s.category);
  return {
    category: s.category ?? null, complaint: s.complaint ?? null, mode: s.mode ?? null, phase: s.phase ?? null,
    inverter: !!c?.inverter || (s.compressorType ?? "").startsWith("INVERTER"),
    heatPump: !!c?.heatPump, furnace: !!c?.furnace, refrigeration: c ? c.refrigeration : true,
  };
}

const has = (list: Complaint[], c: string | null) => !!c && (list as string[]).includes(c);
const refrigerantRunning = (x: Ctx) => x.refrigeration && (x.mode === "COOLING" || x.mode === "HEATING_HP" || x.mode === "DEFROST");
const coolingWork = (x: Ctx) => has(COOLING_PERF, x.complaint) || x.complaint === "HP_NOT_HEATING" || x.complaint === "WATER_LEAK";

export type SafetyTag = "LIVE" | "DEENERGIZED" | "STORED_ENERGY";
export const SAFETY_TAGS: Record<SafetyTag, { label: string; text: string }> = {
  LIVE: { label: "Live test", text: "Energized test — qualified technicians only, rated meter and PPE." },
  DEENERGIZED: { label: "Power off + LOTO", text: "Disconnect power and lock out / tag out before this test." },
  STORED_ENERGY: { label: "Discharge first", text: "Power off, lock out, then safely discharge the capacitor before handling or testing." },
};

export type Group = "refrigeration" | "air" | "electrical" | "system";
export type Field = {
  key: string; label: string; group: Group; kind: Kind; unit?: string;
  input: "number" | "select" | "text" | "yesno";
  options?: Record<string, string>;
  perCircuit?: boolean;
  hint?: string;
  safety?: SafetyTag;
  /** plausible canonical range — outside is flagged as a probable entry error */
  range?: [number, number];
  show?: (x: Ctx) => boolean;
  required?: (x: Ctx) => boolean;
};

const CONDITION = { CLEAN: "Clean", DIRTY: "Dirty", RESTRICTED: "Restricted / blocked", NOT_CHECKED: "Not checked" };

export const FIELDS: Field[] = [
  // ── Refrigeration (per circuit) ──
  { key: "suction_psig", label: "Suction (low-side) pressure", group: "refrigeration", kind: "pressure", input: "number", perCircuit: true, range: [-10, 400],
    hint: "Heat pump in heating: read true suction at the compressor/accumulator port, not the vapor-line service valve (it is the discharge side in heating).",
    show: (x) => x.refrigeration, required: (x) => refrigerantRunning(x) && coolingWork(x) },
  { key: "high_psig", label: "High-side (liquid / discharge) pressure", group: "refrigeration", kind: "pressure", input: "number", perCircuit: true, range: [0, 800],
    show: (x) => x.refrigeration, required: (x) => refrigerantRunning(x) && coolingWork(x) },
  { key: "suction_line_f", label: "Suction line temperature", group: "refrigeration", kind: "temp", input: "number", perCircuit: true, range: [-40, 200],
    hint: "Within 6 in. of the suction pressure port, clamp probe insulated.", show: (x) => x.refrigeration, required: (x) => refrigerantRunning(x) && coolingWork(x) },
  { key: "liquid_line_f", label: "Liquid line temperature", group: "refrigeration", kind: "temp", input: "number", perCircuit: true, range: [-20, 200],
    hint: "Near the liquid pressure port.", show: (x) => x.refrigeration, required: (x) => refrigerantRunning(x) && coolingWork(x) },
  { key: "discharge_line_f", label: "Compressor discharge line temperature", group: "refrigeration", kind: "temp", input: "number", perCircuit: true, range: [0, 350],
    hint: "Optional — about 6 in. from the compressor.", show: (x) => x.refrigeration },
  { key: "compressor_stage", label: "Compressor stage running", group: "refrigeration", kind: "plain", input: "select", perCircuit: true,
    options: { LOW: "Low / 1st stage", HIGH: "High / 2nd stage", FULL: "Single stage", VARIABLE: "Variable (inverter)" }, show: (x) => x.refrigeration },
  { key: "compressor_hz", label: "Compressor frequency", group: "refrigeration", kind: "plain", unit: "Hz", input: "number", perCircuit: true, range: [0, 200],
    hint: "From the unit's service mode / display.", show: (x) => x.inverter, required: (x) => x.inverter && refrigerantRunning(x) },
  { key: "stabilized_min", label: "Run time before readings", group: "refrigeration", kind: "plain", unit: "min", input: "number", range: [0, 240],
    hint: "Most manufacturers require 15+ minutes of stable operation before charge readings — check the unit's instructions.", show: (x) => x.refrigeration, required: (x) => refrigerantRunning(x) && coolingWork(x) },

  // ── Air & temperatures ──
  { key: "outdoor_ambient_f", label: "Outdoor ambient (entering condenser air)", group: "air", kind: "temp", input: "number", range: [-30, 130],
    required: (x) => (refrigerantRunning(x) && coolingWork(x)) || x.complaint === "HP_NOT_HEATING" },
  { key: "return_db_f", label: "Return air dry-bulb", group: "air", kind: "temp", input: "number", range: [30, 110],
    required: (x) => coolingWork(x) || has(AIRFLOW, x.complaint) || x.mode === "HEATING_GAS" || x.mode === "HEATING_ELECTRIC" || x.mode === "HEATING_HP" },
  { key: "return_wb_f", label: "Return air wet-bulb", group: "air", kind: "temp", input: "number", range: [30, 100],
    hint: "Needed for most manufacturer charging charts (fixed orifice).", required: (x) => x.mode === "COOLING" && coolingWork(x) },
  { key: "supply_db_f", label: "Supply air dry-bulb", group: "air", kind: "temp", input: "number", range: [20, 200],
    required: (x) => coolingWork(x) || has(AIRFLOW, x.complaint) || x.mode === "HEATING_GAS" || x.mode === "HEATING_ELECTRIC" || x.mode === "HEATING_HP" },
  { key: "supply_wb_f", label: "Supply air wet-bulb", group: "air", kind: "temp", input: "number", range: [20, 100] },
  { key: "tesp_inwc", label: "Total external static pressure", group: "air", kind: "static", input: "number", range: [0, 3],
    required: (x) => x.complaint === "WEAK_AIRFLOW" || x.complaint === "FREEZING" },
  { key: "return_static_inwc", label: "Return static (before blower)", group: "air", kind: "static", input: "number", range: [-3, 0.5] },
  { key: "supply_static_inwc", label: "Supply static (after coil/heat exchanger)", group: "air", kind: "static", input: "number", range: [-0.5, 3] },
  { key: "filter_drop_inwc", label: "Filter pressure drop", group: "air", kind: "static", input: "number", range: [0, 2] },
  { key: "coil_drop_inwc", label: "Indoor coil pressure drop", group: "air", kind: "static", input: "number", range: [0, 2] },
  { key: "airflow_cfm", label: "Measured airflow", group: "air", kind: "plain", unit: "CFM", input: "number", range: [0, 50000],
    hint: "Only a measured value (flow hood, traverse, TrueFlow…). Do not estimate from static pressure without the blower table." },
  { key: "blower_setting", label: "Blower speed tap / setting", group: "air", kind: "plain", input: "text" },
  { key: "blower_motor_type", label: "Blower motor type", group: "air", kind: "plain", input: "select",
    options: { PSC: "PSC", ECM_CT: "ECM constant-torque (X13)", ECM_VS: "ECM variable-speed", BELT: "Belt drive", COMMERCIAL: "Commercial supply fan" } },
  { key: "filter_condition", label: "Filter condition", group: "air", kind: "plain", input: "select", options: CONDITION, required: (x) => has(AIRFLOW, x.complaint) },
  { key: "evap_coil_condition", label: "Evaporator coil condition", group: "air", kind: "plain", input: "select", options: CONDITION, required: (x) => x.complaint === "FREEZING" || x.complaint === "WEAK_AIRFLOW" },
  { key: "condenser_coil_condition", label: "Condenser coil condition", group: "air", kind: "plain", input: "select", options: CONDITION, show: (x) => x.refrigeration },
  { key: "blower_wheel_condition", label: "Blower wheel condition", group: "air", kind: "plain", input: "select", options: CONDITION },
  { key: "duct_restriction", label: "Duct restrictions found", group: "air", kind: "plain", input: "text" },

  // ── Electrical ──
  { key: "supply_v", label: "Supply voltage (idle)", group: "electrical", kind: "plain", unit: "V", input: "number", safety: "LIVE", range: [0, 700],
    required: (x) => has(NO_RUN, x.complaint) || x.complaint === "AC_NOT_COOLING" },
  { key: "loaded_v", label: "Voltage under load", group: "electrical", kind: "plain", unit: "V", input: "number", safety: "LIVE", range: [0, 700] },
  { key: "v_l1l2", label: "Voltage L1–L2", group: "electrical", kind: "plain", unit: "V", input: "number", safety: "LIVE", range: [0, 700], show: (x) => x.phase === 3, required: (x) => x.phase === 3 },
  { key: "v_l2l3", label: "Voltage L2–L3", group: "electrical", kind: "plain", unit: "V", input: "number", safety: "LIVE", range: [0, 700], show: (x) => x.phase === 3, required: (x) => x.phase === 3 },
  { key: "v_l1l3", label: "Voltage L1–L3", group: "electrical", kind: "plain", unit: "V", input: "number", safety: "LIVE", range: [0, 700], show: (x) => x.phase === 3, required: (x) => x.phase === 3 },
  { key: "comp_amps", label: "Compressor running current", group: "electrical", kind: "plain", unit: "A", input: "number", safety: "LIVE", perCircuit: true, range: [0, 500],
    show: (x) => x.refrigeration, required: (x) => x.refrigeration && (x.complaint === "BREAKER_TRIPPING" || x.complaint === "HIGH_BILLS") },
  { key: "comp_start_amps", label: "Compressor start (inrush) current", group: "electrical", kind: "plain", unit: "A", input: "number", safety: "LIVE", perCircuit: true, range: [0, 1500], show: (x) => x.refrigeration && !x.inverter },
  { key: "ofm_amps", label: "Outdoor fan motor current", group: "electrical", kind: "plain", unit: "A", input: "number", safety: "LIVE", range: [0, 100], show: (x) => x.refrigeration },
  { key: "blower_amps", label: "Indoor blower current", group: "electrical", kind: "plain", unit: "A", input: "number", safety: "LIVE", range: [0, 100] },
  { key: "cap_herm_rated_uf", label: "Capacitor rating — HERM (compressor)", group: "electrical", kind: "plain", unit: "µF", input: "number", range: [1, 120], show: (x) => x.refrigeration && !x.inverter,
    required: (x) => !x.inverter && (x.complaint === "COMPRESSOR_NOT_STARTING") },
  { key: "cap_herm_measured_uf", label: "Capacitor measured — HERM", group: "electrical", kind: "plain", unit: "µF", input: "number", safety: "STORED_ENERGY", range: [0, 150], show: (x) => x.refrigeration && !x.inverter,
    required: (x) => !x.inverter && (x.complaint === "COMPRESSOR_NOT_STARTING") },
  { key: "cap_fan_rated_uf", label: "Capacitor rating — FAN", group: "electrical", kind: "plain", unit: "µF", input: "number", range: [1, 30], show: (x) => !x.inverter,
    required: (x) => !x.inverter && x.complaint === "OUTDOOR_FAN_NOT_RUNNING" },
  { key: "cap_fan_measured_uf", label: "Capacitor measured — FAN", group: "electrical", kind: "plain", unit: "µF", input: "number", safety: "STORED_ENERGY", range: [0, 40], show: (x) => !x.inverter,
    required: (x) => !x.inverter && x.complaint === "OUTDOOR_FAN_NOT_RUNNING" },
  { key: "cap_tolerance_pct", label: "Capacitor tolerance printed on the label", group: "electrical", kind: "plain", unit: "±%", input: "number", range: [1, 20], show: (x) => !x.inverter,
    hint: "Read it on the capacitor (e.g. ±5%, ±6%). Without it the deviation is shown but not judged." },
  { key: "contactor_condition", label: "Contactor condition", group: "electrical", kind: "plain", input: "select", show: (x) => !x.inverter,
    options: { OK: "OK", PITTED: "Pitted / burnt contacts", WELDED: "Contacts welded closed", NOT_PULLING_IN: "Not pulling in", NOT_CHECKED: "Not checked" },
    required: (x) => !x.inverter && (x.complaint === "COMPRESSOR_NOT_STARTING" || x.complaint === "AC_NOT_ON" || x.complaint === "OUTDOOR_FAN_NOT_RUNNING") },
  { key: "contactor_coil_v", label: "Contactor coil voltage (call for cooling)", group: "electrical", kind: "plain", unit: "VAC", input: "number", safety: "LIVE", range: [0, 300], show: (x) => !x.inverter,
    required: (x) => !x.inverter && (x.complaint === "COMPRESSOR_NOT_STARTING" || x.complaint === "AC_NOT_ON") },
  { key: "transformer_v", label: "Control transformer secondary", group: "electrical", kind: "plain", unit: "VAC", input: "number", safety: "LIVE", range: [0, 60],
    required: (x) => x.complaint === "THERMOSTAT_NOT_RESPONDING" || x.complaint === "AC_NOT_ON" },
  { key: "thermostat_signals", label: "Thermostat call signals present", group: "electrical", kind: "plain", input: "text", hint: "e.g. R, C, Y1, G, O/B, W1 — what is energized during the call.",
    required: (x) => x.complaint === "THERMOSTAT_NOT_RESPONDING" || x.complaint === "AC_NOT_ON" },
  { key: "fault_code", label: "Control board / unit fault code", group: "electrical", kind: "plain", input: "text", hint: "Exactly as displayed (LED flashes, code). Interpretation needs the manufacturer's code table.",
    required: (x) => x.complaint === "FAULT_CODE" || x.inverter },
  { key: "pressure_switch_status", label: "High/low pressure switch status", group: "electrical", kind: "plain", input: "select", show: (x) => x.refrigeration,
    options: { CLOSED: "Closed (normal)", OPEN_HIGH: "High-pressure switch open", OPEN_LOW: "Low-pressure switch open", LOCKOUT: "Lockout active", NOT_CHECKED: "Not checked" } },
  { key: "winding_c_s_ohm", label: "Compressor winding C–S", group: "electrical", kind: "plain", unit: "Ω", input: "number", safety: "DEENERGIZED", perCircuit: true, range: [0, 100], show: (x) => x.refrigeration && !x.inverter },
  { key: "winding_c_r_ohm", label: "Compressor winding C–R", group: "electrical", kind: "plain", unit: "Ω", input: "number", safety: "DEENERGIZED", perCircuit: true, range: [0, 100], show: (x) => x.refrigeration && !x.inverter },
  { key: "winding_r_s_ohm", label: "Compressor winding R–S", group: "electrical", kind: "plain", unit: "Ω", input: "number", safety: "DEENERGIZED", perCircuit: true, range: [0, 200], show: (x) => x.refrigeration && !x.inverter },
  { key: "insulation_megohm", label: "Compressor insulation to ground", group: "electrical", kind: "plain", unit: "MΩ", input: "number", safety: "DEENERGIZED", perCircuit: true, range: [0, 10000],
    hint: "Megohmmeter test — follow the compressor manufacturer's procedure.", show: (x) => x.refrigeration },

  // ── System-specific: gas furnace ──
  { key: "heat_call", label: "Thermostat heat call (W) present", group: "system", kind: "plain", input: "yesno", show: (x) => x.furnace, required: (x) => x.complaint === "FURNACE_NOT_HEATING" },
  { key: "ignition_sequence", label: "Ignition sequence observed", group: "system", kind: "plain", input: "text", hint: "e.g. inducer on → PS closes → igniter glows → valve opens → flame → drops out after 5 s", show: (x) => x.furnace, required: (x) => x.complaint === "FURNACE_NOT_HEATING" },
  { key: "inducer_ok", label: "Inducer motor runs", group: "system", kind: "plain", input: "yesno", show: (x) => x.furnace, required: (x) => x.complaint === "FURNACE_NOT_HEATING" },
  { key: "furnace_ps_status", label: "Furnace pressure switch closes", group: "system", kind: "plain", input: "yesno", show: (x) => x.furnace, required: (x) => x.complaint === "FURNACE_NOT_HEATING" },
  { key: "igniter_ok", label: "Igniter / spark operates", group: "system", kind: "plain", input: "yesno", show: (x) => x.furnace },
  { key: "flame_sensor_ua", label: "Flame sensor signal", group: "system", kind: "plain", unit: "µA DC", input: "number", safety: "LIVE", range: [0, 30], show: (x) => x.furnace,
    hint: "Compare with the manufacturer's minimum on the furnace literature." },
  { key: "gas_valve_ok", label: "Gas valve opens on call", group: "system", kind: "plain", input: "yesno", show: (x) => x.furnace },
  { key: "inlet_gas_inwc", label: "Inlet gas pressure", group: "system", kind: "plain", unit: "in. w.c.", input: "number", range: [0, 20], show: (x) => x.furnace },
  { key: "manifold_gas_inwc", label: "Manifold gas pressure", group: "system", kind: "plain", unit: "in. w.c.", input: "number", range: [0, 15], show: (x) => x.furnace },
  { key: "limit_status", label: "Limit / rollout switches", group: "system", kind: "plain", input: "select", show: (x) => x.furnace,
    options: { CLOSED: "Closed (normal)", HIGH_LIMIT_OPEN: "High limit open", ROLLOUT_OPEN: "Rollout switch open / tripped", NOT_CHECKED: "Not checked" } },
  { key: "venting_observation", label: "Venting observations", group: "system", kind: "plain", input: "text", show: (x) => x.furnace },
  { key: "co_flue_ppm", label: "Flue CO (air-free) from combustion analyzer", group: "system", kind: "plain", unit: "ppm", input: "number", range: [0, 5000], show: (x) => x.furnace,
    hint: "Compare with the manufacturer's combustion specification." },
  { key: "hx_inspection", label: "Heat exchanger inspection", group: "system", kind: "plain", input: "select", show: (x) => x.furnace,
    options: { NO_DEFECT: "No defect found", SUSPECT: "Suspected crack / breach", CONFIRMED: "Crack / breach confirmed", NOT_INSPECTED: "Not inspected" } },

  // ── System-specific: heat pump ──
  { key: "rv_signal", label: "Reversing valve signal (O/B) present", group: "system", kind: "plain", input: "yesno", show: (x) => x.heatPump, required: (x) => x.complaint === "HP_NOT_HEATING" },
  { key: "defrost_status", label: "Defrost board status / code", group: "system", kind: "plain", input: "text", show: (x) => x.heatPump, required: (x) => x.complaint === "HP_NOT_HEATING" },
  { key: "outdoor_coil_f", label: "Outdoor coil temperature", group: "system", kind: "temp", input: "number", range: [-40, 160], show: (x) => x.heatPump },
  { key: "outdoor_coil_ice", label: "Outdoor coil ice build-up", group: "system", kind: "plain", input: "select", show: (x) => x.heatPump,
    options: { NONE: "None", LIGHT: "Light frost", HEAVY: "Heavy ice / blocked", NOT_CHECKED: "Not checked" } },
  { key: "aux_heat_ok", label: "Auxiliary heat energizes on call", group: "system", kind: "plain", input: "yesno", show: (x) => x.heatPump },

  // ── System-specific: inverter / mini-split / VRF ──
  { key: "indoor_model", label: "Indoor unit model", group: "system", kind: "plain", input: "text", show: (x) => x.inverter },
  { key: "sensor_readings", label: "Indoor/outdoor sensor readings (service mode)", group: "system", kind: "plain", input: "text", show: (x) => x.inverter },
  { key: "comm_fault", label: "Communication fault", group: "system", kind: "plain", input: "yesno", show: (x) => x.inverter },
  { key: "eev_status", label: "EEV position / status", group: "system", kind: "plain", input: "text", show: (x) => x.inverter },

  // ── Water / condensate ──
  { key: "condensate_observation", label: "Condensate drain / pan / float switch", group: "system", kind: "plain", input: "text",
    show: (x) => x.complaint === "WATER_LEAK" || x.complaint === "FREEZING", required: (x) => x.complaint === "WATER_LEAK" },
  { key: "noise_description", label: "Noise description and location", group: "system", kind: "plain", input: "text",
    show: (x) => x.complaint === "NOISE", required: (x) => x.complaint === "NOISE" },
];

export const FIELD_BY_KEY = Object.fromEntries(FIELDS.map((f) => [f.key, f])) as Record<string, Field>;

export const visibleFields = (x: Ctx, group: Group) => FIELDS.filter((f) => f.group === group && (f.show ? f.show(x) : true));
export const isRequired = (f: Field, x: Ctx) => (f.required ? f.required(x) : false);

/** Preliminary safety checks (wizard step 4). `critical` answers stop the diagnostic flow with an alert. */
export const SAFETY_CHECKS = [
  { key: "gas_odor", label: "Gas odor present", critical: true, show: (x: Ctx) => x.furnace,
    action: "Do not operate any switches. Shut off gas at the appliance/meter if safe, ventilate, evacuate if strong, and call the gas utility. Do not restart the appliance." },
  { key: "co_alarm", label: "CO alarm sounding or CO detected in the living space", critical: true,
    action: "Get occupants to fresh air, ventilate, shut down fuel-burning equipment, and do not restart it until the source is found and corrected." },
  { key: "flame_rollout", label: "Flame rollout, scorching, or soot at the burner area", critical: true, show: (x: Ctx) => x.furnace,
    action: "Shut the furnace down. Combustion/venting fault suspected — do not operate until combustion and venting are verified per the manufacturer." },
  { key: "vent_problem", label: "Vent disconnected, blocked, or spilling flue gas", critical: true, show: (x: Ctx) => x.furnace,
    action: "Shut the appliance down and red-tag per company policy and local code. Do not operate until the vent is repaired and verified." },
  { key: "burnt_wiring", label: "Burnt / melted wiring or arcing evidence", critical: true,
    action: "De-energize, lock out / tag out. Do not re-energize until the damaged conductors and terminations are repaired." },
  { key: "water_electrical", label: "Water on or near electrical components", critical: true,
    action: "De-energize and lock out before any work. Dry and inspect components before restoring power." },
  { key: "oil_stains", label: "Oil stains / visible refrigerant leak", critical: false,
    action: "Note leak location; leak-check before adding refrigerant." },
  { key: "breaker_hot", label: "Breaker or disconnect hot / discolored", critical: true,
    action: "De-energize upstream and lock out. Inspect conductors, lugs and breaker before re-energizing." },
  { key: "access_unsafe", label: "Unsafe access (roof, attic, ladder, confined space)", critical: false,
    action: "Use fall protection / confined-space procedure per company policy before continuing." },
] as const;
