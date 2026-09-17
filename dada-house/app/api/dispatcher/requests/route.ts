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
    // Most recently booked first — a job created a minute ago (from any source:
    // website, AI voice agent, or a dispatcher creating it manually) should
    // always surface at the top so nothing new gets missed.
    orderBy: { createdAt: "desc" },
    include: {
      technician: { select: { name: true } },
    },
  });

  return NextResponse.json({ appointments });
}
