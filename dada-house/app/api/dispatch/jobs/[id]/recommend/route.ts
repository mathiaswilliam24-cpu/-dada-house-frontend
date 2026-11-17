import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { recommendTechnicians } from "@/lib/dispatch-recommend";

export const dynamic = "force-dynamic";

/** Ranked technicians for a job (optionally for a requested start time). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const start = new URL(req.url).searchParams.get("start");
  try {
    return NextResponse.json(await recommendTechnicians(id, { start: start ? new Date(start) : null }));
  } catch (err) {
    console.error("recommend failed", err);
    return NextResponse.json({ error: "Could not compute recommendations" }, { status: 500 });
  }
}
