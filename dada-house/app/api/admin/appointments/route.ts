import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const status = searchParams.get("status");
  const q = searchParams.get("q");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { appointmentNumber: { contains: q, mode: "insensitive" } },
    ];
  }

  const [appointments, total] = await Promise.all([
    db.appointment.findMany({
      where,
      include: { invoice: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    db.appointment.count({ where }),
  ]);

  return NextResponse.json({ appointments, total, page, totalPages: Math.ceil(total / limit) });
}
