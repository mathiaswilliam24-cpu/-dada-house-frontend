/** Job types and categories (pure — safe for client components). */

export const JOB_TYPES = {
  MAINTENANCE: {
    label: "Maintenance", color: "#0891b2", minutes: 60, skill: "maintenance",
    categories: ["First Maintenance Visit", "Second Maintenance Visit", "Seasonal AC Tune-Up", "Seasonal Heating Tune-Up", "Preventive Maintenance", "Commercial Maintenance"],
  },
  SERVICE: {
    label: "Service / Diagnostic", color: "#1B3FA8", minutes: 90, skill: "diagnostic",
    categories: ["AC Not Cooling", "Heating Not Working", "No Airflow", "Water Leak", "Drain Line Clogged", "Electrical Issue", "Thermostat Problem", "System Not Starting", "Strange Noise / Smell", "Emergency Diagnostic", "Other Service Request"],
  },
  REPAIR: {
    label: "Repair", color: "#7c3aed", minutes: 120, skill: "repair",
    categories: ["Capacitor Replacement", "Contactor Replacement", "Blower Motor Replacement", "Condenser Fan Motor Replacement", "Compressor Replacement", "Evaporator Coil Replacement", "Refrigerant Leak Repair", "Drain Line Repair", "Control Board Replacement", "Other Repair"],
  },
  INSTALLATION: {
    label: "Installation", color: "#ea580c", minutes: 480, skill: "installation",
    categories: ["Complete HVAC System Installation", "Condenser Replacement", "Air Handler Replacement", "Furnace Installation", "Heat Pump Installation", "Mini-Split Installation", "Thermostat Installation", "Ductwork Installation"],
  },
  DUCT_CLEANING: {
    label: "Air Duct Cleaning", color: "#059669", minutes: 180, skill: "duct cleaning",
    categories: ["Air Duct Cleaning", "Dryer Vent Cleaning", "Duct Sanitizing", "Duct Inspection"],
  },
  REMODELING: {
    label: "Remodeling", color: "#be185d", minutes: 480, skill: "remodeling",
    categories: ["Kitchen", "Bathroom", "Flooring", "Painting", "General Remodeling"],
  },
  OTHER: {
    label: "Other", color: "#475569", minutes: 60, skill: "",
    categories: ["Plumbing", "Electrical", "Cleaning", "Pressure Washing", "Estimate Visit", "Other"],
  },
} as const;

export type JobType = keyof typeof JOB_TYPES;
export const JOB_TYPE_KEYS = Object.keys(JOB_TYPES) as JobType[];

export const TECH_ROLES = ["PRIMARY", "LEAD_INSTALLER", "HELPER", "SUPERVISOR"] as const;

/** Best-effort job type for older jobs that only have a free-text service name. */
export function inferJobType(service: string | null | undefined): JobType {
  const s = (service ?? "").toLowerCase();
  if (/mainten|tune/.test(s)) return "MAINTENANCE";
  if (/install|replace(ment)? system|new system/.test(s)) return "INSTALLATION";
  if (/duct|vent clean|dryer/.test(s)) return "DUCT_CLEANING";
  if (/remodel|kitchen|bath|floor|paint/.test(s)) return "REMODELING";
  if (/repair/.test(s)) return "REPAIR";
  if (/hvac|ac|air|heat|cool|furnace|diagnos|thermostat/.test(s)) return "SERVICE";
  return "OTHER";
}

