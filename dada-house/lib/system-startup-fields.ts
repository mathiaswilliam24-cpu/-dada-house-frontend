export type ChecklistResult = "PASS" | "FAIL" | "NA";

export type ChecklistItem = {
  id: string;
  label: string;
  result: ChecklistResult | null;
  comment: string;
};

export type ChecklistItemDef = { id: string; label: string };

export function emptyChecklist(defs: ChecklistItemDef[]): ChecklistItem[] {
  return defs.map((d) => ({ id: d.id, label: d.label, result: null, comment: "" }));
}

// ── Section 2 — Equipment field catalogs ────────────────────────────────────

export type EquipmentField = { id: string; label: string; type: "text" | "select"; options?: string[] };

export const OUTDOOR_UNIT_FIELDS: EquipmentField[] = [
  { id: "manufacturer", label: "Manufacturer", type: "text" },
  { id: "modelNumber", label: "Model Number", type: "text" },
  { id: "serialNumber", label: "Serial Number", type: "text" },
  { id: "tonnageCapacity", label: "Tonnage / Capacity", type: "text" },
  { id: "seer2", label: "SEER2", type: "text" },
  { id: "refrigerantType", label: "Refrigerant Type", type: "select", options: ["R-410A", "R-32", "R-454B", "Other"] },
  { id: "factoryCharge", label: "Factory Charge", type: "text" },
  { id: "additionalRefrigerantAdded", label: "Additional Refrigerant Added", type: "text" },
  { id: "lineSetLength", label: "Line-set Length", type: "text" },
];

export const INDOOR_UNIT_FIELDS: EquipmentField[] = [
  { id: "manufacturer", label: "Manufacturer", type: "text" },
  { id: "modelNumber", label: "Model Number", type: "text" },
  { id: "serialNumber", label: "Serial Number", type: "text" },
  { id: "capacity", label: "Capacity", type: "text" },
  { id: "blowerType", label: "Blower Type", type: "text" },
  { id: "electricHeatKitSize", label: "Electric Heat Kit Size", type: "text" },
  { id: "furnaceInputOutputBtu", label: "Furnace Input/Output BTU", type: "text" },
];

export const THERMOSTAT_FIELDS: EquipmentField[] = [
  { id: "manufacturer", label: "Manufacturer", type: "text" },
  { id: "modelNumber", label: "Model", type: "text" },
  { id: "serialNumber", label: "Serial", type: "text" },
  { id: "wifiConfigured", label: "Wi-Fi Configured", type: "select", options: ["Yes", "No", "N/A"] },
];

export type EquipmentType = "OUTDOOR" | "INDOOR" | "THERMOSTAT";

export const EQUIPMENT_TYPE_LABEL: Record<EquipmentType, string> = {
  OUTDOOR: "Outdoor Unit",
  INDOOR: "Indoor Unit / Air Handler / Furnace",
  THERMOSTAT: "Thermostat",
};

export function equipmentFieldsFor(type: EquipmentType): EquipmentField[] {
  if (type === "OUTDOOR") return OUTDOOR_UNIT_FIELDS;
  if (type === "INDOOR") return INDOOR_UNIT_FIELDS;
  return THERMOSTAT_FIELDS;
}

export type EquipmentEntry = { id: string; equipmentType: EquipmentType; values: Record<string, string> };

// ── Section 3 — Installation Verification checklists ────────────────────────

export const INSTALLATION_CHECKLIST_OUTDOOR: ChecklistItemDef[] = [
  { id: "unit_level_secured", label: "Unit level and secured" },
  { id: "clearances_verified", label: "Required clearances verified" },
  { id: "disconnect_installed", label: "Disconnect installed/verified" },
  { id: "electrical_whip_secured", label: "Electrical whip secured" },
  { id: "service_valves_open", label: "Service valves fully opened" },
  { id: "refrigerant_lines_connected", label: "Refrigerant lines properly connected" },
  { id: "suction_line_insulated", label: "Suction line properly insulated" },
  { id: "line_set_supported", label: "Line set properly supported/protected" },
  { id: "condensate_management", label: "Condensate/water management verified where applicable" },
];

