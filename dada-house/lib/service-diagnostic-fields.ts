export type ServiceType = "AIR_CONDITIONING" | "HEATING" | "PLUMBING" | "REMODELING" | "OTHER";

export const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: "AIR_CONDITIONING", label: "Air Conditioning" },
  { value: "HEATING", label: "Heating" },
  { value: "PLUMBING", label: "Plumbing" },
  { value: "REMODELING", label: "Remodeling" },
  { value: "OTHER", label: "Other" },
];

export function guessServiceType(service: string | null | undefined): ServiceType {
  const s = (service ?? "").toLowerCase();
  if (s.includes("heat")) return "HEATING";
  if (s.includes("plumb")) return "PLUMBING";
  if (s.includes("remodel")) return "REMODELING";
  if (s.includes("air") || s.includes("ac") || s.includes("cooling") || s.includes("hvac")) return "AIR_CONDITIONING";
  return "OTHER";
}

export type FieldType = "text" | "textarea" | "select" | "yesno" | "number";

export type DiagnosticField = {
  id: string;
  label: string;
  type: FieldType;
  unit?: string;
  options?: string[];
};

// ── Section 3 — Air Conditioning Diagnostic ────────────────────────────────
export const AC_FIELDS: DiagnosticField[] = [
  // Equipment Information
  { id: "ac_system_type", label: "System Type", type: "text" },
  { id: "ac_manufacturer", label: "Manufacturer", type: "text" },
  { id: "ac_model_number", label: "Model Number", type: "text" },
  { id: "ac_serial_number", label: "Serial Number", type: "text" },
  { id: "ac_approximate_age", label: "Approximate Age", type: "text" },
  { id: "ac_refrigerant_type", label: "Refrigerant Type", type: "select", options: ["R-410A", "R-22", "R-32", "R-454B", "Other"] },
  { id: "ac_tonnage", label: "Tonnage", type: "text" },
  { id: "ac_thermostat_setting", label: "Thermostat Setting", type: "text" },
  { id: "ac_indoor_temperature", label: "Indoor Temperature", type: "number", unit: "°F" },
  { id: "ac_outdoor_temperature", label: "Outdoor Temperature", type: "number", unit: "°F" },
  // Electrical
  { id: "ac_supply_voltage", label: "Supply Voltage", type: "number", unit: "V" },
  { id: "ac_contactor_condition", label: "Contactor Condition", type: "select", options: ["Good", "Fair", "Failed"] },
  { id: "ac_capacitor_rating", label: "Capacitor Rating", type: "number", unit: "µF" },
  { id: "ac_capacitor_actual_reading", label: "Capacitor Actual Reading", type: "number", unit: "µF" },
  { id: "ac_compressor_amperage", label: "Compressor Amperage", type: "number", unit: "A" },
  { id: "ac_condenser_fan_amperage", label: "Condenser Fan Amperage", type: "number", unit: "A" },
  { id: "ac_blower_motor_amperage", label: "Blower Motor Amperage", type: "number", unit: "A" },
  { id: "ac_electrical_connections", label: "Electrical Connections", type: "select", options: ["Good", "Loose", "Damaged"] },
  { id: "ac_disconnect_breaker_condition", label: "Disconnect/Breaker Condition", type: "text" },
  // Refrigeration
  { id: "ac_suction_pressure", label: "Suction Pressure", type: "number", unit: "PSI" },
  { id: "ac_liquid_pressure", label: "Liquid/High-Side Pressure", type: "number", unit: "PSI" },
  { id: "ac_suction_line_temp", label: "Suction Line Temperature", type: "number", unit: "°F" },
  { id: "ac_liquid_line_temp", label: "Liquid Line Temperature", type: "number", unit: "°F" },
  { id: "ac_superheat", label: "Superheat", type: "number", unit: "°F" },
  { id: "ac_subcooling", label: "Subcooling", type: "number", unit: "°F" },
  { id: "ac_refrigerant_condition", label: "Refrigerant Condition", type: "select", options: ["Normal", "Suspected Low", "Suspected Overcharge", "Further Testing Required"] },
  { id: "ac_refrigerant_leak_evidence", label: "Evidence of Refrigerant Leak", type: "select", options: ["Yes", "No", "Not Tested"] },
  // Airflow / Drainage
  { id: "ac_return_air_temp", label: "Return Air Temperature", type: "number", unit: "°F" },
  { id: "ac_supply_air_temp", label: "Supply Air Temperature", type: "number", unit: "°F" },
  { id: "ac_temperature_split", label: "Temperature Split", type: "number", unit: "°F" },
  { id: "ac_filter_condition", label: "Filter Condition", type: "text" },
  { id: "ac_evaporator_coil_condition", label: "Evaporator Coil Condition", type: "text" },
  { id: "ac_condenser_coil_condition", label: "Condenser Coil Condition", type: "text" },
  { id: "ac_blower_condition", label: "Blower Condition", type: "text" },
  { id: "ac_drain_line_condition", label: "Drain Line Condition", type: "text" },
  { id: "ac_drain_pan_condition", label: "Drain Pan Condition", type: "text" },
  { id: "ac_float_switch", label: "Float Switch", type: "text" },
  { id: "ac_ductwork_condition", label: "Ductwork Visible Condition", type: "text" },
];

