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
  const body = await req.json();
  const {
    equipmentName,
    brand,
    model,
    serialNumber,
    installDate,
    expiresAt,
    notes,
    coveredParts,
    coveredLabor,
  } = body;

  if (!equipmentName) {
    return NextResponse.json({ error: "Equipment name is required" }, { status: 400 });
  }

  const appointment = await db.appointment.findFirst({
    where: { id },
    select: { userId: true },
  });
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const warranty = await db.warranty.create({
    data: {
      appointmentId: id,
      userId: appointment.userId ?? auth.id,
      equipmentName,
      brand: brand ?? null,
      model: model ?? null,
      serialNumber: serialNumber ?? null,
      installDate: installDate ? new Date(installDate) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes: [notes, coveredParts ? `Parts covered: ${coveredParts}` : "", coveredLabor ? `Labor covered: ${coveredLabor}` : ""]
        .filter(Boolean)
        .join("\n") || null,
    },
  });

  return NextResponse.json({ warranty });
}
