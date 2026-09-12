import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const allowed = ["name", "isActive", "sortOrder"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) data[key] = body[key];

  const type = await db.systemType.update({ where: { id }, data });
  return NextResponse.json({ type });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await db.systemType.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
