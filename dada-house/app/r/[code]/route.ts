import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const link = await db.shortLink.findUnique({ where: { code } });
  if (!link) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.redirect(link.targetUrl);
}
