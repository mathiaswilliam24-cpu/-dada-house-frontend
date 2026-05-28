import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const clients = await db.technicianClient.findMany({
    where: {
      technicianId: auth.id,
      ...(q ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      } : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { name, email, phone, mobile, address, city, state, zip, notes } = body;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  // Avoid duplicates for same technician by email
  if (email) {
    const existing = await db.technicianClient.findFirst({
      where: { technicianId: auth.id, email },
    });
    if (existing) return NextResponse.json({ client: existing });
  }

  const client = await db.technicianClient.create({
    data: {
      technicianId: auth.id,
      name, email: email ?? null, phone: phone ?? null,
      mobile: mobile ?? null, address: address ?? null,
      city: city ?? null, state: state ?? "TX",
      zip: zip ?? null, notes: notes ?? null,
    },
  });

  return NextResponse.json({ client }, { status: 201 });
}
