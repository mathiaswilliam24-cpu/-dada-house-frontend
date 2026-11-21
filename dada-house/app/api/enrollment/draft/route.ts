import { NextRequest, NextResponse } from "next/server";
import { getDraft } from "@/lib/enrollment-draft";

export const dynamic = "force-dynamic";

/** Public: the pre-filled registration behind a secret link token (used by the enrollment form). */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const d = await getDraft(token);
  if (!d) return NextResponse.json({ error: "This link has expired or is invalid. Please fill in the form or call (844) 928-0875." }, { status: 404 });
  const { vapiCallId: _v, source: _s, ...safe } = d;
  void _v; void _s;
  return NextResponse.json({ draft: safe });
}
