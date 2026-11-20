import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { loadSession, canAccess, analyze, saveEquipmentFromSession, EQUIPMENT_SPEC_SELECT } from "@/lib/hvac/server";
import { COMPLAINTS, MODES, EQUIPMENT_CATEGORIES, FIELD_BY_KEY, SAFETY_CHECKS } from "@/lib/hvac/catalog";
import { REFRIGERANT_KEYS } from "@/lib/hvac/refrigerants";
import { CANONICAL_UNIT } from "@/lib/hvac/units";
import crypto from "crypto";

export const dynamic = "force-dynamic";

async function guard(req: NextRequest, id: string) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return { error: auth };
  const session = await loadSession(id);
  if (!session) return { error: NextResponse.json({ error: "Diagnostic not found." }, { status: 404 }) };
  if (!canAccess(session, auth)) return { error: NextResponse.json({ error: "Not your diagnostic." }, { status: 403 }) };
  return { auth, session };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(req, id);
  if ("error" in g) return g.error;
  const { session } = g;
  const customerId = session.customerId ?? session.appointment?.customerId ?? null;
  const equipment = customerId
    ? await db.equipment.findMany({ where: { customerId }, orderBy: { updatedAt: "desc" }, select: EQUIPMENT_SPEC_SELECT })
    : [];
  const results = session.results ?? (await analyze(session));
  return NextResponse.json({ session: { ...session, results }, equipment });
}

const n = z.number().finite().nullable().optional();
const s = (max = 200) => z.string().trim().max(max).nullable().optional();
const specsSchema = z.object({
  targetSuperheat: n, targetSubcooling: n, chargeTolerance: n, tempRiseMin: n, tempRiseMax: n, maxTesp: n, ratedCfm: n,
  manifoldMin: n, manifoldMax: n, inletMin: n, inletMax: n,
}).partial();
const equipmentSchema = z.object({
  category: z.enum(Object.keys(EQUIPMENT_CATEGORIES) as [string, ...string[]]).nullable().optional(),
  manufacturer: s(80), modelNumber: s(80), indoorModel: s(80), serialNumber: s(80), age: s(40), location: s(80),
  capacityTons: n, refrigerant: z.enum(REFRIGERANT_KEYS as [string, ...string[]]).nullable().optional(),
  meteringDevice: s(20), compressorType: s(20), compressorCount: z.number().int().min(0).max(20).nullable().optional(),
  circuits: z.number().int().min(1).max(8).nullable().optional(), stages: s(20), heatingType: s(20), ratedVoltage: s(20),
  phase: z.union([z.literal(1), z.literal(3)]).nullable().optional(),
  minVoltage: n, maxVoltage: n, rla: n, lra: n, mca: n, mocp: n,
  specs: specsSchema.nullable().optional(),
}).partial();

