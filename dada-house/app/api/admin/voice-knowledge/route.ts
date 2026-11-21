import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api-auth";
import { builtInFacts, getKnowledge, getUnanswered, saveKnowledgeEntry, deleteKnowledgeEntry, setUnansweredStatus } from "@/lib/voice-knowledge";

export const dynamic = "force-dynamic";

/** Admin → AI receptionist: what Sarah knows, and the questions she could not answer. */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const [facts, entries, unanswered] = await Promise.all([builtInFacts(), getKnowledge(), getUnanswered()]);
  return NextResponse.json({ facts, entries, unanswered });
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), id: z.string().optional(), question: z.string().trim().min(3).max(300), answer: z.string().trim().min(2).max(2000), keywords: z.array(z.string().max(60)).max(300).optional(), unansweredId: z.string().optional() }),
  z.object({ action: z.literal("delete"), id: z.string() }),
  z.object({ action: z.literal("dismiss"), unansweredId: z.string() }),
]);

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;
  const p = schema.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0].message }, { status: 400 });
  const d = p.data;
  if (d.action === "save") {
    const entry = await saveKnowledgeEntry({ id: d.id, question: d.question, answer: d.answer, keywords: d.keywords }, auth.name ?? auth.email ?? null);
    if (d.unansweredId) await setUnansweredStatus(d.unansweredId, "ANSWERED");
    return NextResponse.json({ entry });
  }
  if (d.action === "delete") { await deleteKnowledgeEntry(d.id); return NextResponse.json({ ok: true }); }
  await setUnansweredStatus(d.unansweredId, "DISMISSED");
  return NextResponse.json({ ok: true });
}
