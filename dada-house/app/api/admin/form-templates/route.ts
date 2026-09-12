import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const templates = await db.formTemplate.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { slug, name, category, fields, items } = body;
  if (!slug || !name) return NextResponse.json({ error: "slug and name are required" }, { status: 400 });

  const existing = await db.formTemplate.findUnique({ where: { slug } });
  if (existing) return NextResponse.json({ error: "A template with this slug already exists" }, { status: 409 });

  const template = await db.formTemplate.create({
    data: { slug, name, category: category || null, fields: fields ?? [], items: items ?? [] },
  });

  return NextResponse.json({ template }, { status: 201 });
}
