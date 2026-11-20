import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api-auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { activeFieldRules } from "@/lib/hvac/admin-data";
import { FAULT_CATALOG, type Decision } from "@/lib/hvac/rules";
import { categoryInfo, FIELD_BY_KEY } from "@/lib/hvac/catalog";
import {
  splitFor, equipmentKeyFor, inputsFromSession, isValidLabel, baseId, runEvaluation, CURRENT_VERSIONS,
  OTHER_FAULT, NO_FAULT, MIN_CALIBRATION_N, MIN_TEST_N, ACCURACY_TARGET, type CaseInputs, type EvalCase, type Split,
} from "@/lib/hvac/validation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const ROLES = ["ADMIN", "SUPER_ADMIN", "MANAGER"];

/** Validation dataset, evaluation runs and technician feedback for HVAC Diagnostic Pro. */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ...ROLES);
  if (auth instanceof NextResponse) return auth;

  const [cases, inSet, candidatesRaw, runs, feedback, reviews] = await Promise.all([
    db.hvacValidationCase.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 400, include: { session: { select: { reportNumber: true, technicianName: true } } } }),
    db.hvacValidationCase.findMany({ where: { sessionId: { not: null } }, select: { sessionId: true } }),
    db.hvacDiagnosticSession.findMany({
      where: { status: "COMPLETED" }, orderBy: { completedAt: "desc" }, take: 300,
      select: { id: true, reportNumber: true, completedAt: true, technicianName: true, equipment: true, equipmentId: true, decisions: true, feedback: { select: { actualFaults: true, engineTopCorrect: true } } },
    }),
    db.hvacEvaluationRun.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.hvacTechnicianFeedback.findMany({ orderBy: { updatedAt: "desc" }, take: 500, include: { session: { select: { reportNumber: true } } } }),
    db.hvacAssistantReview.groupBy({ by: ["helpful"], _count: { _all: true } }),
  ]);
  const used = new Set(inSet.map((c) => c.sessionId));
  const candidates = candidatesRaw.filter((s) => !used.has(s.id)).map((s) => {
    const eq = (s.equipment ?? {}) as { category?: string; manufacturer?: string; modelNumber?: string };
    const confirmed = Object.entries((s.decisions ?? {}) as Record<string, Decision>).filter(([, d]) => d?.decision === "CONFIRMED").map(([id]) => baseId(id));
    return {
      id: s.id, reportNumber: s.reportNumber, completedAt: s.completedAt, technician: s.technicianName,
      equipment: [eq.manufacturer, eq.modelNumber].filter(Boolean).join(" ") || categoryInfo(eq.category)?.label || "—",
      confirmed: [...new Set(confirmed)], feedbackFaults: s.feedback?.actualFaults ?? [], linkedEquipment: !!s.equipmentId,
    };
  }).filter((c) => c.confirmed.length || c.feedbackFaults.length).slice(0, 100);

  const v = CURRENT_VERSIONS();
  const fr = await activeFieldRules();
  const latest = runs[0] ?? null;
  const count = (k: string) => feedback.filter((f) => f.engineTopCorrect === k).length;
  const helpful = (k: string) => feedback.filter((f) => f.assistantHelpful === k).length;
  return NextResponse.json({
    me: auth.id, role: auth.role,
    thresholds: { minCalibration: MIN_CALIBRATION_N, minTest: MIN_TEST_N, target: ACCURACY_TARGET },
    faults: [...FAULT_CATALOG, { id: OTHER_FAULT, fault: "Other — outside the rule set", category: "OTHER", safetyCritical: false }, { id: NO_FAULT, fault: "No fault — system verified operating correctly", category: "OTHER", safetyCritical: false }],
    counts: {
      PENDING: cases.filter((c) => c.status === "PENDING").length,
      VERIFIED: cases.filter((c) => c.status === "VERIFIED").length,
      EXCLUDED: cases.filter((c) => c.status === "EXCLUDED").length,
      bySplit: Object.fromEntries((["TRAIN", "VALIDATION", "TEST"] as Split[]).map((s) => [s, cases.filter((c) => c.status === "VERIFIED" && c.split === s).length])),
      unlinkedEquipment: cases.filter((c) => c.equipmentKey.startsWith("session:")).length,
    },
    cases: cases.map((c) => ({
      id: c.id, source: c.source, status: c.status, split: c.split, category: categoryInfo(c.category)?.label ?? c.category, refrigerant: c.refrigerant, manufacturer: c.manufacturer,
      groundTruth: c.groundTruth, evidence: c.evidence, reportNumber: c.session?.reportNumber ?? null, serviceTechnician: c.session?.technicianName ?? null,
      submittedByName: c.submittedByName, verifiedByName: c.verifiedByName, verifiedAt: c.verifiedAt, excludedReason: c.excludedReason, createdAt: c.createdAt,
      canVerify: c.status !== "VERIFIED" && c.serviceTechId !== auth.id && (c.submittedById !== auth.id || auth.role === "SUPER_ADMIN"),
      blockedReason: c.serviceTechId === auth.id ? "You did this service call — another person must verify it." : c.submittedById === auth.id && auth.role !== "SUPER_ADMIN" ? "You submitted this case — another person must verify it." : null,
    })),
    candidates,
    latestRun: latest ? {
      id: latest.id, createdAt: latest.createdAt, createdByName: latest.createdByName, caseCount: latest.caseCount,
      engineVersion: latest.engineVersion, rulesetVersion: latest.rulesetVersion, ptDataVersion: latest.ptDataVersion, fieldRulesVersion: latest.fieldRulesVersion,
      current: latest.engineVersion === v.engineVersion && latest.rulesetVersion === v.rulesetVersion && latest.ptDataVersion === v.ptDataVersion && latest.fieldRulesVersion === fr.version,
      result: latest.result,
    } : null,
    runs: runs.map((r) => ({ id: r.id, createdAt: r.createdAt, caseCount: r.caseCount, rulesetVersion: r.rulesetVersion, fieldRulesVersion: r.fieldRulesVersion, testTop1: (r.result as { metrics?: { TEST?: { top1?: { rate: number | null; n: number } } } }).metrics?.TEST?.top1 ?? null })),
    versions: { ...v, fieldRulesVersion: fr.version },
    feedback: {
      total: feedback.length,
      engineTop: { YES: count("YES"), NO: count("NO"), NOT_SURE: count("NOT_SURE") },
      assistant: { YES: helpful("YES"), NO: helpful("NO"), NOT_USED: helpful("NOT_USED") },
      aiReviews: Object.fromEntries(reviews.map((r) => [String(r.helpful), r._count._all])),
      recent: feedback.filter((f) => f.comment || f.engineTopCorrect === "NO" || f.otherFault).slice(0, 40).map((f) => ({
        id: f.id, sessionId: f.sessionId, reportNumber: f.session.reportNumber, technician: f.technicianName, at: f.updatedAt,
        engineTopCorrect: f.engineTopCorrect, actualFaults: f.actualFaults, otherFault: f.otherFault, comment: f.comment,
      })),
    },
  });
}