export const INSTALLATION_CHECKLIST_INDOOR: ChecklistItemDef[] = [
  { id: "equipment_secured_level", label: "Equipment secured and level" },
  { id: "supply_plenum_sealed", label: "Supply plenum sealed" },
  { id: "return_connection_sealed", label: "Return connection sealed" },
  { id: "filter_installed", label: "Filter installed" },
  { id: "electrical_connections_secured", label: "Electrical connections secured" },
  { id: "low_voltage_verified", label: "Low-voltage wiring verified" },
  { id: "drain_pan_installed", label: "Drain pan installed where required" },
  { id: "primary_drain_connected", label: "Primary drain connected" },
  { id: "secondary_drain_verified", label: "Secondary drain / overflow protection verified" },
  { id: "float_switch_tested", label: "Float switch tested" },
  { id: "gas_connections_checked", label: "Gas connections checked, if applicable" },
  { id: "venting_verified", label: "Venting verified, if applicable" },
];

export const DRAIN_TEST_CHECKLIST: ChecklistItemDef[] = [
  { id: "primary_drain_correct", label: "Primary drain installed correctly" },
  { id: "slope_verified", label: "Proper slope verified" },
  { id: "drain_trap_installed", label: "Drain trap installed if required by equipment/application" },
  { id: "vent_installed", label: "Vent installed if applicable" },
  { id: "drain_flushed_tested", label: "Drain flushed/tested" },
  { id: "water_flows_properly", label: "Water flows properly" },
  { id: "drain_pan_dry", label: "Drain pan dry after test" },
  { id: "secondary_drain_verified_2", label: "Secondary drain verified" },
  { id: "float_switch_tested_2", label: "Float switch tested" },
  { id: "condensate_pump_tested", label: "Condensate pump tested, if applicable" },
  { id: "visible_leaks", label: "Visible leaks" },
];

export const THERMOSTAT_CONTROLS_CHECKLIST: ChecklistItemDef[] = [
  { id: "thermostat_powered", label: "Thermostat powered" },
  { id: "cooling_call_tested", label: "Cooling call tested" },
  { id: "heating_call_tested", label: "Heating call tested" },
  { id: "fan_mode_tested", label: "Fan mode tested" },
  { id: "heat_pump_config_verified", label: "Heat Pump configuration verified" },
  { id: "staging_verified", label: "Staging verified" },
  { id: "aux_emergency_heat_verified", label: "Auxiliary/Emergency Heat verified" },
  { id: "setpoints_verified", label: "Setpoints verified" },
  { id: "wifi_connected", label: "Wi-Fi connected" },
  { id: "customer_app_configured", label: "Customer app configured, if applicable" },
  { id: "customer_instructed", label: "Customer instructed on thermostat operation" },
];

export const CUSTOMER_HANDOVER_CHECKLIST: ChecklistItemDef[] = [
  { id: "system_operation_explained", label: "System operation explained" },
  { id: "thermostat_operation_explained", label: "Thermostat operation explained" },
  { id: "filter_location_explained", label: "Filter location explained" },
  { id: "filter_replacement_recommended", label: "Filter replacement recommendation explained" },
  { id: "maintenance_requirements_explained", label: "Maintenance requirements explained" },
  { id: "warranty_info_provided", label: "Warranty information provided" },
  { id: "manufacturer_registration", label: "Manufacturer registration completed / pending / N/A" },
  { id: "customer_received_report", label: "Customer received startup report" },
];

// ── Section 6 — Electrical readings (Rated | Actual) ─────────────────────────

export type ElectricalField = { id: string; label: string; unit?: string };

