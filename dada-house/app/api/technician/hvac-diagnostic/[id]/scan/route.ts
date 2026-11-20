import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { loadSession, canAccess, analyze, type LoadedSession } from "@/lib/hvac/server";
import { readImages, type Proposal, type CrossCheck } from "@/lib/hvac/vision";
import { INSTRUMENTS, INSTRUMENT_IDS, targetKeys, type InstrumentId } from "@/lib/hvac/instruments";
import { runEngine, type EquipmentSpec } from "@/lib/hvac/engine";
import { FIELD_BY_KEY } from "@/lib/hvac/catalog";
import { CANONICAL_UNIT } from "@/lib/hvac/units";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const uploadUrl = z.string().url().refine((u) => /^https:\/\/([a-z0-9-]+\.)*(ufs\.sh|utfs\.io|uploadthing\.com)\//i.test(u), "Images must be uploaded through the app");

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("read"), imageUrls: z.array(uploadUrl).min(1).max(8), kind: z.enum(["PHOTO", "VIDEO_FRAMES"]).default("PHOTO"),
    instrument: z.enum(INSTRUMENT_IDS as [InstrumentId, ...InstrumentId[]]).default("AUTO"),
    options: z.array(z.string().max(200)).max(10).optional(),
    circuit: z.number().int().min(1).max(4).nullable().optional(),
  }),
  z.object({
    action: z.literal("apply"), scanId: z.string(),
    accepted: z.array(z.object({ index: z.number().int().min(0), value: z.number().finite().nullable().optional(), text: z.string().max(200).nullable().optional() })).max(100),
  }),
  z.object({ action: z.literal("discard"), scanId: z.string() }),
]);

type Check = { level: "WARNING" | "INFO"; message: string };

