import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { PAY_ROLES, ctParts } from "@/lib/dispatch";
import { jobCosting } from "@/lib/job-costing";

export const dynamic = "force-dynamic";

/** Job costing report (managers only — shows pay). ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive, NC time). */
export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  if (!PAY_ROLES.includes(auth.role)) return NextResponse.json({ error: "Job costing is visible to managers and admins only." }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const today = ctParts(new Date()).ymd;
  const ok = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const from = ok(sp.get("from")) ?? `${today.slice(0, 8)}01`;
  const to = ok(sp.get("to")) ?? today;
  if (to < from) return NextResponse.json({ error: "End date is before start date." }, { status: 400 });
  return NextResponse.json(await jobCosting(from, to));
}