export const ELECTRICAL_FIELDS_OUTDOOR: ElectricalField[] = [
  { id: "ratedVoltage", label: "Rated Voltage", unit: "V" },
  { id: "actualVoltageL1L2", label: "Actual Voltage L1-L2", unit: "V" },
  { id: "compressorRatedAmps", label: "Compressor Rated Amps / RLA", unit: "A" },
  { id: "compressorActualAmps", label: "Compressor Actual Amps", unit: "A" },
  { id: "fanMotorRatedAmps", label: "Fan Motor Rated Amps", unit: "A" },
  { id: "fanMotorActualAmps", label: "Fan Motor Actual Amps", unit: "A" },
  { id: "breakerSize", label: "Breaker Size", unit: "A" },
  { id: "mca", label: "MCA", unit: "A" },
  { id: "mocp", label: "MOCP", unit: "A" },
  { id: "groundVerified", label: "Ground Verified" },
  { id: "disconnectVerified", label: "Disconnect Verified" },
];

export const ELECTRICAL_FIELDS_INDOOR: ElectricalField[] = [
  { id: "ratedVoltage", label: "Rated Voltage", unit: "V" },
  { id: "actualVoltage", label: "Actual Voltage", unit: "V" },
  { id: "blowerRatedAmps", label: "Blower Rated Amps", unit: "A" },
  { id: "blowerActualAmps", label: "Blower Actual Amps", unit: "A" },
  { id: "heatStripAmps", label: "Heat Strip Amps, if applicable", unit: "A" },
  { id: "breakerSize", label: "Breaker Size", unit: "A" },
  { id: "transformerOutput", label: "Transformer Output / Control Voltage, if tested", unit: "V" },
];

// ── Section 4 — Refrigerant Circuit / Commissioning ──────────────────────────

export type MeasurementField = { id: string; label: string; type: "text" | "select" | "number" | "yesno"; unit?: string; options?: string[] };

export const REFRIGERANT_CIRCUIT_FIELDS: MeasurementField[] = [
  { id: "refrigerantType", label: "Refrigerant Type", type: "select", options: ["R-410A", "R-32", "R-454B", "Other"] },
  { id: "factoryCharge", label: "Factory Charge", type: "text" },
  { id: "additionalRefrigerantAdded", label: "Additional Refrigerant Added", type: "text", unit: "lb/oz" },
  { id: "lineSetLength", label: "Line Set Length", type: "text", unit: "ft" },
  { id: "liquidLineSize", label: "Liquid Line Size", type: "text" },
  { id: "suctionLineSize", label: "Suction Line Size", type: "text" },
  { id: "outdoorAmbientTemp", label: "Outdoor Ambient Temperature", type: "number", unit: "°F" },
  { id: "indoorReturnTemp", label: "Indoor Return Temperature", type: "number", unit: "°F" },
  { id: "suctionPressure", label: "Suction Pressure", type: "number", unit: "PSI" },
  { id: "liquidPressure", label: "Liquid/High-Side Pressure", type: "number", unit: "PSI" },
  { id: "suctionLineTemp", label: "Suction Line Temperature", type: "number", unit: "°F" },
  { id: "liquidLineTemp", label: "Liquid Line Temperature", type: "number", unit: "°F" },
  { id: "superheat", label: "Superheat", type: "number", unit: "°F" },
  { id: "subcooling", label: "Subcooling", type: "number", unit: "°F" },
  { id: "manufacturerTarget", label: "Manufacturer Target Superheat/Subcooling", type: "text" },
  { id: "finalChargeVerified", label: "Final Charge Verified per Manufacturer Procedure", type: "select", options: ["Yes", "No", "N/A"] },
  { id: "leakTestPerformed", label: "Leak Test Performed", type: "yesno" },
  { id: "leakTestResult", label: "Leak Test Result", type: "select", options: ["PASS", "FAIL"] },
  { id: "leakTestMethod", label: "Method Used", type: "select", options: ["Nitrogen", "Electronic Leak Detector", "Bubble Test", "Other"] },
];

// ── Section 5 — Vacuum / Evacuation (required only if circuit was opened) ───

