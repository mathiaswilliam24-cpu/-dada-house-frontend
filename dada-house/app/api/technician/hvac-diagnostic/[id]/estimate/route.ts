import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { generateEstimateNumber } from "@/lib/utils";
import { canAccess, type AnalysisResult } from "@/lib/hvac/server";
import { suggestForHypotheses } from "@/lib/hvac/estimate";

export const dynamic = "force-dynamic";

async function guard(req: NextRequest, id: string) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return { error: auth };
  const s = await db.hvacDiagnosticSession.findUnique({
    where: { id },
    include: { appointment: { select: { id: true, name: true, email: true, phone: true, address: true, city: true, zipCode: true } } },
  });
  if (!s) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!canAccess(s, auth)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { auth, s };
}

/** Price-book suggestions for the technician-confirmed faults. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(req, id);
  if ("error" in g) return g.error;
  const r = g.s.results as unknown as AnalysisResult | null;
  const eq = (g.s.equipment ?? {}) as { refrigerant?: string };
  const groups = await suggestForHypotheses(r?.rules?.hypotheses ?? [], eq.refrigerant);
  const f = (g.s.findings ?? {}) as { estimateId?: string };
  return NextResponse.json({ groups, estimateId: f.estimateId ?? null });
}

const schema = z.object({ items: z.array(z.object({ id: z.string(), qty: z.number().positive().max(1000).default(1) })).min(1).max(40) });

/** Creates a DRAFT estimate (not sent, nothing charged) from the chosen price-book items. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(req, id);
  if ("error" in g) return g.error;
  const { auth, s } = g;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Choose at least one item." }, { status: 400 });
  const r = s.results as unknown as AnalysisResult | null;
  const confirmed = (r?.rules?.hypotheses ?? []).filter((h) => h.status === "CONFIRMED");
  if (!confirmed.length) return NextResponse.json({ error: "Confirm at least one finding before creating a repair estimate." }, { status: 400 });

  const pb = await db.priceBookItem.findMany({ where: { id: { in: parsed.data.items.map((i) => i.id) } } });
  const byId = new Map(pb.map((p) => [p.id, p]));
  const lineItems = parsed.data.items.filter((i) => byId.has(i.id)).map((i) => {
    const p = byId.get(i.id)!;
    return { id: crypto.randomUUID(), desc: p.name, details: p.description ?? "", rate: p.price, qty: i.qty, amount: Math.round(p.price * i.qty * 100) / 100 };
  });
  const subtotal = Math.round(lineItems.reduce((t, l) => t + l.amount, 0) * 100) / 100;
  const unpriced = lineItems.filter((l) => l.rate <= 0).map((l) => l.desc);
  const a = s.appointment;
  const est = await db.estimate.create({
    data: {
      estimateNumber: generateEstimateNumber(),
      technicianId: auth.id,
      appointmentId: a?.id ?? null,
      clientName: a?.name ?? "",
      clientEmail: a?.email ?? "",
      clientPhone: a?.phone ?? null,
      clientAddress: a?.address ?? null,
      clientCity: a?.city ?? null,
      clientZip: a?.zipCode ?? null,
      lineItems: lineItems as unknown as Prisma.InputJsonValue,
      additionalDetails: `Based on HVAC diagnostic${s.reportNumber ? ` ${s.reportNumber}` : ""} — technician-confirmed: ${confirmed.map((h) => h.fault).join("; ")}.`,
      subtotal, total: subtotal,
      status: "OPEN",
    },
  });
  await db.hvacDiagnosticSession.update({ where: { id }, data: { findings: { ...((s.findings ?? {}) as object), estimateId: est.id } as Prisma.InputJsonValue } });
  return NextResponse.json({ estimateId: est.id, unpriced }, { status: 201 });
}
