import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { getCommandCenter } from "@/lib/dispatch-alerts";

export const dynamic = "force-dynamic";

/** Command Center: KPIs, live alerts, technician status and recent activity (North Carolina time). */
export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await getCommandCenter());
}
