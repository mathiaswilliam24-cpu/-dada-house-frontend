import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;

  const appointments = await db.appointment.findMany({
    where: {
      status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
    },
    orderBy: [{ preferredDate: "asc" }, { createdAt: "desc" }],
    include: {
      technician: { select: { name: true } },
    },
  });

  return NextResponse.json({ appointments });
}
