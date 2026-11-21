import { NextRequest, NextResponse } from "next/server";
import { voiceAuthError, toolArgs, vapiTool } from "@/lib/voice-agent";
import { logUnanswered } from "@/lib/voice-knowledge";
import { notifyStaff } from "@/lib/staff-push";

export const dynamic = "force-dynamic";

/**
 * AI receptionist tool — a question the agent could not answer from its tools.
 * POST { question, callerPhone?, callerName? } → logged for the office (Admin → AI receptionist),
 * who adds the answer so the agent knows it next time.
 */
export const POST = vapiTool(async (req: NextRequest) => {
  const denied = voiceAuthError(req); if (denied) return denied;
  const a = await toolArgs(req);
  const question = String(a.question ?? "").trim();
  if (!question) return NextResponse.json({ error: "question is required" }, { status: 400 });
  await logUnanswered({ question, callerPhone: a.callerPhone ? String(a.callerPhone) : null, callerName: a.callerName ? String(a.callerName) : null });
  await notifyStaff({ title: "AI receptionist: question without an answer", body: question.slice(0, 160), url: "/admin/ai-receptionist", tag: "voice-unanswered" }).catch(() => {});
  return NextResponse.json({ ok: true, message: "Logged for the team. Tell the caller you don't have that information and offer to transfer them (transferCall)." });
});
