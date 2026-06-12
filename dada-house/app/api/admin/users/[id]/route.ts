import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { name, email, phone, role, password } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (role !== undefined) data.role = role;
  if (password) data.password = await bcrypt.hash(password, 10);

  const user = await db.user.update({ where: { id }, data });

  // Keep the technician roster entry in sync with the user account
  const roster = await db.technician.findUnique({ where: { userId: id } });
  if (roster) {
    const rosterData: Record<string, unknown> = {};
    if (name !== undefined) rosterData.name = name || email;
    if (email !== undefined) rosterData.email = email;
    if (phone !== undefined) rosterData.phone = phone;
    if (Object.keys(rosterData).length > 0) {
      await db.technician.update({ where: { userId: id }, data: rosterData });
    }
  } else if (user.role === "TECHNICIAN") {
    await db.technician.create({
      data: {
        userId: user.id,
        name: user.name || user.email,
        role: "Technician",
        phone: user.phone ?? null,
        email: user.email,
        available: true,
      },
    });
  }

  return NextResponse.json({ user });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (id === auth.id)
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });

  await db.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
