import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/api-auth";
import { getFieldRulesSetting, proposeFieldRules, decideFieldRules, fieldRulesView, RuleChangeError } from "@/lib/hvac/admin-data";
import { RULESET_VERSION } from "@/lib/hvac/rules";

export const dynamic = "force-dynamic";
const APPROVERS = ["ADMIN", "SUPER_ADMIN"];

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, "ADMIN", "SUPER_ADMIN", "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const s = await getFieldRulesSetting();
  return NextResponse.json({ rulesetVersion: RULESET_VERSION, version: s.version, rules: fieldRulesView(s), pending: s.pending, history: s.history, canApprove: APPROVERS.includes(auth.role), me: auth.id });
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("propose"), values: z.record(z.string(), z.number().finite()), note: z.string().max(1000) }),
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject") }),
]);

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, "ADMIN", "SUPER_ADMIN", "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    if (parsed.data.action === "propose") await proposeFieldRules(parsed.data.values, parsed.data.note, auth);
    else {
      if (!APPROVERS.includes(auth.role)) return NextResponse.json({ error: "Only administrators can approve or reject." }, { status: 403 });
      await decideFieldRules(parsed.data.action === "approve", auth);
    }
  } catch (e) {
    if (e instanceof RuleChangeError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
  const s = await getFieldRulesSetting();
  return NextResponse.json({ version: s.version, rules: fieldRulesView(s), pending: s.pending, history: s.history });
}
