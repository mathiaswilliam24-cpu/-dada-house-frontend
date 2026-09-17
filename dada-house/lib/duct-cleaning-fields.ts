// Field catalog for the two Air Duct Cleaning forms — Air Vent & Register
// Cleaning (light) and Whole-System Air Duct Cleaning (full). Plain constant
// lists + types, same shape as lib/system-startup-fields.ts.

export type VentType = "SUPPLY" | "RETURN";
export type SimpleCondition = "PASS" | "ISSUE";

export type VentEntry = {
  id: string;
  roomLocation: string;
  ventType: VentType | "";
  conditionBefore: "CLEAN" | "LIGHT" | "MODERATE" | "HEAVY" | "";
  coverRemoved: boolean;
  coverCleaned: boolean;
  openingCleaned: boolean;
  reinstalled: boolean;
  conditionAfter: SimpleCondition | "";
  notes: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
};

export function emptyVentEntry(): VentEntry {
  return {
    id: Math.random().toString(36).slice(2),
    roomLocation: "", ventType: "", conditionBefore: "",
    coverRemoved: false, coverCleaned: false, openingCleaned: false, reinstalled: false,
    conditionAfter: "", notes: "", beforePhotoUrl: "", afterPhotoUrl: "",
  };
}

export type RegisterEntry = {
  id: string;
  location: string;
  type: VentType | "";
  beforeCondition: string;
  cleaned: boolean;
  afterCondition: SimpleCondition | "";
  notes: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
};

export function emptyRegisterEntry(): RegisterEntry {
  return {
    id: Math.random().toString(36).slice(2),
    location: "", type: "", beforeCondition: "", cleaned: false,
    afterCondition: "", notes: "", beforePhotoUrl: "", afterPhotoUrl: "",
  };
}

// ── Form 1 — Air Vent & Register Cleaning ──────────────────────────────────

export const VENT_OVERALL_CONDITIONS = [
  "Light Dust", "Moderate Dust", "Heavy Dust/Debris", "Pet Hair", "Grease/Residue",
  "Odor", "Rust/Corrosion", "Damaged Register", "Visible Discoloration",
];

export const VENT_WORK_PERFORMED = [
  "Register/grille covers removed", "Covers vacuumed", "Covers cleaned/wiped",
  "Accessible openings vacuumed", "Supply registers cleaned", "Return grilles cleaned",
  "Registers properly reinstalled", "Filter inspected", "Filter replaced if authorized",
  "Work areas cleaned", "Final visual inspection completed",
];

export const VENT_ADDITIONAL_FINDINGS = [
  "No additional issue found", "Excessive debris inside ductwork", "Restricted airflow",
  "Damaged ductwork", "Disconnected duct", "Air leakage", "Moisture/water",
  "Visible discoloration / suspected microbial growth", "Pest evidence",
  "Dirty blower/air handler", "Dirty evaporator coil",
];

export const VENT_COMPLETION_STATUSES = [
  { value: "COMPLETED", label: "Completed" },
  { value: "COMPLETED_ADDITIONAL_RECOMMENDED", label: "Completed — Additional Service Recommended" },
  { value: "INCOMPLETE", label: "Incomplete — Follow-up Required" },
];

export function getMissingVentCleaningFields(data: {
  vents: VentEntry[];
  beforePhotos: string[];
  completionStatus: string | null;
}): string[] {
  const missing: string[] = [];
  if (data.vents.length === 0) missing.push("At least one vent must be documented");
  if (data.beforePhotos.length === 0) missing.push("At least one before photo is required");
  if (!data.completionStatus) missing.push("Completion status");
  return missing;
}

// ── Form 2 — Whole-System Air Duct Cleaning ────────────────────────────────

export const DUCT_MATERIALS = [
  { value: "SHEET_METAL", label: "Sheet Metal" },
  { value: "FLEX_DUCT", label: "Flex Duct" },
  { value: "FIBERGLASS_DUCT_BOARD", label: "Fiberglass Duct Board" },
  { value: "MIXED", label: "Mixed" },
  { value: "UNKNOWN", label: "Unknown" },
];

export const DUCT_PRE_CLEANING_INSPECTION = [
  "System operational before service", "Filter inspected", "Supply registers inspected",
  "Return registers inspected", "Accessible ductwork inspected", "Air handler/furnace inspected",
  "Blower compartment inspected where included/accessible",
  "Evaporator coil visually inspected where accessible", "Drainage condition observed",
  "Before photos completed",
];

export const DUCT_CONTAMINATION_OBSERVED = [
  "Light dust", "Moderate dust", "Heavy dust/debris", "Construction debris", "Pet hair",
  "Odor", "Moisture", "Pest evidence", "Visible discoloration", "Suspected microbial growth",
];