// ── Section 4 — Heating Diagnostic ──────────────────────────────────────────
export const HEATING_FIELDS: DiagnosticField[] = [
  { id: "heat_equipment_type", label: "Equipment Type", type: "text" },
  { id: "heat_manufacturer", label: "Manufacturer", type: "text" },
  { id: "heat_model_serial", label: "Model / Serial", type: "text" },
  { id: "heat_thermostat_operation", label: "Thermostat Operation", type: "text" },
  { id: "heat_supply_voltage", label: "Supply Voltage", type: "number", unit: "V" },
  { id: "heat_ignition_sequence", label: "Ignition Sequence", type: "text" },
  { id: "heat_ignitor_condition", label: "Ignitor Condition", type: "text" },
  { id: "heat_flame_sensor", label: "Flame Sensor", type: "text" },
  { id: "heat_gas_valve", label: "Gas Valve", type: "text" },
  { id: "heat_inducer_motor", label: "Inducer Motor", type: "text" },
  { id: "heat_blower_motor", label: "Blower Motor", type: "text" },
  { id: "heat_limit_switches", label: "Limit Switches", type: "text" },
  { id: "heat_pressure_switch", label: "Pressure Switch", type: "text" },
  { id: "heat_exchanger_condition", label: "Heat Exchanger Visible Condition", type: "text" },
  { id: "heat_burner_condition", label: "Burner Condition", type: "text" },
  { id: "heat_temperature_rise", label: "Temperature Rise", type: "number", unit: "°F" },
  { id: "heat_supply_temperature", label: "Supply Temperature", type: "number", unit: "°F" },
  { id: "heat_return_temperature", label: "Return Temperature", type: "number", unit: "°F" },
  { id: "heat_electrical_connections", label: "Electrical Connections", type: "select", options: ["Good", "Loose", "Damaged"] },
  { id: "heat_abnormal_noise_odor", label: "Abnormal Noise/Odor", type: "text" },
  { id: "heat_safety_controls", label: "Safety Controls", type: "text" },
  { id: "heat_co_concern", label: "Carbon Monoxide Concern", type: "select", options: ["Yes", "No", "Not Tested"] },
];

