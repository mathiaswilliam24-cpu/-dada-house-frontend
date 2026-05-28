import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const projects = await db.galleryProject.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { title, category, location, date, description, tags, images, published, sortOrder } = body;

  if (!title || !category || !location || !date || !description)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const project = await db.galleryProject.create({
    data: {
      title,
      category,
      location,
      date,
      description,
      tags: tags ?? [],
      images: images ?? [],
      published: published ?? true,
      sortOrder: sortOrder ?? 0,
    },
  });
  return NextResponse.json(project, { status: 201 });
}
