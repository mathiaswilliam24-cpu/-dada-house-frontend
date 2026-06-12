import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendReviewRequest } from "@/lib/review-request";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const appointment = await db.appointment.findFirst({
    where: { id },
    select: { name: true, phone: true, email: true, service: true },
  });
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const results = await sendReviewRequest(appointment);

  return NextResponse.json({ ok: true, results });
}
