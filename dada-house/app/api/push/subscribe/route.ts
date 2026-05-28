import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { endpoint, keys } = await req.json();
  if (!endpoint || !keys) {
    return NextResponse.json({ error: "endpoint and keys are required" }, { status: 400 });
  }

  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: auth.id, endpoint, keys },
    update: { userId: auth.id, keys },
  });

  return NextResponse.json({ success: true });
}
