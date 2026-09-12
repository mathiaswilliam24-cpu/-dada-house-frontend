import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { AgentStatus } from "@/lib/generated/prisma/enums";

export const dynamic = "force-dynamic";

const VALID_STATUSES: AgentStatus[] = ["AVAILABLE", "BUSY", "ON_CALL", "AWAY", "BREAK", "OFFLINE"];

export async function PATCH(req: NextRequest) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { status } = await req.json();
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: auth.id },
    data: { agentStatus: status, agentStatusUpdatedAt: new Date() },
    select: { id: true, agentStatus: true, agentStatusUpdatedAt: true },
  });

  return NextResponse.json({ user });
}

export async function GET(req: NextRequest) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const user = await db.user.findUnique({
    where: { id: auth.id },
    select: { id: true, agentStatus: true, agentStatusUpdatedAt: true },
  });

  return NextResponse.json({ user });
}
