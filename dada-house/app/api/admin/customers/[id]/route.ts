import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      appointments: {
        orderBy: { createdAt: "desc" },
        include: {
          invoice: { select: { id: true, amount: true, status: true, paidAt: true } },
          technician: { select: { name: true } },
        },
      },
      reviews: { orderBy: { createdAt: "desc" } },
      properties: { orderBy: { createdAt: "desc" } },
      servicePlans: {
        include: { plan: { select: { name: true, price: true, interval: true } } },
        orderBy: { createdAt: "desc" },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
        take: 10,
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}
