import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const technicians = await db.technician.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(technicians);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name, role, specialties, phone, email, photo, bio, available, sortOrder } = body;

  if (!name || !role)
    return NextResponse.json({ error: "Name and role are required" }, { status: 400 });

  const tech = await db.technician.create({
    data: {
      name,
      role,
      specialties: specialties ?? [],
      phone: phone ?? null,
      email: email ?? null,
      photo: photo ?? null,
      bio: bio ?? null,
      available: available ?? true,
      sortOrder: sortOrder ?? 0,
    },
  });
  return NextResponse.json(tech, { status: 201 });
}