const patchSchema = z.object({
  step: z.number().int().min(1).max(12).optional(),
  complaint: z.enum(Object.keys(COMPLAINTS) as [string, ...string[]]).nullable().optional(),
  complaintOther: s(500),
  mode: z.enum(Object.keys(MODES) as [string, ...string[]]).nullable().optional(),
  stage: s(40),
  circuits: z.number().int().min(1).max(8).optional(),
  notes: s(5000),
  equipmentId: z.string().nullable().optional(),
  equipment: equipmentSchema.optional(),
  saveEquipment: z.boolean().optional(),
  safety: z.record(z.string(), z.boolean()).optional(),
  measurements: z.array(z.object({
    circuit: z.number().int().min(1).max(8).default(1),
    key: z.string(),
    value: z.number().finite().nullable().optional(),
    text: z.string().max(1000).nullable().optional(),
    enteredValue: z.number().finite().nullable().optional(),
    enteredUnit: z.string().max(20).nullable().optional(),
    location: z.string().max(120).nullable().optional(),
    instrument: z.string().max(120).nullable().optional(),
  })).max(200).optional(),
  status: z.enum(["DRAFT", "ANALYZED"]).optional(),
  /** technician decision per hypothesis id; null clears it */
  decisions: z.record(z.string().max(60), z.object({ decision: z.enum(["CONFIRMED", "REJECTED"]), note: z.string().max(1000).nullable().optional() }).nullable()).optional(),
  findings: z.object({
    verifiedFindings: s(4000), repairsPerformed: s(4000), recommendations: s(4000), partsUsed: s(2000),
    statusOnLeaving: z.enum(["OPERATING_NORMALLY", "OPERATING_TEMPORARILY", "NOT_OPERATIONAL", "SHUT_DOWN_FOR_SAFETY", "DIAGNOSTIC_ONLY"]).nullable().optional(),
    customerName: s(120), customerAcknowledged: z.boolean().optional(),
  }).partial().optional(),
  complete: z.literal(true).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(req, id);
  if ("error" in g) return g.error;
  const { auth, session } = g;
  if (session.status === "COMPLETED") return NextResponse.json({ error: "This diagnostic is completed and locked." }, { status: 409 });
  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });
  const p = parsed.data;

  const data: Prisma.HvacDiagnosticSessionUpdateInput = {};
  if (p.step !== undefined) data.step = Math.max(session.step, p.step);
  if (p.complaint !== undefined) data.complaint = p.complaint;
  if (p.complaintOther !== undefined) data.complaintOther = p.complaintOther;
  if (p.mode !== undefined) data.mode = p.mode;
  if (p.stage !== undefined) data.stage = p.stage;
  if (p.circuits !== undefined) data.circuits = p.circuits;
  if (p.notes !== undefined) data.notes = p.notes;
  if (p.status) data.status = p.status;
  if (p.safety) {
    const allowed = new Set<string>(SAFETY_CHECKS.map((c) => c.key));
    data.safety = Object.fromEntries(Object.entries({ ...(session.safety as object), ...p.safety }).filter(([k]) => allowed.has(k)));
  }
  if (p.equipmentId !== undefined) {
    if (p.equipmentId) {
      const customerId = session.customerId ?? session.appointment?.customerId;
      const eq = await db.equipment.findFirst({ where: { id: p.equipmentId, customerId: customerId ?? "__none__" }, select: EQUIPMENT_SPEC_SELECT });
      if (!eq) return NextResponse.json({ error: "Equipment not found for this customer." }, { status: 400 });
      data.equipmentRef = { connect: { id: eq.id } };
      // Start from the stored (verified) nameplate data.
      const { id: _i, type: _t, makeModel: _m, specsVerifiedAt: _v, ...spec } = eq;
      void _i; void _t; void _m; void _v;
      data.equipment = { ...spec, ...(p.equipment ?? {}) } as Prisma.InputJsonValue;
      if (eq.circuits && p.circuits === undefined) data.circuits = eq.circuits;
    } else {
      data.equipmentRef = { disconnect: true };
    }
  }
  if (p.equipment && p.equipmentId === undefined) {
    const prev = (session.equipment ?? {}) as Record<string, unknown>;
    const next = { ...prev, ...p.equipment, specs: p.equipment.specs !== undefined ? { ...((prev.specs as object) ?? {}), ...(p.equipment.specs ?? {}) } : prev.specs };
    data.equipment = next as Prisma.InputJsonValue;
    if (p.equipment.circuits && p.circuits === undefined) data.circuits = p.equipment.circuits;
  }
  if (!session.customerId && session.appointment?.customerId) data.customerId = session.appointment.customerId;
  if (p.decisions) {
    const cur = { ...((session.decisions ?? {}) as Record<string, unknown>) };
    for (const [hid, d] of Object.entries(p.decisions)) {
      if (d === null) delete cur[hid];
      else cur[hid] = { ...d, at: new Date().toISOString(), by: auth.name ?? auth.id };
    }
    data.decisions = cur as Prisma.InputJsonValue;
  }
  if (p.findings) data.findings = { ...((session.findings ?? {}) as object), ...p.findings } as Prisma.InputJsonValue;

  await db.hvacDiagnosticSession.update({ where: { id }, data });

  for (const m of p.measurements ?? []) {
    const f = FIELD_BY_KEY[m.key];
    if (!f) continue;
    const circuit = f.perCircuit ? m.circuit : 1;
    const empty = (m.value === null || m.value === undefined) && !(m.text && m.text.trim());
    const where = { sessionId_circuit_key: { sessionId: id, circuit, key: m.key } };
    if (empty) { await db.hvacMeasurement.deleteMany({ where: { sessionId: id, circuit, key: m.key } }); continue; }
    const row = {
      value: f.input === "number" ? m.value ?? null : null,
      text: f.input === "number" ? null : (m.text ?? null),
      unit: f.input === "number" ? (f.kind === "plain" ? f.unit ?? null : CANONICAL_UNIT[f.kind]) : null,
      enteredValue: m.enteredValue ?? null, enteredUnit: m.enteredUnit ?? null,
      location: m.location ?? null, instrument: m.instrument ?? null,
      mode: (p.mode ?? session.mode) ?? null, technicianId: auth.id, measuredAt: new Date(),
    };
    await db.hvacMeasurement.upsert({ where, create: { sessionId: id, circuit, key: m.key, ...row }, update: row });
  }

  let fresh = (await loadSession(id))!;
  if (p.saveEquipment) {
    await saveEquipmentFromSession(fresh);
    fresh = (await loadSession(id))!;
  }
  const results = await analyze(fresh);

  if (p.complete) {
    const f = (fresh.findings ?? {}) as { statusOnLeaving?: string | null };
    if (!f.statusOnLeaving) return NextResponse.json({ error: "Choose the system status when leaving before completing." }, { status: 400 });
    if (results.alerts.some((a) => a.severity === "CRITICAL") && !["SHUT_DOWN_FOR_SAFETY", "NOT_OPERATIONAL", "DIAGNOSTIC_ONLY"].includes(f.statusOnLeaving)) {
      return NextResponse.json({ error: "A critical safety condition is recorded: the system status must be 'Shut down for safety', 'Not operational' or 'Diagnostic only' — or clear the safety item if it was corrected and verified." }, { status: 400 });
    }
    const year = new Date().getFullYear();
    await db.hvacDiagnosticSession.update({
      where: { id },
      data: {
        status: "COMPLETED", completedAt: new Date(),
        reportNumber: fresh.reportNumber ?? `HD-${year}-${id.slice(-6).toUpperCase()}`,
        reportToken: fresh.reportToken ?? crypto.randomBytes(18).toString("base64url"),
      },
    });
    fresh = (await loadSession(id))!;
  }
  return NextResponse.json({ session: { ...fresh, results } });
}