export const DUCT_SYSTEM_PROBLEMS = [
  "Damaged flex duct", "Crushed duct", "Disconnected duct", "Loose connection",
  "Air leakage", "Missing insulation", "Wet insulation", "Excessive debris",
  "Restricted airflow", "Damaged register",
];

export const DUCT_CLEANING_PROCEDURE = [
  "Supply registers removed/cleaned", "Return grilles removed/cleaned",
  "Supply ductwork cleaned", "Return ductwork cleaned", "Mechanical agitation performed",
  "Vacuum collection used", "Negative-pressure equipment used",
  "Accessible trunk lines cleaned", "Accessible branch ducts cleaned",
  "Return cavity/plenum cleaned where included", "Supply plenum cleaned where included",
  "Blower compartment cleaned where included", "Air handler/furnace cabinet cleaned where included",
  "Work area protected", "Registers reinstalled", "System filter replaced/installed if authorized",
];

export const DUCT_COMPONENTS: { key: string; label: string }[] = [
  { key: "SUPPLY_DUCTS", label: "Supply Ducts" },
  { key: "RETURN_DUCTS", label: "Return Ducts" },
  { key: "REGISTERS_GRILLES", label: "Registers/Grilles" },
  { key: "SUPPLY_PLENUM", label: "Supply Plenum" },
  { key: "RETURN_PLENUM", label: "Return Plenum" },
  { key: "BLOWER_COMPARTMENT", label: "Blower Compartment" },
  { key: "BLOWER_WHEEL", label: "Blower Wheel" },
  { key: "EVAPORATOR_COIL", label: "Evaporator Coil" },
  { key: "DRAIN_PAN", label: "Drain Pan" },
];

export type ComponentState = { inspected: boolean; cleaned: boolean; na: boolean };
export function emptyComponentCleaning(): Record<string, ComponentState> {
  const out: Record<string, ComponentState> = {};
  for (const c of DUCT_COMPONENTS) out[c.key] = { inspected: false, cleaned: false, na: false };
  return out;
}

export const DUCT_ISSUES_FOUND = [
  "Duct damage", "Air leak", "Disconnected duct", "Excessive contamination",
  "Moisture/water", "Suspected microbial growth/discoloration", "Pest contamination",
  "Dirty evaporator coil", "Dirty blower wheel", "Drainage problem",
];

export const DUCT_FINAL_INSPECTION = [
  "Authorized supply ducts completed", "Authorized return ducts completed",
  "Registers/grilles reinstalled", "Work areas cleaned", "Filter installed/verified",
  "System turned back on", "System operational after service", "No abnormal noise observed",
  "Final photos completed",
];

export const DUCT_SYSTEM_CONDITION_AFTER = [
  { value: "NORMAL", label: "Normal Operation" },
  { value: "ADDITIONAL_WORK_RECOMMENDED", label: "Operational — Additional Work Recommended" },
  { value: "SERVICE_REQUIRED", label: "Service Required" },
  { value: "NOT_OPERATED", label: "System Not Operated — Explain" },
];

export type DuctPhotoCategory = "RETURN_DUCT" | "SUPPLY_DUCT" | "REGISTERS" | "AIR_HANDLER";
export const DUCT_PHOTO_CATEGORIES: Record<DuctPhotoCategory, string> = {
  RETURN_DUCT: "Return Duct",
  SUPPLY_DUCT: "Representative Supply Duct",
  REGISTERS: "Registers",
  AIR_HANDLER: "Air Handler Area",
};

export function getMissingDuctCleaningFields(data: {
  registers: RegisterEntry[];
  beforePhotos: { category: string; url: string }[];
  afterPhotos: { category: string; url: string }[];
  systemConditionAfter: string | null;
  additionalIssueFound: boolean;
  issuePhotoUrl: string;
}): string[] {
  const missing: string[] = [];
  if (data.registers.length === 0) missing.push("At least one register must be documented");
  const beforeCats = new Set(data.beforePhotos.map((p) => p.category));
  const afterCats = new Set(data.afterPhotos.map((p) => p.category));
  for (const cat of Object.keys(DUCT_PHOTO_CATEGORIES)) {
    if (!beforeCats.has(cat)) missing.push(`Before photo — ${DUCT_PHOTO_CATEGORIES[cat as DuctPhotoCategory]}`);
    if (!afterCats.has(cat)) missing.push(`After photo — ${DUCT_PHOTO_CATEGORIES[cat as DuctPhotoCategory]}`);
  }
  if (!data.systemConditionAfter) missing.push("System condition after service");
  if (data.additionalIssueFound && !data.issuePhotoUrl) missing.push("Photo of the additional issue found");
  return missing;
}