/** Compares what a digital manifold displays with the nameplate and with DADA HOUSE's own calculation. */
function crossChecks(session: LoadedSession, proposals: Proposal[], cc: CrossCheck | null, circuit: number): Check[] {
  if (!cc) return [];
  const out: Check[] = [];
  const eq = (session.equipment ?? {}) as EquipmentSpec;
  const nameplate = eq.refrigerant ?? proposals.find((p) => p.target === "equipment" && p.key === "refrigerant")?.text ?? null;
  if (cc.refrigerantSetting && nameplate && cc.refrigerantSetting !== nameplate) {
    out.push({ level: "WARNING", message: `The manifold is set to ${cc.refrigerantSetting} but the equipment uses ${nameplate}. The pressures and clamp temperatures are still valid, but the manifold's saturation, superheat and subcooling are wrong — set the manifold to ${nameplate}.` });
  }
  if (cc.superheatF == null && cc.subcoolingF == null) return out;
  // Engine preview with the stored readings + what was just read.
  const measurements: Record<number, Record<string, { value: number | null; text: string | null }>> = {};
  for (const m of session.measurements) (measurements[m.circuit] ??= {})[m.key] = { value: m.value, text: m.text };
  for (const p of proposals) if (p.target === "measurement" && p.value != null) (measurements[p.circuit] ??= {})[p.key] = { value: p.value, text: null };
  try {
    const r = runEngine({ equipment: eq, mode: session.mode, complaint: session.complaint, circuits: session.circuits, measurements, safety: (session.safety ?? {}) as Record<string, boolean> });
    const calc = (k: string) => r.calculated.find((x) => x.key === k && (x.circuit ?? 1) === circuit)?.value ?? null;
    for (const [shown, key, label] of [[cc.superheatF, "superheat_f", "superheat"], [cc.subcoolingF, "subcooling_f", "subcooling"]] as const) {
      const ours = calc(key);
      if (shown == null || ours == null) continue;
      const d = Math.abs(shown - ours);
      if (d > 2) out.push({ level: "WARNING", message: `The manifold shows ${label} ${shown} °F, DADA HOUSE calculates ${Math.round(ours * 10) / 10} °F from the same pressures and temperatures (${Math.round(d * 10) / 10} °F apart). Check the refrigerant selected on the manifold and the clamp placement.` });
      else out.push({ level: "INFO", message: `Manifold ${label} ${shown} °F matches the DADA HOUSE calculation (${Math.round(ours * 10) / 10} °F).` });
    }
  } catch { /* preview is best-effort; the full analysis runs after validation */ }
  return out;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const session = await loadSession(id);
  if (!session) return NextResponse.json({ error: "Diagnostic not found." }, { status: 404 });
  if (!canAccess(session, auth)) return NextResponse.json({ error: "Not your diagnostic." }, { status: 403 });
  if (session.status === "COMPLETED") return NextResponse.json({ error: "This diagnostic is completed and locked." }, { status: 409 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const p = parsed.data;

  if (p.action === "read") {
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI reading is not configured (OPENAI_API_KEY missing)." }, { status: 503 });
    const ins = INSTRUMENTS[p.instrument];
    const targets = targetKeys(p.instrument, p.options);
    if ((ins.pick === "one" || ins.pick === "pair") && !targets.length) return NextResponse.json({ error: "Choose what was measured before taking the photo." }, { status: 400 });
    const circuit = session.circuits > 1 ? Math.min(session.circuits, p.circuit ?? 1) : null;
    const scan = await db.hvacScan.create({
      data: { sessionId: id, technicianId: auth.id, imageUrls: p.imageUrls, kind: p.kind, instrument: p.instrument, targets: targets as Prisma.InputJsonValue, circuit },
    });
    try {
      const eq = (session.equipment ?? {}) as { refrigerant?: string | null };
      const r = await readImages(p.imageUrls, { refrigerant: eq.refrigerant, circuits: session.circuits, instrument: p.instrument, targets, circuit });
      const checks = crossChecks(session, r.proposals, r.crossCheck, circuit ?? 1);
      const updated = await db.hvacScan.update({
        where: { id: scan.id },
        data: {
          model: r.model, proposals: r.proposals as unknown as Prisma.InputJsonValue, notes: r.notes,
          crossCheck: (r.crossCheck || checks.length ? { ...(r.crossCheck ?? {}), checks } : undefined) as Prisma.InputJsonValue | undefined,
        },
      });
      return NextResponse.json({ scan: { id: updated.id, proposals: r.proposals, notes: r.notes, imageUrls: p.imageUrls, checks, instrument: p.instrument } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "AI reading failed";
      await db.hvacScan.update({ where: { id: scan.id }, data: { status: "FAILED", error: msg.slice(0, 500) } });
      const quota = /insufficient_quota|credit_balance|exceeded your current quota/i.test(msg);
      return NextResponse.json({
        error: quota
          ? "AI reading is unavailable: the OpenAI account has no credits left. Enter the values manually, or ask the office to add credits."
          : "The images could not be read. Try a sharper photo, closer to the display or nameplate.",
      }, { status: quota ? 503 : 502 });
    }
  }

  const scan = await db.hvacScan.findFirst({ where: { id: p.scanId, sessionId: id } });
  if (!scan || scan.status !== "PENDING") return NextResponse.json({ error: "Scan not found or already handled." }, { status: 400 });
  if (p.action === "discard") {
    await db.hvacScan.update({ where: { id: scan.id }, data: { status: "DISCARDED", outcomes: [] } });
    return NextResponse.json({ ok: true });
  }

  // apply: only what the technician ticked (and possibly corrected) is saved, with the photo as evidence.
  const proposals = (scan.proposals ?? []) as unknown as Proposal[];
  const images = (scan.imageUrls ?? []) as string[];
  const insLabel = INSTRUMENTS[(scan.instrument as InstrumentId) ?? "AUTO"]?.label ?? "Photo";
  const eqPatch: Record<string, unknown> = {};
  const specsPatch: Record<string, unknown> = {};
  const outcomes = proposals.map((pr, index) => ({ index, key: pr.key, target: pr.target, accepted: false, corrected: false }));
  for (const a of p.accepted) {
    const pr = proposals[a.index];
    if (!pr) continue;
    const value = a.value !== undefined ? a.value : pr.value;
    const text = a.text !== undefined ? a.text : pr.text;
    outcomes[a.index].accepted = true;
    outcomes[a.index].corrected = (a.value !== undefined && a.value !== pr.value) || (a.text !== undefined && (a.text ?? "") !== (pr.text ?? ""));
    if (pr.target === "equipment") {
      const v = value ?? text;
      if (v == null || v === "") continue;
      if (pr.key.startsWith("specs.")) specsPatch[pr.key.slice(6)] = value;
      else if (pr.key === "phase") eqPatch.phase = value === 3 ? 3 : 1;
      else eqPatch[pr.key] = v;
      continue;
    }
    const f = FIELD_BY_KEY[pr.key];
    if (!f) continue;
    const circuit = f.perCircuit ? pr.circuit : 1;
    const row = {
      value: f.input === "number" ? value ?? null : null, text: f.input === "number" ? null : text ?? null,
      unit: f.input === "number" ? (f.kind === "plain" ? f.unit ?? null : CANONICAL_UNIT[f.kind]) : null,
      enteredValue: null, enteredUnit: null, location: null,
      instrument: `${insLabel} — photo read by AI ("${pr.read}"), verified${pr.frames ? ` · ${pr.frames} frames${pr.unstable ? ", not stable" : ""}` : ""}`.slice(0, 300),
      source: "AI_PHOTO", scanId: scan.id, imageUrl: images[pr.image] ?? images[0] ?? null, aiValue: pr.value, aiText: pr.text,
      mode: session.mode, technicianId: auth.id, measuredAt: new Date(),
    };
    if (row.value == null && !row.text) continue;
    await db.hvacMeasurement.upsert({
      where: { sessionId_circuit_key: { sessionId: id, circuit, key: pr.key } },
      create: { sessionId: id, circuit, key: pr.key, ...row }, update: row,
    });
  }
  if (Object.keys(eqPatch).length || Object.keys(specsPatch).length) {
    const prev = (session.equipment ?? {}) as Record<string, unknown>;
    await db.hvacDiagnosticSession.update({
      where: { id },
      data: { equipment: { ...prev, ...eqPatch, specs: { ...((prev.specs as object) ?? {}), ...specsPatch } } as Prisma.InputJsonValue },
    });
  }
  await db.hvacScan.update({ where: { id: scan.id }, data: { status: "APPLIED", outcomes: outcomes as unknown as Prisma.InputJsonValue } });
  const fresh = (await loadSession(id))!;
  const results = await analyze(fresh);
  return NextResponse.json({ session: { ...fresh, results } });
}
