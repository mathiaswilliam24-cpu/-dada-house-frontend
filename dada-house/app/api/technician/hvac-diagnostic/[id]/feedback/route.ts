import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { loadSession, canAccess } from "@/lib/hvac/server";
import { isValidLabel } from "@/lib/hvac/validation";

export const dynamic = "force-dynamic";

const schema = z.object({
  engineTopCorrect: z.enum(["YES", "NO", "NOT_SURE"]).nullable().optional(),
  actualFaults: z.array(z.string().max(60)).max(10).optional(),
  otherFault: z.string().trim().max(300).nullable().optional(),
  assistantHelpful: z.enum(["YES", "NO", "NOT_USED"]).nullable().optional(),
  comment: z.string().trim().max(2000).nullable().optional(),
});

/** Technician feedback: what the real cause turned out to be and whether the engine / AI helped. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const session = await loadSession(id);
  if (!session) return NextResponse.json({ error: "Diagnostic not found." }, { status: 404 });
  if (!canAccess(session, auth)) return NextResponse.json({ error: "Not your diagnostic." }, { status: 403 });
  const p = schema.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const d = p.data;
  if (d.actualFaults?.some((f) => !isValidLabel(f))) return NextResponse.json({ error: "Unknown fault" }, { status: 400 });
  const data = {
    ...(d.engineTopCorrect !== undefined && { engineTopCorrect: d.engineTopCorrect }),
    ...(d.actualFaults !== undefined && { actualFaults: d.actualFaults }),
    ...(d.otherFault !== undefined && { otherFault: d.otherFault || null }),
    ...(d.assistantHelpful !== undefined && { assistantHelpful: d.assistantHelpful }),
    ...(d.comment !== undefined && { comment: d.comment || null }),
  };
  const fb = await db.hvacTechnicianFeedback.upsert({
    where: { sessionId: id },
    create: { sessionId: id, technicianId: session.technicianId, technicianName: session.technicianName, ...data },
    update: data,
  });
  return NextResponse.json({ feedback: fb });
}
