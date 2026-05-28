import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const estimates = await db.estimate.findMany({
    where: { isInvoice: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      estimateNumber: true,
      clientName: true,
      clientEmail: true,
      total: true,
      status: true,
      sentAt: true,
      convertedAt: true,
      createdAt: true,
      technician: { select: { name: true } },
    },
  });

  const total = estimates.reduce((s, e) => s + e.total, 0);
  const open = estimates.filter((e) => e.status === "OPEN").length;
  const closed = estimates.filter((e) => e.status === "CLOSED").length;
  const sent = estimates.filter((e) => e.sentAt).length;

  return NextResponse.json({ estimates, total, open, closed, sent });
}
