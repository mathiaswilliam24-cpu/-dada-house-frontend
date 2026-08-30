import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { address, city, state, zipCode, type, notes } = await req.json();

  const existing = await db.property.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const property = await db.property.update({
    where: { id },
    data: {
      address: address || existing.address,
      city: city || existing.city,
      state: state ? state.toUpperCase() : existing.state,
      zipCode: zipCode ?? existing.zipCode,
      type: type || existing.type,
      notes: notes ?? existing.notes,
    },
  });

  return NextResponse.json({ property });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.property.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.property.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
