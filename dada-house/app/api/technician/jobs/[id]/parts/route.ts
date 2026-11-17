import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { jobPartSchema } from "@/lib/validations";
import { usePartFromVan, returnJobPart, vanFor, StockError } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const parts = await db.jobPart.findMany({
    where: { appointmentId: id },
    orderBy: { createdAt: "asc" },
  });
  // The technician's van stock, for "Use from my van".
  const van = await vanFor(auth.id, auth.name);
  const items = await db.inventoryItem.findMany({
    where: { isActive: true },
    select: { id: true, name: true, partNumber: true, unit: true, unitCost: true, levels: { where: { locationId: van.id }, select: { quantity: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({
    parts,
    van: { id: van.id, name: van.name },
    stock: items.map((i) => ({ id: i.id, name: i.name, partNumber: i.partNumber, unit: i.unit, unitCost: i.unitCost, onVan: i.levels[0]?.quantity ?? 0 })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();

  // Part taken from the technician's van stock.
  if (typeof body?.inventoryItemId === "string") {
    const qty = Number(body.quantity ?? 1);
    if (!Number.isFinite(qty) || qty <= 0) return NextResponse.json({ error: "Quantity must be more than 0" }, { status: 400 });
    try {
      const part = await usePartFromVan({ appointmentId: id, itemId: body.inventoryItemId, quantity: qty, technician: { id: auth.id, name: auth.name }, notes: body.notes ?? null });
      return NextResponse.json({ part });
    } catch (e) {
      if (e instanceof StockError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }
  }

  const result = jobPartSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { quantity, unitCost, ...rest } = result.data;
  const totalCost = quantity * unitCost;

  const part = await db.jobPart.create({
    data: {
      appointmentId: id,
      technicianId: auth.id,
      quantity,
      unitCost,
      totalCost,
      ...rest,
    },
  });

  return NextResponse.json({ part });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const partId = url.searchParams.get("partId");
  if (!partId) return NextResponse.json({ error: "partId required" }, { status: 400 });

  const part = await db.jobPart.findFirst({
    where: { id: partId, technicianId: auth.role === "ADMIN" ? undefined : auth.id },
  });
  if (!part) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await returnJobPart(partId, { id: auth.id, name: auth.name }); // stock parts go back to the van
  return NextResponse.json({ ok: true });
}
