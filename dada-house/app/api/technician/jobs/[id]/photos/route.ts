import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const photos = await db.jobPhoto.findMany({
    where: { appointmentId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ photos });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { url, category = "general", caption } = body;

  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  const photo = await db.jobPhoto.create({
    data: {
      appointmentId: id,
      technicianId: auth.id,
      url,
      category,
      caption: caption ?? null,
    },
  });

  return NextResponse.json({ photo });
}
