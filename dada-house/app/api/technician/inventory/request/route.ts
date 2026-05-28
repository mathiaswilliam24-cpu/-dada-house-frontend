import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { itemName, quantity = 1, reason, appointmentId, itemId } = body;

  if (!itemName) return NextResponse.json({ error: "itemName required" }, { status: 400 });

  const request = await db.inventoryRequest.create({
    data: {
      technicianId: auth.id,
      itemName,
      quantity,
      reason: reason ?? null,
      appointmentId: appointmentId ?? null,
      itemId: itemId ?? null,
    },
  });

  return NextResponse.json({ request });
}