const label = z.string().refine(isValidLabel, "Unknown fault label");
const importCase = z.object({
  equipmentKey: z.string().trim().min(2).max(120),
  equipment: z.record(z.string(), z.unknown()),
  mode: z.string().nullable(), complaint: z.string().nullable(),
  circuits: z.number().int().min(1).max(4).default(1),
  measurements: z.array(z.object({ key: z.string(), circuit: z.number().int().min(1).max(4).default(1), value: z.number().finite().nullable().optional(), text: z.string().max(200).nullable().optional() })).max(200),
  safety: z.record(z.string(), z.boolean()).default({}),
  groundTruth: z.array(label).min(1).max(5),
  evidence: z.string().trim().min(10).max(2000),
});
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("addSession"), sessionId: z.string() }),
  z.object({ action: z.literal("import"), cases: z.array(importCase).min(1).max(500) }),
  z.object({ action: z.literal("verify"), id: z.string(), groundTruth: z.array(label).min(1).max(5), evidence: z.string().trim().min(10, "Describe how the fault was verified (repair, test result, invoice…).").max(2000) }),
  z.object({ action: z.literal("exclude"), id: z.string(), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("evaluate") }),
]);

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ...ROLES);
  if (auth instanceof NextResponse) return auth;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const a = parsed.data;
  const who = { submittedById: auth.id, submittedByName: auth.name ?? null };

  if (a.action === "addSession") {
    const s = await db.hvacDiagnosticSession.findUnique({ where: { id: a.sessionId }, include: { measurements: true, feedback: true } });
    if (!s || s.status !== "COMPLETED") return NextResponse.json({ error: "Only completed diagnostics can be added." }, { status: 400 });
    if (await db.hvacValidationCase.findUnique({ where: { sessionId: s.id } })) return NextResponse.json({ error: "Already in the dataset." }, { status: 409 });
    const eq = (s.equipment ?? {}) as { category?: string; refrigerant?: string; manufacturer?: string };
    const confirmed = Object.entries((s.decisions ?? {}) as Record<string, Decision>).filter(([, d]) => d?.decision === "CONFIRMED").map(([id]) => baseId(id));
    const proposed = [...new Set([...confirmed, ...(s.feedback?.actualFaults ?? [])])].filter(isValidLabel);
    const key = equipmentKeyFor(s);
    const c = await db.hvacValidationCase.create({
      data: {
        source: "FIELD_SESSION", sessionId: s.id, equipmentKey: key, split: splitFor(key),
        category: eq.category ?? null, refrigerant: eq.refrigerant ?? null, manufacturer: eq.manufacturer ?? null,
        inputs: inputsFromSession(s) as unknown as Prisma.InputJsonValue, groundTruth: proposed, serviceTechId: s.technicianId, ...who,
      },
    });
    return NextResponse.json({ case: c });
  }

  if (a.action === "import") {
    const bad = a.cases.flatMap((c, i) => c.measurements.filter((m) => !FIELD_BY_KEY[m.key]).map((m) => `case ${i + 1}: unknown measurement "${m.key}"`));
    if (bad.length) return NextResponse.json({ error: bad.slice(0, 5).join("; ") }, { status: 400 });
    const rows = a.cases.map((c) => {
      const measurements: CaseInputs["measurements"] = {};
      for (const m of c.measurements) (measurements[m.circuit] ??= {})[m.key] = { value: m.value ?? null, text: m.text ?? null };
      const eq = c.equipment as { category?: string; refrigerant?: string; manufacturer?: string };
      const inputs: CaseInputs = { equipment: c.equipment, mode: c.mode, complaint: c.complaint, circuits: c.circuits, measurements, safety: c.safety };
      const key = `hist:${c.equipmentKey.toLowerCase()}`;
      return {
        source: "HISTORICAL", equipmentKey: key, split: splitFor(key),
        category: eq.category ?? null, refrigerant: eq.refrigerant ?? null, manufacturer: eq.manufacturer ?? null,
        inputs: inputs as unknown as Prisma.InputJsonValue, groundTruth: c.groundTruth, evidence: c.evidence, ...who,
      };
    });
    const r = await db.hvacValidationCase.createMany({ data: rows });
    return NextResponse.json({ imported: r.count });
  }

  if (a.action === "verify" || a.action === "exclude") {
    const c = await db.hvacValidationCase.findUnique({ where: { id: a.id } });
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (a.action === "exclude") {
      const u = await db.hvacValidationCase.update({ where: { id: c.id }, data: { status: "EXCLUDED", excludedReason: a.reason } });
      return NextResponse.json({ case: u });
    }
    // Independence: never the technician who did the call; never the person who submitted it (SUPER_ADMIN excepted).
    if (c.serviceTechId === auth.id) return NextResponse.json({ error: "You did this service call — another person must verify it." }, { status: 400 });
    if (c.submittedById === auth.id && auth.role !== "SUPER_ADMIN") return NextResponse.json({ error: "You submitted this case — another person must verify it." }, { status: 400 });
    const u = await db.hvacValidationCase.update({
      where: { id: c.id },
      data: { status: "VERIFIED", groundTruth: a.groundTruth, evidence: a.evidence, verifiedById: auth.id, verifiedByName: auth.name ?? null, verifiedAt: new Date(), excludedReason: null },
    });
    return NextResponse.json({ case: u });
  }

  // evaluate
  const verified = await db.hvacValidationCase.findMany({ where: { status: "VERIFIED" } });
  if (!verified.length) return NextResponse.json({ error: "No verified case yet — verify cases before running an evaluation." }, { status: 400 });
  const fr = await activeFieldRules();
  const cases: EvalCase[] = verified.map((c) => ({
    id: c.id, split: c.split as Split, category: c.category, refrigerant: c.refrigerant, manufacturer: c.manufacturer,
    inputs: c.inputs as unknown as CaseInputs, groundTruth: c.groundTruth,
  }));
  const result = runEvaluation(cases, fr.values);
  const run = await db.hvacEvaluationRun.create({
    data: {
      engineVersion: result.engineVersion, rulesetVersion: result.rulesetVersion, ptDataVersion: result.ptDataVersion, fieldRulesVersion: fr.version,
      caseCount: result.caseCount, result: result as unknown as Prisma.InputJsonValue, createdById: auth.id, createdByName: auth.name ?? null,
    },
  });
  return NextResponse.json({ runId: run.id });
}