export const VACUUM_EVACUATION_FIELDS: MeasurementField[] = [
  { id: "nitrogenPressureTestPerformed", label: "Nitrogen Pressure Test Performed", type: "yesno" },
  { id: "nitrogenTestPressure", label: "Test Pressure", type: "number", unit: "PSIG" },
  { id: "nitrogenTestDuration", label: "Test Duration", type: "text" },
  { id: "nitrogenTestResult", label: "Pressure Test Result", type: "select", options: ["PASS", "FAIL"] },
  { id: "vacuumPerformed", label: "Vacuum Performed", type: "yesno" },
  { id: "lowestVacuumMicrons", label: "Lowest Vacuum Achieved", type: "number", unit: "microns" },
  { id: "vacuumDecayTestPerformed", label: "Vacuum Decay / Standing Test Performed", type: "yesno" },
  { id: "vacuumStartingMicrons", label: "Starting Micron Reading", type: "number" },
  { id: "vacuumEndingMicrons", label: "Ending Micron Reading", type: "number" },
  { id: "vacuumTestDuration", label: "Test Duration", type: "text", unit: "minutes" },
  { id: "vacuumTestResult", label: "Result", type: "select", options: ["PASS", "FAIL"] },
];

// ── Section 7 — Airflow & Temperature Performance ────────────────────────────

export const AIRFLOW_FIELDS: MeasurementField[] = [
  { id: "returnAirTemp", label: "Return Air Temperature", type: "number", unit: "°F" },
  { id: "supplyAirTemp", label: "Supply Air Temperature", type: "number", unit: "°F" },
  { id: "returnStaticPressure", label: "Return Static Pressure", type: "text" },
  { id: "supplyStaticPressure", label: "Supply Static Pressure", type: "text" },
  { id: "totalExternalStaticPressure", label: "Total External Static Pressure (TESP)", type: "text" },
  { id: "manufacturerMaxStaticPressure", label: "Manufacturer Maximum Rated Static Pressure", type: "text" },
  { id: "blowerSpeedSetting", label: "Blower Speed / Airflow Setting", type: "text" },
  { id: "estimatedCfm", label: "Estimated/Configured CFM", type: "text" },
  { id: "filterSize", label: "Filter Size", type: "text" },
  { id: "filterType", label: "Filter Type", type: "text" },
  { id: "allSupplyRegistersChecked", label: "All Supply Registers Checked", type: "yesno" },
  { id: "returnAirflowVerified", label: "Return Airflow Verified", type: "yesno" },
  { id: "abnormalNoiseVibration", label: "Abnormal Noise/Vibration", type: "yesno" },
];

// ── Section 9 — Heating Startup ──────────────────────────────────────────────

export const GAS_FURNACE_FIELDS: MeasurementField[] = [
  { id: "gasType", label: "Gas Type", type: "text" },
  { id: "inletGasPressure", label: "Inlet Gas Pressure", type: "text" },
  { id: "manifoldPressure", label: "Manifold Pressure", type: "text" },
  { id: "ignitionSequenceVerified", label: "Ignition Sequence Verified", type: "yesno" },
  { id: "ignitorOperation", label: "Ignitor Operation", type: "select", options: ["PASS", "FAIL"] },
  { id: "burnerOperation", label: "Burner Operation", type: "select", options: ["PASS", "FAIL"] },
  { id: "flameSensorOperation", label: "Flame Sensor Operation", type: "select", options: ["PASS", "FAIL"] },
  { id: "inducerOperation", label: "Inducer Operation", type: "select", options: ["PASS", "FAIL"] },
  { id: "blowerOperation", label: "Blower Operation", type: "select", options: ["PASS", "FAIL"] },
  { id: "ventingVerified", label: "Venting Verified", type: "yesno" },
  { id: "temperatureRise", label: "Temperature Rise", type: "number", unit: "°F" },
  { id: "manufacturerTempRiseRange", label: "Manufacturer Temperature Rise Range", type: "text" },
  { id: "limitSafetyChecked", label: "Limit/Safety Operation Checked", type: "yesno" },
  { id: "coMeasurement", label: "CO Measurement (if performed)", type: "text" },
];

