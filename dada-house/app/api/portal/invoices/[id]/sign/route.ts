import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { signatureUrl } = await req.json();

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { appointment: { select: { userId: true } } },
  });

  if (!invoice || invoice.appointment.userId !== auth.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.invoice.update({ where: { id }, data: { signatureUrl } });
  await db.appointment.update({ where: { id: invoice.appointmentId }, data: { signatureUrl } });

  return NextResponse.json({ success: true });
}
