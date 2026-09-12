import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const [activeCalls, agents] = await Promise.all([
    db.call.findMany({
      where: { status: { in: ["RINGING", "IN_PROGRESS"] } },
      orderBy: { startedAt: "asc" },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, tags: true } },
        agent: { select: { id: true, name: true } },
      },
    }),
    db.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "MANAGER", "CUSTOMER_SERVICE_REP", "ADMIN", "DISPATCHER"] } },
      select: { id: true, name: true, agentStatus: true, agentStatusUpdatedAt: true },
    }),
  ]);

  return NextResponse.json({ activeCalls, agents });
}