export const HEAT_PUMP_HEATING_FIELDS: MeasurementField[] = [
  { id: "heatingModeTested", label: "Heating Mode Tested", type: "yesno" },
  { id: "reversingValveOperation", label: "Reversing Valve Operation", type: "select", options: ["PASS", "FAIL"] },
  { id: "auxHeatOperation", label: "Auxiliary Heat Operation", type: "select", options: ["PASS", "FAIL", "N/A"] },
  { id: "emergencyHeatOperation", label: "Emergency Heat Operation", type: "select", options: ["PASS", "FAIL", "N/A"] },
  { id: "defrostChecked", label: "Defrost Controls/Operation Checked", type: "yesno" },
  { id: "supplyReturnTemps", label: "Supply/Return Temperatures", type: "text" },
  { id: "outdoorIndoorMeasurements", label: "Outdoor/Indoor Measurements", type: "text" },
];

// ── System type helpers ──────────────────────────────────────────────────────

export const SYSTEM_TYPES = [
  "Split System", "Package Unit", "Heat Pump", "Gas Furnace + AC",
  "Air Handler + Heat Pump", "Mini-Split", "Other",
];

export const INSTALLATION_TYPES = ["New Installation", "Full Replacement", "Partial Replacement"];

export function isHeatPumpSystem(systemType: string | null | undefined): boolean {
  return !!systemType && systemType.toLowerCase().includes("heat pump");
}

export function hasGasFurnace(systemType: string | null | undefined): boolean {
  return !!systemType && systemType.toLowerCase().includes("furnace");
}

// ── Section 11 — Final Test ───────────────────────────────────────────────────

export type FinalTestKey =
  | "cooling" | "heating" | "indoorBlower" | "outdoorFan" | "compressor"
  | "drainage" | "thermostat" | "safetyControls" | "electrical" | "refrigerantCircuit";

export const FINAL_TEST_ITEMS: { key: FinalTestKey; label: string; options: string[] }[] = [
  { key: "cooling", label: "Cooling", options: ["PASS", "FAIL", "N/A"] },
  { key: "heating", label: "Heating", options: ["PASS", "FAIL", "N/A"] },
  { key: "indoorBlower", label: "Indoor Blower", options: ["PASS", "FAIL"] },
  { key: "outdoorFan", label: "Outdoor Fan", options: ["PASS", "FAIL", "N/A"] },
  { key: "compressor", label: "Compressor", options: ["PASS", "FAIL", "N/A"] },
  { key: "drainage", label: "Drainage", options: ["PASS", "FAIL", "N/A"] },
  { key: "thermostat", label: "Thermostat", options: ["PASS", "FAIL"] },
  { key: "safetyControls", label: "Safety Controls", options: ["PASS", "FAIL", "N/A"] },
  { key: "electrical", label: "Electrical", options: ["PASS", "FAIL"] },
  { key: "refrigerantCircuit", label: "Refrigerant Circuit", options: ["PASS", "FAIL", "N/A"] },
];

export const FINAL_STARTUP_RESULTS = [
  { value: "PASSED", label: "✅ PASSED — System Operating Normally", color: "#16a34a" },
  { value: "PASSED_WITH_NOTES", label: "⚠️ PASSED WITH CORRECTIONS/NOTES", color: "#ca8a04" },
  { value: "FAILED", label: "❌ FAILED — Corrective Work Required", color: "#dc2626" },
  { value: "DO_NOT_OPERATE", label: "⛔ DO NOT OPERATE", color: "#7f1d1d" },
];

// ── Photo categories ──────────────────────────────────────────────────────────

