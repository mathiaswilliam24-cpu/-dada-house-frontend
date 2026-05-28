import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const conversations = await db.aIConversation.findMany({
    where: { userId: auth.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ conversations });
}
