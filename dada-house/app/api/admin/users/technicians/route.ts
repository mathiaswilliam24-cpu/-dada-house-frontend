import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;

  const technicians = await db.user.findMany({
    where: { role: "TECHNICIAN" },
    select: { id: true, name: true, phone: true, image: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ technicians });
}