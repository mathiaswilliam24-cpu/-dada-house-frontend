import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const q = searchParams.get("q");
  const limit = 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { role: "CLIENT" };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: { select: { appointments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page });
}
