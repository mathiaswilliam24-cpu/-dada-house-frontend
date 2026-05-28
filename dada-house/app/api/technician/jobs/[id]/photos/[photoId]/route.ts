import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { photoId } = await params;
  const photo = await db.jobPhoto.findFirst({
    where: {
      id: photoId,
      technicianId: auth.role === "ADMIN" ? undefined : auth.id,
    },
  });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.jobPhoto.delete({ where: { id: photoId } });
  return NextResponse.json({ ok: true });
}
