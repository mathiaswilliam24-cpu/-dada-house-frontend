import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { loadSession, canAccess, analyze, type AnalysisResult } from "@/lib/hvac/server";
import { findModelSpec } from "@/lib/hvac/admin-data";
import { askAssistant, buildContext, ASSISTANT_MODEL } from "@/lib/hvac/assistant";
import { FIELD_BY_KEY } from "@/lib/hvac/catalog";
import { CANONICAL_UNIT } from "@/lib/hvac/units";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function guard(req: NextRequest, id: string) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return { error: auth };
  const session = await loadSession(id);
  if (!session) return { error: NextResponse.json({ error: "Diagnostic not found." }, { status: 404 }) };
  if (!canAccess(session, auth)) return { error: NextResponse.json({ error: "Not your diagnostic." }, { status: 403 }) };
  return { auth, session };
}

const view = (r: { id: string; createdAt: Date; output: unknown; removed: unknown; helpful: boolean | null; resultsAt: string | null; model: string }) =>
  ({ id: r.id, createdAt: r.createdAt, output: r.output, removedCount: Array.isArray(r.removed) ? r.removed.length : 0, helpful: r.helpful, resultsAt: r.resultsAt, model: r.model });

/** Latest AI explanation for this diagnostic. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(req, id);
  if ("error" in g) return g.error;
  const r = await db.hvacAssistantReview.findFirst({ where: { sessionId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ review: r ? view(r) : null });
}

/** Ask the AI to explain the current analysis (explanation only — the engine stays authoritative). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(req, id);
  if ("error" in g) return g.error;
  const { auth, session } = g;
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "The AI assistant is not configured (OPENAI_API_KEY missing)." }, { status: 503 });
  const results = (session.results as unknown as AnalysisResult | null) ?? (await analyze(session));
  if (!results.rules?.hypotheses.length && !results.calculated.length) {
    return NextResponse.json({ error: "Record measurements first — there is nothing to explain yet." }, { status: 400 });
  }
  const eq = (session.equipment ?? {}) as Record<string, unknown>;
  const spec = await findModelSpec(eq.manufacturer as string, eq.modelNumber as string);
  const context = buildContext({
    equipment: eq, complaint: session.complaint, mode: session.mode,
    measurements: session.measurements.map((m) => {
      const f = FIELD_BY_KEY[m.key];
      return { key: m.key, label: f?.label ?? m.key, circuit: m.circuit, value: m.value, text: m.text, unit: f ? ((f.kind === "plain" ? f.unit : CANONICAL_UNIT[f.kind]) || null) : null };
    }),
    results,
    manufacturerReference: spec ? { manufacturer: spec.manufacturer, modelPrefix: spec.modelPrefix, specs: spec.specs, sourceDocument: spec.sourceDocument } : null,
    technicianNotes: session.notes ?? null,
  });
  try {
    const { output, removed } = await askAssistant(context);
    const r = await db.hvacAssistantReview.create({
      data: {
        sessionId: id, technicianId: auth.id, model: ASSISTANT_MODEL, resultsAt: results.computedAt ?? null,
        output: output as unknown as Prisma.InputJsonValue, removed: removed as unknown as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ review: view(r) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    const quota = /insufficient_quota|credit_balance|exceeded your current quota/i.test(msg);
    return NextResponse.json({
      error: quota
        ? "The AI assistant is unavailable: the OpenAI account has no credits left. The engine analysis is complete without it."
        : "The AI assistant could not answer right now. The engine analysis is unaffected.",
    }, { status: quota ? 503 : 502 });
  }
}

const rate = z.object({ reviewId: z.string(), helpful: z.boolean() });
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(req, id);
  if ("error" in g) return g.error;
  const p = rate.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const r = await db.hvacAssistantReview.findFirst({ where: { id: p.data.reviewId, sessionId: id } });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const u = await db.hvacAssistantReview.update({ where: { id: r.id }, data: { helpful: p.data.helpful } });
  return NextResponse.json({ review: view(u) });
}
