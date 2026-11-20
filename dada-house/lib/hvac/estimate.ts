import { db } from "@/lib/db";
import type { Hypothesis } from "./rules";

/**
 * Suggests DADA HOUSE price-book items for technician-confirmed faults. Prices always come from the
 * price book — an item without a price is flagged, never priced by the system. The technician picks
 * the items; the estimate is created as a draft (nothing is sent or charged).
 */
const FAULT_ITEMS: Record<string, { keywords: string[]; categories?: string[] }> = {
  LOW_CHARGE: { keywords: ["leak search", "leak", "with refrigerant repair", "drier", "evacuat"] },
  OVERCHARGE: { keywords: ["recover", "refrigerant"], categories: ["Refrigerant"] },
  METERING_RESTRICTION: { keywords: ["txv", "expansion", "piston", "drier"] },
  DRIER_RESTRICTION: { keywords: ["drier"] },
  LOW_INDOOR_AIRFLOW: { keywords: ["filter", "blower wheel", "evaporator coil", "coil clean"] },
  DIRTY_CONDENSER: { keywords: ["condenser coil", "coil clean", "comb condenser"] },
  DUCT_RESTRICTION: { keywords: ["duct", "return"], categories: ["Ductwork & Airflow"] },
  CAPACITOR: { keywords: ["capacitor"] },
  CONTACTOR: { keywords: ["contactor"] },
  CONTROL_SIGNAL: { keywords: ["transformer", "thermostat", "fuse", "control board"] },
  SUPPLY_POWER: { keywords: ["disconnect", "breaker", "whip", "wire"], categories: ["Electrical"] },
  COMPRESSOR_ELECTRICAL: { keywords: ["compressor", "hard start", "start kit", "start capacitor"] },
  COMPRESSOR_MECHANICAL: { keywords: ["compressor"] },
  OUTDOOR_FAN: { keywords: ["condenser fan motor", "fan motor", "fan blade", "capacitor"] },
  INDOOR_BLOWER: { keywords: ["blower motor", "ecm", "blower"] },
  REVERSING_VALVE: { keywords: ["reversing"] },
  DEFROST: { keywords: ["defrost"] },
  AUX_HEAT: { keywords: ["heat strip", "sequencer", "element", "heater"], categories: ["Electric Heat"] },
  GAS_IGNITION: { keywords: ["igniter", "ignitor", "flame sensor", "inducer", "pressure switch", "gas valve"] },
  COMBUSTION_VENTING: { keywords: ["vent", "flue", "heat exchanger", "inducer"] },
  CONDENSATE: { keywords: ["drain", "float", "condensate", "pan"], categories: ["Drainage"] },
};

export type Suggestion = { id: string; name: string; description: string | null; category: string; price: number; unit: string | null; hasPrice: boolean };

export async function suggestForHypotheses(hyps: Hypothesis[], refrigerant?: string | null) {
  const confirmed = hyps.filter((h) => h.status === "CONFIRMED");
  const out: { hypothesisId: string; fault: string; items: Suggestion[] }[] = [];
  for (const h of confirmed) {
    const base = h.id.split("#")[0];
    const map = FAULT_ITEMS[base];
    if (!map) { out.push({ hypothesisId: h.id, fault: h.fault, items: [] }); continue; }
    const rows = await db.priceBookItem.findMany({
      where: { OR: [
        ...map.keywords.map((k) => ({ name: { contains: k, mode: "insensitive" as const } })),
        ...(map.categories ?? []).map((c) => ({ category: c })),
      ] },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: 60,
    });
    // Refrigerant-specific lines: keep only the recorded refrigerant's ones.
    const ref = (refrigerant ?? "").toUpperCase();
    const filtered = rows.filter((r) => {
      const m = r.name.toUpperCase().match(/\bR-?\d{2,3}[A-Z]?\b/);
      return !m || !ref || m[0].replace("-", "") === ref.replace("-", "");
    });
    out.push({
      hypothesisId: h.id, fault: h.fault,
      items: filtered.slice(0, 25).map((r) => ({ id: r.id, name: r.name, description: r.description, category: r.category, price: r.price, unit: r.unit, hasPrice: r.price > 0 })),
    });
  }
  return out;
}
