import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { ensureLocations, receiveStock, transferStock, adjustStock, vanFor, StockError } from "@/lib/inventory";

export const dynamic = "force-dynamic";

/** Stock overview: catalog, locations (warehouse + vans), levels, open technician requests, recent movements. */
export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  await ensureLocations();

  const [items, locations, requests, movements] = await Promise.all([
    db.inventoryItem.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { levels: true } }),
    db.stockLocation.findMany({ where: { isActive: true }, orderBy: [{ kind: "desc" }, { name: "asc" }] }),
    db.inventoryRequest.findMany({
      where: { status: "PENDING" }, orderBy: { createdAt: "asc" },
      include: { technician: { select: { id: true, name: true } } },
    }),
    db.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { item: { select: { name: true } } } }),
  ]);

  // Vans of technicians who are no longer active stay listed only if they still hold stock.
  const held = new Set(items.flatMap((i) => i.levels.filter((l) => l.quantity !== 0).map((l) => l.locationId)));
  const activeTechs = new Set((await db.user.findMany({ where: { role: "TECHNICIAN" }, select: { id: true, technicianProfile: { select: { isActive: true } } } }))
    .filter((t) => t.technicianProfile?.isActive !== false).map((t) => t.id));
  const shown = locations.filter((l) => l.kind === "WAREHOUSE" || (l.technicianId && activeTechs.has(l.technicianId)) || held.has(l.id));
  const locName = new Map(locations.map((l) => [l.id, l.name]));

  return NextResponse.json({
    locations: shown.map((l) => ({ id: l.id, name: l.name, kind: l.kind, technicianId: l.technicianId })),
    items: items.map((i) => ({
      id: i.id, name: i.name, partNumber: i.partNumber, category: i.category, unit: i.unit, unitCost: i.unitCost, sellPrice: i.sellPrice,
      supplier: i.supplier, isActive: i.isActive, minQuantity: i.minQuantity,
      levels: Object.fromEntries(i.levels.map((l) => [l.locationId, { quantity: l.quantity, minQuantity: l.minQuantity }])),
    })),
    requests: requests.map((r) => ({
      id: r.id, itemId: r.itemId, itemName: r.itemName, quantity: r.quantity, reason: r.reason, appointmentId: r.appointmentId,
      technicianId: r.technicianId, technician: r.technician.name, createdAt: r.createdAt.toISOString(),
    })),
    movements: movements.map((m) => ({
      id: m.id, type: m.type, item: m.item.name, quantity: m.quantity, unitCost: m.unitCost,
      from: m.fromLocationId ? locName.get(m.fromLocationId) ?? "—" : null, to: m.toLocationId ? locName.get(m.toLocationId) ?? "—" : null,
      appointmentId: m.appointmentId, note: m.note, userName: m.userName, at: m.createdAt.toISOString(),
    })),
  });
}

const num = z.number().finite();
const itemFields = {
  name: z.string().trim().min(2).max(160),
  partNumber: z.string().trim().max(80).nullable().optional(),
  category: z.string().trim().max(80).nullable().optional(),
  unit: z.string().trim().max(20).nullable().optional(),
  unitCost: num.min(0).max(100000).nullable().optional(),
  sellPrice: num.min(0).max(100000).nullable().optional(),
  supplier: z.string().trim().max(120).nullable().optional(),
  minQuantity: z.number().int().min(0).max(100000).optional(),
};

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_item"), ...itemFields }),
  z.object({ action: z.literal("update_item"), itemId: z.string(), ...itemFields, isActive: z.boolean().optional() }),
  z.object({ action: z.literal("receive"), itemId: z.string(), locationId: z.string(), quantity: num.positive(), unitCost: num.min(0).nullable().optional(), note: z.string().max(300).optional() }),
  z.object({ action: z.literal("transfer"), itemId: z.string(), fromLocationId: z.string(), toLocationId: z.string(), quantity: num.positive(), note: z.string().max(300).optional() }),
  z.object({ action: z.literal("adjust"), itemId: z.string(), locationId: z.string(), countedQuantity: num.min(0), reason: z.string().trim().min(2).max(300) }),
  z.object({ action: z.literal("set_min"), itemId: z.string(), locationId: z.string(), minQuantity: num.min(0) }),
  z.object({ action: z.literal("fulfill_request"), requestId: z.string(), itemId: z.string(), fromLocationId: z.string(), quantity: num.positive() }),
  z.object({ action: z.literal("reject_request"), requestId: z.string(), reason: z.string().trim().max(300).optional() }),
]);

export async function POST(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  const a = parsed.data;
  const user = { id: auth.id, name: auth.name };

  try {
    switch (a.action) {
      case "create_item": {
        const { action: _a, ...data } = a;
        void _a;
        const item = await db.inventoryItem.create({ data: { ...data, minQuantity: data.minQuantity ?? 0 } });
        return NextResponse.json({ ok: true, id: item.id });
      }
      case "update_item": {
        const { action: _a, itemId, ...data } = a;
        void _a;
        await db.inventoryItem.update({ where: { id: itemId }, data });
        break;
      }
      case "receive":
        await receiveStock({ itemId: a.itemId, locationId: a.locationId, quantity: a.quantity, unitCost: a.unitCost ?? null, note: a.note, user });
        break;
      case "transfer":
        await transferStock({ itemId: a.itemId, fromLocationId: a.fromLocationId, toLocationId: a.toLocationId, quantity: a.quantity, note: a.note, user });
        break;
      case "adjust":
        await adjustStock({ itemId: a.itemId, locationId: a.locationId, countedQuantity: a.countedQuantity, reason: a.reason, user });
        break;
      case "set_min":
        await db.stockLevel.upsert({
          where: { itemId_locationId: { itemId: a.itemId, locationId: a.locationId } },
          create: { itemId: a.itemId, locationId: a.locationId, quantity: 0, minQuantity: a.minQuantity },
          update: { minQuantity: a.minQuantity },
        });
        break;
      case "fulfill_request": {
        const r = await db.inventoryRequest.findUnique({ where: { id: a.requestId }, include: { technician: { select: { name: true } } } });
        if (!r || r.status !== "PENDING") return NextResponse.json({ error: "Request not found or already handled." }, { status: 400 });
        const van = await vanFor(r.technicianId, r.technician.name);
        await transferStock({ itemId: a.itemId, fromLocationId: a.fromLocationId, toLocationId: van.id, quantity: a.quantity, note: `Request from ${r.technician.name ?? "technician"}${r.reason ? `: ${r.reason}` : ""}`, user });
        await db.inventoryRequest.update({ where: { id: r.id }, data: { status: "FULFILLED", itemId: a.itemId } });
        break;
      }
      case "reject_request":
        await db.inventoryRequest.update({ where: { id: a.requestId }, data: { status: "REJECTED", reason: a.reason ? `Rejected: ${a.reason}` : undefined } });
        break;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof StockError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
