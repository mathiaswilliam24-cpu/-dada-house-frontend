import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const properties = await db.property.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ properties });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { address, city, state, zipCode, type, notes } = await req.json();
  if (!address || !city) return NextResponse.json({ error: "Address and city are required" }, { status: 400 });

  const property = await db.property.create({
    data: {
      userId: session.user.id,
      address,
      city,
      state: (state || "TX").toUpperCase(),
      zipCode: zipCode || "",
      type: type || "Residential",
      notes: notes || null,
    },
  });

  return NextResponse.json({ property }, { status: 201 });
}
