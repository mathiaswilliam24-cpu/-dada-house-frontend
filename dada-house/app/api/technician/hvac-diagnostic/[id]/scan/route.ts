import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { loadSession, canAccess, analyze } from "@/lib/hvac/server";
import { readImages, type Proposal } from "@/lib/hvac/vision";
import { FIELD_BY_KEY } from "@/lib/hvac/catalog";
import { CANONICAL_UNIT } from "@/lib/hvac/units";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const uploadUrl = z.string().url().refine((u) => /^https:\/\/([a-z0-9-]+\.)*(ufs\.sh|utfs\.io|uploadthing\.com)\//i.test(u), "Images must be uploaded through the app");

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read"), imageUrls: z.array(uploadUrl).min(1).max(8), kind: z.enum(["PHOTO", "VIDEO_FRAMES"]).default("PHOTO") }),
  z.object({
    action: z.literal("apply"), scanId: z.string(),
    accepted: z.array(z.object({ index: z.number().int().min(0), value: z.number().finite().nullable().optional(), text: z.string().max(200).nullable().optional() })).max(100),
  }),
  z.object({ action: z.literal("discard"), scanId: z.string() }),
]);

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
    const scan = await db.hvacScan.create({ data: { sessionId: id, technicianId: auth.id, imageUrls: p.imageUrls, kind: p.kind } });
    try {
      const eq = (session.equipment ?? {}) as { refrigerant?: string | null };
      const r = await readImages(p.imageUrls, { refrigerant: eq.refrigerant, circuits: session.circuits });
      const updated = await db.hvacScan.update({ where: { id: scan.id }, data: { proposals: r.proposals as unknown as Prisma.InputJsonValue, notes: r.notes, model: r.model } });
      return NextResponse.json({ scan: updated });
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
    await db.hvacScan.update({ where: { id: scan.id }, data: { status: "DISCARDED" } });
    return NextResponse.json({ ok: true });
  }

  // apply: only what the technician ticked (and possibly corrected) is saved.
  const proposals = (scan.proposals ?? []) as unknown as Proposal[];
  const eqPatch: Record<string, unknown> = {};
  const specsPatch: Record<string, unknown> = {};
  for (const a of p.accepted) {
    const pr = proposals[a.index];
    if (!pr) continue;
    const value = a.value !== undefined ? a.value : pr.value;
    const text = a.text !== undefined ? a.text : pr.text;
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
      enteredValue: null, enteredUnit: null, location: null, instrument: `Photo (AI read "${pr.read}", verified)`, source: "AI_PHOTO",
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
  await db.hvacScan.update({ where: { id: scan.id }, data: { status: "APPLIED" } });
  const fresh = (await loadSession(id))!;
  const results = await analyze(fresh);
  return NextResponse.json({ session: { ...fresh, results } });
}
