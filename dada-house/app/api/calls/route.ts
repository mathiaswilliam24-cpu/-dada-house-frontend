import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { CallStatus, CallDirection } from "@/lib/generated/prisma/enums";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as CallStatus | null;
  const direction = searchParams.get("direction") as CallDirection | null;
  const agentId = searchParams.get("agentId");
  const q = searchParams.get("q");

  const calls = await db.call.findMany({
    where: {
      ...(status && { status }),
      ...(direction && { direction }),
      ...(agentId && { agentId }),
      ...(q && {
        OR: [
          { fromNumber: { contains: q } },
          { toNumber: { contains: q } },
          { customer: { firstName: { contains: q, mode: "insensitive" } } },
          { customer: { lastName: { contains: q, mode: "insensitive" } } },
        ],
      }),
    },
    orderBy: { startedAt: "desc" },
    take: 200,
    include: {
      customer: { select: { id: true, firstName: true, lastName: true } },
      agent: { select: { id: true, name: true } },
      appointment: { select: { id: true, appointmentNumber: true, service: true } },
      recording: true,
      voicemail: true,
    },
  });

  return NextResponse.json({ calls, total: calls.length });
}
