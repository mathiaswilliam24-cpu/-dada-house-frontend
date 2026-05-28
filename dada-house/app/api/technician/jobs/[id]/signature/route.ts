import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { signatureUrl } = await req.json();
  if (!signatureUrl) {
    return NextResponse.json({ error: "signatureUrl is required" }, { status: 400 });
  }

  const appointment = await db.appointment.update({ where: { id }, data: { signatureUrl } });

  await db.invoice.updateMany({
    where: { appointmentId: id },
    data: { signatureUrl },
  });

  return NextResponse.json({ success: true, appointment });
}