export const STARTUP_PHOTO_CATEGORIES = {
  OUTDOOR_UNIT: "startup-outdoor-unit",
  OUTDOOR_NAMEPLATE: "startup-outdoor-nameplate",
  INDOOR_UNIT: "startup-indoor-unit",
  INDOOR_NAMEPLATE: "startup-indoor-nameplate",
  ELECTRICAL: "startup-electrical",
  REFRIGERANT_LINES: "startup-refrigerant-lines",
  DRAIN: "startup-drain",
  SUPPLY_RETURN: "startup-supply-return",
  THERMOSTAT: "startup-thermostat",
  FINAL: "startup-final",
} as const;

export const REQUIRED_STARTUP_PHOTO_LABELS: { category: string; label: string }[] = [
  { category: STARTUP_PHOTO_CATEGORIES.OUTDOOR_UNIT, label: "Outdoor Unit Installed" },
  { category: STARTUP_PHOTO_CATEGORIES.OUTDOOR_NAMEPLATE, label: "Outdoor Nameplate" },
  { category: STARTUP_PHOTO_CATEGORIES.INDOOR_UNIT, label: "Indoor Unit Installed" },
  { category: STARTUP_PHOTO_CATEGORIES.INDOOR_NAMEPLATE, label: "Indoor Nameplate" },
  { category: STARTUP_PHOTO_CATEGORIES.ELECTRICAL, label: "Electrical/Disconnect" },
  { category: STARTUP_PHOTO_CATEGORIES.REFRIGERANT_LINES, label: "Refrigerant Line Connections" },
  { category: STARTUP_PHOTO_CATEGORIES.DRAIN, label: "Drain Installation" },
  { category: STARTUP_PHOTO_CATEGORIES.SUPPLY_RETURN, label: "Supply/Return/Plenum" },
  { category: STARTUP_PHOTO_CATEGORIES.THERMOSTAT, label: "Thermostat" },
  { category: STARTUP_PHOTO_CATEGORIES.FINAL, label: "Final Installation/Work Area" },
];

// ── Quality gate ──────────────────────────────────────────────────────────────

export type SystemStartupLike = {
  systemType?: string | null;
  installationType?: string | null;
  equipment?: EquipmentEntry[];
  finalTestResults?: Partial<Record<FinalTestKey, string>>;
  finalStartupResult?: string | null;
  failExplanation?: string | null;
  refrigerantCircuit?: { circuitOpened?: boolean } & Record<string, unknown>;
  vacuumEvacuation?: Record<string, unknown>;
};

export function getMissingStartupFields(data: SystemStartupLike, photoCategories: Set<string>): string[] {
  const missing: string[] = [];

  if (!data.systemType) missing.push("System Type");
  if (!data.installationType) missing.push("New Installation / Full Replacement / Partial Replacement");

  const equipment = data.equipment ?? [];
  if (!equipment.some((e) => e.equipmentType === "OUTDOOR")) missing.push("Outdoor Unit equipment info");
  if (!equipment.some((e) => e.equipmentType === "INDOOR")) missing.push("Indoor Unit equipment info");

  for (const { category, label } of REQUIRED_STARTUP_PHOTO_LABELS) {
    if (!photoCategories.has(category)) missing.push(`Photo — ${label}`);
  }

  if (data.refrigerantCircuit?.circuitOpened) {
    const vac = data.vacuumEvacuation ?? {};
    if (!vac.vacuumPerformed) missing.push("Vacuum performed (refrigerant circuit was opened)");
    if (!vac.lowestVacuumMicrons) missing.push("Lowest vacuum achieved (microns)");
  }

  const results = data.finalTestResults ?? {};
  for (const item of FINAL_TEST_ITEMS) {
    if (!results[item.key]) missing.push(`Final Test — ${item.label}`);
  }

  if (!data.finalStartupResult) missing.push("Final Startup Result");
  if ((data.finalStartupResult === "FAILED" || data.finalStartupResult === "DO_NOT_OPERATE") && !data.failExplanation?.trim()) {
    missing.push("Explanation required for FAILED/DO NOT OPERATE result");
  }

  return missing;
}
