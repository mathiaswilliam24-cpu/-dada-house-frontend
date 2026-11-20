import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { categoryInfo, COMPLAINTS } from "@/lib/hvac/catalog";
import type { AnalysisResult } from "@/lib/hvac/server";

export const dynamic = "force-dynamic";

type Dec = { decision: "CONFIRMED" | "REJECTED"; autoRank?: number | null; autoStatus?: string | null };

/** HVAC Diagnostic Pro dashboard: sessions, safety audit, confirmed faults, engine-vs-technician agreement. */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "ADMIN", "SUPER_ADMIN", "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const sp = new URL(req.url).searchParams;
  const days = Math.min(730, Math.max(1, Number(sp.get("days") ?? 90) || 90));
  const since = new Date(Date.now() - days * 86400000);

  const sessions = await db.hvacDiagnosticSession.findMany({
    where: { startedAt: { gte: since } },
    orderBy: { startedAt: "desc" },
    take: 2000,
    select: {
      id: true, status: true, startedAt: true, completedAt: true, technicianName: true, complaint: true, mode: true, equipment: true, equipmentId: true,
      decisions: true, results: true, reportNumber: true, reportToken: true,
      appointment: { select: { appointmentNumber: true, name: true, city: true } },
      _count: { select: { safetyEvents: true, scans: true } },
    },
  });
  const safety = await db.hvacSafetyEvent.findMany({
    where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 100,
    include: { session: { select: { id: true, technicianName: true, reportNumber: true, appointment: { select: { name: true, appointmentNumber: true } } } } },
  });

  // Confirmed faults, recurring equipment, engine agreement
  const faultCount = new Map<string, number>();
  const byCategory = new Map<string, { sessions: number; confirmed: number; top1: number; top3: number }>();
  const recurring = new Map<string, { equipment: string; faults: string[]; sessions: number }>();
  let decided = 0, top1 = 0, top3 = 0, notSuggested = 0, rejectedTop = 0;
  for (const s of sessions) {
    const eq = (s.equipment ?? {}) as { category?: string; manufacturer?: string; modelNumber?: string };
    const cat = categoryInfo(eq.category)?.label ?? "Not set";
    const c = byCategory.get(cat) ?? { sessions: 0, confirmed: 0, top1: 0, top3: 0 };
    c.sessions++;
    const r = s.results as unknown as AnalysisResult | null;
    const hyps = r?.rules?.hypotheses ?? [];
    const decs = Object.entries((s.decisions ?? {}) as Record<string, Dec>);
    for (const [hid, d] of decs) {
      const fault = hyps.find((h) => h.id === hid)?.fault ?? hid;
      if (d.decision === "CONFIRMED") {
        faultCount.set(fault, (faultCount.get(fault) ?? 0) + 1);
        decided++; c.confirmed++;
        if (d.autoRank === 1) { top1++; c.top1++; }
        if (d.autoRank != null && d.autoRank <= 3) { top3++; c.top3++; }
        if (d.autoRank == null) notSuggested++;
        if (s.equipmentId) {
          const k = s.equipmentId;
          const e = recurring.get(k) ?? { equipment: [eq.manufacturer, eq.modelNumber].filter(Boolean).join(" ") || cat, faults: [], sessions: 0 };
          e.faults.push(fault); recurring.set(k, e);
        }
      } else if (d.autoRank === 1) rejectedTop++;
    }
    byCategory.set(cat, c);
    if (s.equipmentId && recurring.has(s.equipmentId)) recurring.get(s.equipmentId)!.sessions++;
  }

  return NextResponse.json({
    days,
    kpis: {
      sessions: sessions.length,
      completed: sessions.filter((s) => s.status === "COMPLETED").length,
      drafts: sessions.filter((s) => s.status !== "COMPLETED").length,
      safetyEvents: safety.length,
      aiScans: sessions.reduce((t, s) => t + s._count.scans, 0),
    },
    agreement: {
      confirmedFindings: decided, top1, top3, notSuggested, rejectedTopSuggestions: rejectedTop,
      top1Pct: decided ? Math.round((top1 / decided) * 1000) / 10 : null,
      top3Pct: decided ? Math.round((top3 / decided) * 1000) / 10 : null,
      note: "Agreement between the engine's ranking (before the technician's decision) and technician-confirmed faults in the field. This is monitoring, not an independent validation — no accuracy claim should be made from it.",
    },
    byCategory: [...byCategory.entries()].map(([k, v]) => ({ category: k, ...v })).sort((a, b) => b.sessions - a.sessions),
    faults: [...faultCount.entries()].map(([fault, n]) => ({ fault, n })).sort((a, b) => b.n - a.n),
    recurring: [...recurring.values()].filter((e) => e.faults.length >= 2).sort((a, b) => b.faults.length - a.faults.length).slice(0, 20),
    safety: safety.map((e) => ({
      id: e.id, at: e.createdAt, code: e.code, severity: e.severity, message: e.message, sessionId: e.sessionId,
      technician: e.session.technicianName, customer: e.session.appointment?.name ?? null, job: e.session.appointment?.appointmentNumber ?? null, reportNumber: e.session.reportNumber,
    })),
    sessions: sessions.slice(0, 300).map((s) => {
      const eq = (s.equipment ?? {}) as { category?: string; manufacturer?: string; modelNumber?: string; refrigerant?: string };
      const r = s.results as unknown as AnalysisResult | null;
      return {
        id: s.id, status: s.status, startedAt: s.startedAt, completedAt: s.completedAt, technician: s.technicianName,
        customer: s.appointment?.name ?? null, job: s.appointment?.appointmentNumber ?? null, city: s.appointment?.city ?? null,
        complaint: s.complaint ? COMPLAINTS[s.complaint as keyof typeof COMPLAINTS] : null,
        equipment: [eq.manufacturer, eq.modelNumber].filter(Boolean).join(" ") || categoryInfo(eq.category)?.label || "—",
        refrigerant: eq.refrigerant ?? null, reportNumber: s.reportNumber, safety: s._count.safetyEvents,
        confirmed: (r?.rules?.hypotheses ?? []).filter((h) => h.status === "CONFIRMED").map((h) => h.fault),
        top: (r?.rules?.hypotheses ?? []).find((h) => h.status !== "RULED_OUT")?.fault ?? null,
      };
    }),
  });
}
