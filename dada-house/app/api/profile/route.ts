import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const user = await db.user.findUnique({
    where: { id: auth.id },
    select: { id: true, name: true, email: true, phone: true },
  });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  const user = await db.user.update({
    where: { id: auth.id },
    data: { name: parsed.data.name, phone: parsed.data.phone ?? null },
    select: { id: true, name: true, email: true, phone: true },
  });
  return NextResponse.json(user);
}