// ── Section 5 — Plumbing Diagnostic ─────────────────────────────────────────
export const PLUMBING_FIELDS: DiagnosticField[] = [
  { id: "plumb_problem_type", label: "Problem Type", type: "select", options: ["Water Leak", "Drain Clog", "Low Water Pressure", "Toilet", "Faucet", "Water Heater", "Sewer/Drain", "Pipe Damage", "Other"] },
  { id: "plumb_exact_location", label: "Exact Location of Problem", type: "text" },
  { id: "plumb_active_leak", label: "Active Leak", type: "yesno" },
  { id: "plumb_standing_water", label: "Standing Water", type: "yesno" },
  { id: "plumb_drainage_test", label: "Drainage Test Performed", type: "text" },
  { id: "plumb_water_pressure", label: "Water Pressure Reading", type: "number", unit: "PSI" },
  { id: "plumb_pipe_material", label: "Pipe Material", type: "text" },
  { id: "plumb_visible_corrosion", label: "Visible Corrosion", type: "text" },
  { id: "plumb_visible_damage", label: "Visible Damage", type: "text" },
  { id: "plumb_shutoff_valve_condition", label: "Shutoff Valve Condition", type: "text" },
  { id: "plumb_fixtures_tested", label: "Fixtures Tested", type: "text" },
  { id: "plumb_drain_flow_condition", label: "Drain Flow Condition", type: "text" },
  { id: "plumb_water_heater_condition", label: "Water Heater Condition", type: "text" },
  { id: "plumb_previous_repair_evidence", label: "Evidence of Previous Repair", type: "text" },
  { id: "plumb_potential_property_damage", label: "Potential Property Damage", type: "text" },
  { id: "plumb_further_testing_required", label: "Further Testing Required", type: "text" },
];

// ── Section 6 — Remodeling / Other ─────────────────────────────────────────
export const REMODELING_FIELDS: DiagnosticField[] = [
  { id: "remodel_area_inspected", label: "Area Inspected", type: "text" },
  { id: "remodel_customer_requested_work", label: "Customer Requested Work", type: "textarea" },
  { id: "remodel_existing_condition", label: "Existing Condition", type: "textarea" },
  { id: "remodel_measurements", label: "Measurements", type: "text" },
  { id: "remodel_structural_concern", label: "Structural Concern Observed", type: "text" },
  { id: "remodel_electrical_concern", label: "Electrical Concern Observed", type: "text" },
  { id: "remodel_plumbing_concern", label: "Plumbing Concern Observed", type: "text" },
  { id: "remodel_water_damage", label: "Water Damage", type: "text" },
  { id: "remodel_mold_observation", label: "Mold-like/Discoloration Observation", type: "text" },
  { id: "remodel_materials_required", label: "Materials Required", type: "textarea" },
  { id: "remodel_accessibility_issues", label: "Accessibility Issues", type: "text" },
  { id: "remodel_permit_required", label: "Permit Potentially Required", type: "yesno" },
  { id: "remodel_specialist_recommended", label: "Additional Specialist Evaluation Recommended", type: "yesno" },
];

export function sectionFieldsFor(serviceType: ServiceType): DiagnosticField[] {
  switch (serviceType) {
    case "AIR_CONDITIONING": return AC_FIELDS;
    case "HEATING": return HEATING_FIELDS;
    case "PLUMBING": return PLUMBING_FIELDS;
    case "REMODELING": return REMODELING_FIELDS;
    case "OTHER": return REMODELING_FIELDS;
  }
}

export const REPAIR_URGENCY_OPTIONS = [
  { value: "NORMAL", label: "Normal — System operational / non-urgent", color: "#16a34a" },
  { value: "RECOMMENDED", label: "Recommended — Repair should be scheduled", color: "#ca8a04" },
  { value: "URGENT", label: "Urgent — High risk of additional damage/failure", color: "#ea580c" },
  { value: "EMERGENCY", label: "Safety / Emergency — Immediate attention required", color: "#dc2626" },
];

export const ESTIMATED_REPAIR_TYPES = [
  "Minor Repair",
  "Major Repair",
  "Replacement Recommended",
  "Further Diagnostic Required",
  "No Repair Required",
];

