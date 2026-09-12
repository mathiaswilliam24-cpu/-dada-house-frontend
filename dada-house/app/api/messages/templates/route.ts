import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const templates = await db.messageTemplate.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { name, body, category } = await req.json();
  if (!name || !body) return NextResponse.json({ error: "Name and body are required" }, { status: 400 });

  const template = await db.messageTemplate.create({ data: { name, body, category } });
  return NextResponse.json({ template }, { status: 201 });
}
