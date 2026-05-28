import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { propertySchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const properties = await db.property.findMany({
    where: { userId: auth.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ properties });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const result = propertySchema.safeParse(body);
  if (!result.success) return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });

  const property = await db.property.create({ data: { ...result.data, userId: auth.id } });
  return NextResponse.json({ property }, { status: 201 });
}