export const SYSTEM_STATUS_OPTIONS = [
  "Operating Normally",
  "Operating Temporarily",
  "Not Operational",
  "Shut Down for Safety",
  "Diagnostic Only – No Repair Performed",
];

// ── Photo categories used by the diagnostic photo picker ───────────────────
export const DIAGNOSTIC_PHOTO_CATEGORIES = {
  BEFORE: "diagnostic-before",
  PROBLEM: "diagnostic-problem",
  NAMEPLATE: "diagnostic-nameplate",
  MEASUREMENT: "diagnostic-measurement",
  AFTER: "diagnostic-after",
} as const;

// ── Quality check ────────────────────────────────────────────────────────────

export type DiagnosticLike = {
  serviceType?: string | null;
  customerReportedIssue?: string | null;
  equipmentInspected?: string | null;
  systemOperatingOnArrival?: string | null;
  visibleDamage?: boolean | null;
  waterLeakPresent?: string | null;
  unusualNoise?: string | null;
  burningSmell?: boolean | null;
  immediateSafetyConcern?: boolean | null;
  safetyConcernDescription?: string | null;
  problemFound?: string | null;
  rootCause?: string | null;
  evidenceSupportingDiagnosis?: string | null;
  affectedComponents?: string | null;
  recommendedRepair?: string | null;
  canCustomerContinueUsing?: string | null;
  cannotContinueExplanation?: string | null;
  finalDiagnosis?: string | null;
  recommendedCorrectiveWork?: string | null;
};

export type PhotoCounts = {
  before: number;
  problem: number;
  nameplate: number;
};

export function getMissingRequiredFields(d: DiagnosticLike, photos: PhotoCounts): string[] {
  const missing: string[] = [];
  const blank = (v: string | null | undefined) => !v || !v.trim();

  if (blank(d.customerReportedIssue)) missing.push("Customer Reported Issue");
  if (blank(d.equipmentInspected)) missing.push("Equipment / Area Inspected");
  if (!d.systemOperatingOnArrival) missing.push("System operating when technician arrived?");
  if (d.visibleDamage === null || d.visibleDamage === undefined) missing.push("Visible damage?");
  if (!d.waterLeakPresent) missing.push("Water leak / moisture present?");
  if (!d.unusualNoise) missing.push("Unusual noise?");
  if (d.burningSmell === null || d.burningSmell === undefined) missing.push("Burning smell / unusual odor?");
  if (d.immediateSafetyConcern === null || d.immediateSafetyConcern === undefined) {
    missing.push("Immediate safety concern?");
  } else if (d.immediateSafetyConcern && blank(d.safetyConcernDescription)) {
    missing.push("Describe Safety Concern");
  }

  if (photos.before < 2) missing.push(`Before photos (${photos.before}/2 minimum)`);
  if (photos.problem < 1) missing.push("Problem Identified photo (minimum 1)");
  const svc = (d.serviceType as ServiceType) ?? "OTHER";
  if ((svc === "AIR_CONDITIONING" || svc === "HEATING") && photos.nameplate < 1) {
    missing.push("Equipment Nameplate photo (minimum 1)");
  }

  if (blank(d.problemFound)) missing.push("Problem Found");
  if (blank(d.rootCause)) missing.push("Root Cause");
  if (blank(d.evidenceSupportingDiagnosis)) missing.push("Evidence Supporting Diagnosis");
  if (blank(d.affectedComponents)) missing.push("Affected Component(s)");
  if (blank(d.recommendedRepair)) missing.push("Recommended Repair");

  if (!d.canCustomerContinueUsing) missing.push("Can customer safely continue using equipment?");
  else if (d.canCustomerContinueUsing === "NO" && blank(d.cannotContinueExplanation)) {
    missing.push("Explanation for why equipment cannot be used");
  }

  if (blank(d.finalDiagnosis)) missing.push("Final Diagnosis");
  if (blank(d.recommendedCorrectiveWork)) missing.push("Recommended Corrective Work");

  return missing;
}
