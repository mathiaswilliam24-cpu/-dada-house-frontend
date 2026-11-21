import { FIELD_BY_KEY } from "./catalog";

/**
 * Instrument capture by photo (priority 5 — chosen instead of direct Bluetooth/API integrations).
 * The technician says WHAT is in the picture (instrument) and, for single-reading meters, WHAT was
 * measured (probe location / test). The AI then only transcribes the display for those keys, which
 * removes the guesswork about where a probe was placed.
 */

export type InstrumentId =
  | "AUTO" | "NAMEPLATE" | "DIGITAL_MANIFOLD" | "ANALOG_GAUGES" | "CLAMP_METER" | "MULTIMETER" | "CAPACITOR_LABEL"
  | "THERMOMETER" | "PSYCHROMETER" | "MANOMETER" | "COMBUSTION_ANALYZER" | "CONTROL_DISPLAY";

export type Instrument = {
  label: string;
  hint: string;                 // capture advice shown to the technician
  /** what the technician picks before shooting: "all" = every key below is expected on the display */
  pick: "none" | "all" | "one" | "pair";
  options: { id: string; label: string; keys: string[] }[];
  equipment?: boolean;          // nameplate data
  promptNote: string;           // instrument-specific reading rules for the AI
};

const opt = (keys: string[], label?: string) => ({ id: keys.join("+"), label: label ?? FIELD_BY_KEY[keys[0]]?.label ?? keys[0], keys: keys.filter((k) => FIELD_BY_KEY[k]) });
const single = (keys: string[]) => keys.filter((k) => FIELD_BY_KEY[k]).map((k) => opt([k]));

export const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  AUTO: {
    label: "Anything (auto-detect)", hint: "Nameplate, manifold, meter… the AI decides what it sees.", pick: "none", options: [], equipment: true,
    promptNote: "Identify the instrument or label yourself.",
  },
  NAMEPLATE: {
    label: "Equipment nameplate / data label", hint: "Whole label in the frame, straight on, no flash glare.", pick: "none", options: [], equipment: true,
    promptNote: "This is an equipment data label. Report equipment keys only.",
  },
  DIGITAL_MANIFOLD: {
    label: "Digital manifold", hint: "Whole screen visible: both pressures and both clamp temperatures. Video of 10–15 s shows if readings are stable.",
    pick: "all", options: [opt(["suction_psig", "high_psig", "suction_line_f", "liquid_line_f"], "Pressures + suction/liquid line temperatures"), opt(["discharge_line_f"])],
    promptNote: "Digital manifold. LOW/suction side → suction_psig, HIGH/liquid side → high_psig, suction-line clamp (SLT, T1 on the low side) → suction_line_f, liquid-line clamp (LLT, T2 on the high side) → liquid_line_f. Also fill crossCheck with the refrigerant selected on the manifold and any superheat / subcooling it displays (for cross-checking only).",
  },
  ANALOG_GAUGES: {
    label: "Analog gauges", hint: "Face the gauge, needle and pressure scale in focus.", pick: "all", options: [opt(["suction_psig", "high_psig"], "Low and high side pressure")],
    promptNote: "Analog manifold gauges: read the PRESSURE scale (psig, usually the outer black scale) where the needle points, NOT the coloured temperature scales. Blue gauge → suction_psig, red gauge → high_psig. Analog readings are never better than 'medium' confidence.",
  },
  CLAMP_METER: {
    label: "Clamp meter", hint: "Choose what the clamp is on, then photograph the display.", pick: "one",
    options: single(["comp_amps", "comp_start_amps", "ofm_amps", "blower_amps", "supply_v", "loaded_v"]),
    promptNote: "Clamp meter. Report the main display value with its unit for the key requested. Ignore secondary/min/max small digits unless the key is a start (inrush) current.",
  },
  MULTIMETER: {
    label: "Multimeter", hint: "Choose the test, then photograph the display (and the dial if possible).", pick: "one",
    options: single(["supply_v", "loaded_v", "v_l1l2", "v_l2l3", "v_l1l3", "contactor_coil_v", "transformer_v", "cap_herm_measured_uf", "cap_fan_measured_uf", "winding_c_s_ohm", "winding_c_r_ohm", "winding_r_s_ohm", "insulation_megohm", "flame_sensor_ua"]),
    promptNote: "Multimeter. Report the main display value for the requested key. Respect the unit prefix shown (mV vs V, kΩ vs Ω, nF vs µF, µA). 'OL' means open/over-range: report text \"OL\" and value null.",
  },
  CAPACITOR_LABEL: {
    label: "Capacitor label", hint: "Photograph the printed rating (e.g. 45+5 µF ±6 %).", pick: "none",
    options: [opt(["cap_herm_rated_uf", "cap_fan_rated_uf", "cap_tolerance_pct"], "Capacitor rating")],
    promptNote: "Capacitor label. Dual capacitor 'A+B µF': the larger value is HERM (compressor) → cap_herm_rated_uf, the smaller is FAN → cap_fan_rated_uf. Single capacitor: report it for the key the technician picked, or cap_herm_rated_uf if unsure with confidence 'low'. Tolerance '±6%' → cap_tolerance_pct = 6.",
  },
  THERMOMETER: {
    label: "Thermometer / temperature probe", hint: "Choose where the probe is, then photograph the display.", pick: "one",
    options: single(["suction_line_f", "liquid_line_f", "discharge_line_f", "drier_in_f", "drier_out_f", "outdoor_ambient_f", "return_db_f", "supply_db_f", "outdoor_coil_f"]),
    promptNote: "Single temperature reading for the requested key. Report the unit displayed (°F or °C).",
  },
  PSYCHROMETER: {
    label: "Psychrometer / hygrometer", hint: "Choose return or supply, then photograph the display showing DB with WB and/or RH.", pick: "pair",
    options: [opt(["return_db_f", "return_wb_f", "return_rh_pct"], "Return air"), opt(["supply_db_f", "supply_wb_f", "supply_rh_pct"], "Supply air")],
    promptNote: "Psychrometer / hygrometer. Dry-bulb (DB, T, temp) → the *_db_f key, wet-bulb (WB) → the *_wb_f key, relative humidity (RH, %) → the *_rh_pct key. Report only what the display shows; ignore dew point and enthalpy (they are calculated).",
  },
  MANOMETER: {
    label: "Manometer (static / gas pressure)", hint: "Choose what is measured, then photograph the display.", pick: "one",
    options: single(["tesp_inwc", "return_static_inwc", "supply_static_inwc", "filter_drop_inwc", "coil_drop_inwc", "inlet_gas_inwc", "manifold_gas_inwc"]),
    promptNote: "Manometer. Report the value with the displayed unit (in. w.c./inH2O, Pa, mbar). A negative sign is significant for return static.",
  },
  COMBUSTION_ANALYZER: {
    label: "Combustion analyzer", hint: "Photograph the screen with the CO reading.", pick: "none", options: [opt(["co_flue_ppm"])],
    promptNote: "Combustion analyzer. Report air-free CO (COaf / CO air free) as co_flue_ppm. If only as-measured CO is shown, report it with confidence 'low' and say so in notes.",
  },
  CONTROL_DISPLAY: {
    label: "Control board / thermostat / inverter display", hint: "Photograph the LED code, screen or service-mode values.", pick: "one",
    options: single(["fault_code", "defrost_status", "sensor_readings", "eev_status", "compressor_hz"]),
    promptNote: "Control or inverter display. Report the code or value exactly as shown (e.g. 'E5', '3 flashes'). Never interpret what the code means.",
  },
};

