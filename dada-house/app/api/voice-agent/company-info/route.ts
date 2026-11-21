import { NextRequest, NextResponse } from "next/server";
import { voiceAuthError, toolArgs, vapiTool } from "@/lib/voice-agent";
import { builtInFacts, searchKnowledge } from "@/lib/voice-knowledge";

export const dynamic = "force-dynamic";

/**
 * AI receptionist tool — everything the agent may say about DADA HOUSE.
 * POST { question? } → system facts + the office's matching answers.
 * If the answer is not in the response, the agent does not know it.
 */
export const POST = vapiTool(async (req: NextRequest) => {
  const denied = voiceAuthError(req); if (denied) return denied;
  const a = await toolArgs(req);
  const question = String(a.question ?? "").slice(0, 300);
  const [facts, answers] = await Promise.all([builtInFacts(), question ? searchKnowledge(question) : Promise.resolve([])]);
  return NextResponse.json({
    facts,
    officeAnswers: answers,
    instruction: "Answer ONLY with these facts and office answers, in your own words. If the answer is not here, say you don't have that information, call log_unanswered_question, then offer to transfer the caller to the team.",
  });
});
