import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const appointment = await db.appointment.findUnique({
    where: { id },
    include: { invoice: true },
  });

  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (auth.role !== "ADMIN" && appointment.userId !== auth.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(appointment);
}