export const INSTRUMENT_IDS = Object.keys(INSTRUMENTS) as InstrumentId[];

/** Keys the AI may report for this capture. */
export function targetKeys(instrument: InstrumentId, picked: string[] | null | undefined): string[] {
  const ins = INSTRUMENTS[instrument];
  if (!ins || instrument === "AUTO" || instrument === "NAMEPLATE") return [];
  if (ins.pick === "one" || ins.pick === "pair") {
    const o = ins.options.find((x) => x.id === picked?.[0]) ?? null;
    return o ? o.keys : [];
  }
  if (ins.pick === "all" && picked?.length) return ins.options.filter((o) => picked.includes(o.id)).flatMap((o) => o.keys);
  return ins.options.flatMap((o) => o.keys);
}

/** Best instrument to capture a missing measurement (for the "photos to take" checklist). */
export function instrumentFor(key: string): { instrument: InstrumentId; option: string } | null {
  for (const id of INSTRUMENT_IDS) {
    if (id === "AUTO" || id === "NAMEPLATE") continue;
    const o = INSTRUMENTS[id].options.find((x) => x.keys.includes(key));
    if (o) return { instrument: id, option: o.id };
  }
  return null;
}

/** Tolerance before readings of the same value across frames are called "not stable". */
export function stabilityTolerance(kind: string, value: number): number {
  if (kind === "temp" || kind === "tempDiff") return 2;          // °F
  if (kind === "pressure") return Math.max(5, Math.abs(value) * 0.03); // psig
  if (kind === "static") return 0.05;                              // in. w.c.
  return Math.max(0.1, Math.abs(value) * 0.05);
}
