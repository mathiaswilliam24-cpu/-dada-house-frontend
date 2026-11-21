import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { runEngine, type EquipmentSpec, type EngineResult } from "./engine";
import { runRules, resolveFieldRules, type RulesResult, type Decision } from "./rules";
import { buildMatrix, type MatrixResult } from "./matrix";

import { activeFieldRules } from "./admin-data";

export type AnalysisResult = EngineResult & { rules: RulesResult; fieldRulesVersion: number; matrix?: MatrixResult };
import { categoryInfo } from "./catalog";

export const HVAC_ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export const EQUIPMENT_SPEC_SELECT = {
  id: true, type: true, makeModel: true, serialNumber: true, age: true, location: true,
  category: true, manufacturer: true, modelNumber: true, indoorModel: true, capacityTons: true, refrigerant: true,
  meteringDevice: true, compressorType: true, compressorCount: true, circuits: true, stages: true, heatingType: true,
  ratedVoltage: true, phase: true, minVoltage: true, maxVoltage: true, rla: true, lra: true, mca: true, mocp: true,
  specs: true, specsVerifiedAt: true,
} as const;

export async function loadSession(id: string) {
  return db.hvacDiagnosticSession.findUnique({
    where: { id },
    include: {
      measurements: { orderBy: [{ circuit: "asc" }, { key: "asc" }] },
      appointment: { select: { id: true, appointmentNumber: true, name: true, phone: true, address: true, city: true, service: true, description: true, customerId: true } },
    },
  });
}
export type LoadedSession = NonNullable<Awaited<ReturnType<typeof loadSession>>>;

export function canAccess(s: { technicianId: string }, auth: { id: string; role: string }) {
  return s.technicianId === auth.id || HVAC_ADMIN_ROLES.includes(auth.role);
}

/** Runs the deterministic engine on a stored session and persists results + safety events. */
export async function analyze(session: LoadedSession): Promise<AnalysisResult> {
  const measurements: Record<number, Record<string, { value: number | null; text: string | null }>> = {};
  for (const m of session.measurements) {
    (measurements[m.circuit] ??= {})[m.key] = { value: m.value, text: m.text };
  }
  const equipment = (session.equipment ?? {}) as EquipmentSpec;
  const safety = (session.safety ?? {}) as Record<string, boolean>;
  const engine = runEngine({ equipment, mode: session.mode, complaint: session.complaint, circuits: session.circuits, measurements, safety });
  const fr = await activeFieldRules();
  const rules = runRules({ engine, equipment, mode: session.mode, complaint: session.complaint, safety, measurements, decisions: (session.decisions ?? {}) as Record<string, Decision>, fieldRules: fr.values });
  const matrix = buildMatrix({ engine, equipment, mode: session.mode, circuits: session.circuits, measurements, fieldRules: resolveFieldRules(fr.values) });
  const result: AnalysisResult = { ...engine, rules, fieldRulesVersion: fr.version, matrix };
  await db.hvacDiagnosticSession.update({
    where: { id: session.id },
    data: { results: result as unknown as Prisma.InputJsonValue, engineVersion: engine.engineVersion, ptDataVersion: engine.ptDataVersion, rulesetVersion: rules.rulesetVersion },
  });
  // Audit trail of safety-critical findings (one row per code per session).
  const critical = result.alerts.filter((a) => a.severity === "CRITICAL");
  for (const a of critical) {
    await db.hvacSafetyEvent.upsert({
      where: { sessionId_code: { sessionId: session.id, code: a.code } },
      create: { sessionId: session.id, code: a.code, severity: a.severity, message: a.message, technicianId: session.technicianId },
      update: {},
    });
  }
  return result;
}

/** Saves the verified nameplate data to the customer's Equipment record (specs stay separate from measurements). */
export async function saveEquipmentFromSession(session: { id: string; customerId: string | null; equipmentId: string | null; technicianId: string; equipment: unknown }) {
  if (!session.customerId) return null;
  const e = (session.equipment ?? {}) as EquipmentSpec & { serialNumber?: string | null; age?: string | null; location?: string | null; indoorModel?: string | null; compressorCount?: number | null; stages?: string | null; heatingType?: string | null; ratedVoltage?: string | null };
  const data = {
    type: categoryInfo(e.category)?.label ?? "HVAC",
    makeModel: [e.manufacturer, e.modelNumber].filter(Boolean).join(" ") || null,
    serialNumber: e.serialNumber ?? null, age: e.age ?? null, location: e.location ?? null,
    category: e.category ?? null, manufacturer: e.manufacturer ?? null, modelNumber: e.modelNumber ?? null, indoorModel: e.indoorModel ?? null,
    capacityTons: e.capacityTons ?? null, refrigerant: e.refrigerant ?? null, meteringDevice: e.meteringDevice ?? null,
    compressorType: e.compressorType ?? null, compressorCount: e.compressorCount ?? null, circuits: e.circuits ?? null,
    stages: e.stages ?? null, heatingType: e.heatingType ?? null, ratedVoltage: e.ratedVoltage ?? null, phase: e.phase ?? null,
    minVoltage: e.minVoltage ?? null, maxVoltage: e.maxVoltage ?? null, rla: e.rla ?? null, lra: e.lra ?? null, mca: e.mca ?? null, mocp: e.mocp ?? null,
    specs: (e.specs ?? {}) as Prisma.InputJsonValue, specsVerifiedAt: new Date(),
  };
  if (session.equipmentId) {
    const eq = await db.equipment.update({ where: { id: session.equipmentId }, data });
    return eq.id;
  }
  const eq = await db.equipment.create({ data: { ...data, customerId: session.customerId, technicianId: session.technicianId } });
  await db.hvacDiagnosticSession.update({ where: { id: session.id }, data: { equipmentId: eq.id } });
  return eq.id;
}
