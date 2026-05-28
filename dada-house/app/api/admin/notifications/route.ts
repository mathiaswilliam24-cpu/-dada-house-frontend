import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 50;

  const where: Record<string, unknown> = {};
  if (type && type !== "ALL") where.type = type;
  if (status && status !== "ALL") where.status = status;

  const [logs, total] = await Promise.all([
    db.notificationLog.findMany({
      where,
      orderBy: { sentAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        appointment: {
          select: { appointmentNumber: true, service: true, name: true },
        },
      },
    }),
    db.notificationLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, pages: Math.ceil(total / limit) });
}
