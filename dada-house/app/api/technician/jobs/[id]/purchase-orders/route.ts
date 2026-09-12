import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const orders = await db.inventoryRequest.findMany({
    where: { appointmentId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ orders });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { itemName, quantity, reason } = body;
  if (!itemName) return NextResponse.json({ error: "Item name is required" }, { status: 400 });

  const order = await db.inventoryRequest.create({
    data: {
      technicianId: auth.id,
      appointmentId: id,
      itemName,
      quantity: quantity || 1,
      reason: reason || null,
    },
  });

  return NextResponse.json({ order }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  await params; // scoped by the request id below, not the job id
  const body = await req.json();
  const { requestId, status } = body;
  if (!requestId || !status) return NextResponse.json({ error: "requestId and status are required" }, { status: 400 });

  const order = await db.inventoryRequest.update({
    where: { id: requestId },
    data: { status },
  });

  return NextResponse.json({ order });
}
