import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const types = await db.systemType.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ types });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const count = await db.systemType.count();
  const type = await db.systemType.create({ data: { name, sortOrder: count } });
  return NextResponse.json({ type }, { status: 201 });
}
