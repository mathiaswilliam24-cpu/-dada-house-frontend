import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Multi-location stock: one warehouse + one van per technician. Every change is a
 * StockMovement (audit trail) applied to StockLevel in the same transaction.
 */

type Tx = Prisma.TransactionClient;
type Who = { id?: string | null; name?: string | null };

export class StockError extends Error {}

export async function ensureLocations() {
  const wh = await db.stockLocation.findFirst({ where: { kind: "WAREHOUSE" } });
  if (!wh) await db.stockLocation.create({ data: { name: "Warehouse", kind: "WAREHOUSE" } });
  const techs = await db.user.findMany({ where: { role: "TECHNICIAN" }, select: { id: true, name: true, technicianProfile: { select: { isActive: true } } } });
  const vans = await db.stockLocation.findMany({ where: { kind: "VAN" }, select: { technicianId: true } });
  const missing = techs.filter((t) => t.technicianProfile?.isActive !== false && !vans.some((v) => v.technicianId === t.id));
  for (const t of missing) {
    await db.stockLocation.create({ data: { name: `${t.name?.trim() || "Technician"}'s van`, kind: "VAN", technicianId: t.id } }).catch(() => {});
  }
}

export async function vanFor(technicianId: string, name?: string | null) {
  const v = await db.stockLocation.findUnique({ where: { technicianId } });
  if (v) return v;
  return db.stockLocation.create({ data: { name: `${name?.trim() || "Technician"}'s van`, kind: "VAN", technicianId } });
}

async function bump(tx: Tx, itemId: string, locationId: string, delta: number) {
  // Upsert + atomic increment so concurrent movements can't lose updates.
  await tx.stockLevel.upsert({
    where: { itemId_locationId: { itemId, locationId } },
    create: { itemId, locationId, quantity: delta },
    update: { quantity: { increment: delta } },
  });
}

async function levelOf(tx: Tx, itemId: string, locationId: string) {
  const l = await tx.stockLevel.findUnique({ where: { itemId_locationId: { itemId, locationId } } });
  return l?.quantity ?? 0;
}

/** Stock arriving (supplier delivery) at a location. Updates the item's last unit cost. */
export async function receiveStock(i: { itemId: string; locationId: string; quantity: number; unitCost?: number | null; note?: string | null; user: Who }) {
  if (!(i.quantity > 0)) throw new StockError("Quantity must be more than 0.");
  return db.$transaction(async (tx) => {
    await bump(tx, i.itemId, i.locationId, i.quantity);
    if (i.unitCost != null) await tx.inventoryItem.update({ where: { id: i.itemId }, data: { unitCost: i.unitCost } });
    return tx.stockMovement.create({ data: { itemId: i.itemId, type: "RECEIVE", quantity: i.quantity, toLocationId: i.locationId, unitCost: i.unitCost ?? null, note: i.note ?? null, userId: i.user.id ?? null, userName: i.user.name ?? null } });
  });
}

/** Move stock between locations (e.g. warehouse → van). Can't move more than is there. */
export async function transferStock(i: { itemId: string; fromLocationId: string; toLocationId: string; quantity: number; note?: string | null; user: Who }) {
  if (!(i.quantity > 0)) throw new StockError("Quantity must be more than 0.");
  if (i.fromLocationId === i.toLocationId) throw new StockError("Pick two different locations.");
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"stock:" + i.itemId}))`;
    const have = await levelOf(tx, i.itemId, i.fromLocationId);
    if (have < i.quantity) throw new StockError(`Only ${have} in that location.`);
    await bump(tx, i.itemId, i.fromLocationId, -i.quantity);
    await bump(tx, i.itemId, i.toLocationId, i.quantity);
    return tx.stockMovement.create({ data: { itemId: i.itemId, type: "TRANSFER", quantity: i.quantity, fromLocationId: i.fromLocationId, toLocationId: i.toLocationId, note: i.note ?? null, userId: i.user.id ?? null, userName: i.user.name ?? null } });
  });
}

/** Physical count: sets the quantity at a location and records the difference. */
export async function adjustStock(i: { itemId: string; locationId: string; countedQuantity: number; reason: string; user: Who }) {
  if (i.countedQuantity < 0) throw new StockError("Count can't be negative.");
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"stock:" + i.itemId}))`;
    const have = await levelOf(tx, i.itemId, i.locationId);
    const diff = i.countedQuantity - have;
    if (diff === 0) return null;
    await bump(tx, i.itemId, i.locationId, diff);
    return tx.stockMovement.create({ data: { itemId: i.itemId, type: "ADJUST", quantity: diff, toLocationId: i.locationId, note: `Count ${have} → ${i.countedQuantity}: ${i.reason}`, userId: i.user.id ?? null, userName: i.user.name ?? null } });
  });
}

/**
 * A technician uses a part from their van on a job: records the JobPart (at the item's
 * unit cost) and takes it out of the van. The van may go below zero — the technician
 * did use the part; a negative count flags that the van needs a recount.
 */
export async function usePartFromVan(i: { appointmentId: string; itemId: string; quantity: number; technician: { id: string; name?: string | null }; notes?: string | null }) {
  if (!(i.quantity > 0)) throw new StockError("Quantity must be more than 0.");
  const item = await db.inventoryItem.findUnique({ where: { id: i.itemId } });
  if (!item || !item.isActive) throw new StockError("Part not found in the catalog.");
  const van = await vanFor(i.technician.id, i.technician.name);
  return db.$transaction(async (tx) => {
    await bump(tx, item.id, van.id, -i.quantity);
    await tx.stockMovement.create({ data: { itemId: item.id, type: "USE", quantity: -i.quantity, fromLocationId: van.id, appointmentId: i.appointmentId, unitCost: item.unitCost ?? null, userId: i.technician.id, userName: i.technician.name ?? null } });
    return tx.jobPart.create({
      data: {
        appointmentId: i.appointmentId, technicianId: i.technician.id, partName: item.name, partNumber: item.partNumber,
        quantity: Math.round(i.quantity), unitCost: item.unitCost ?? 0, totalCost: (item.unitCost ?? 0) * i.quantity,
        supplier: item.supplier, notes: i.notes ?? null, inventoryItemId: item.id, locationId: van.id,
      },
    });
  });
}

/** Removing a stock part from a job puts it back where it came from. */
export async function returnJobPart(partId: string, user: Who) {
  return db.$transaction(async (tx) => {
    const part = await tx.jobPart.findUnique({ where: { id: partId } });
    if (!part) throw new StockError("Part not found.");
    if (part.inventoryItemId && part.locationId) {
      await bump(tx, part.inventoryItemId, part.locationId, part.quantity);
      await tx.stockMovement.create({ data: { itemId: part.inventoryItemId, type: "RETURN", quantity: part.quantity, toLocationId: part.locationId, appointmentId: part.appointmentId, note: "Removed from job", userId: user.id ?? null, userName: user.name ?? null } });
    }
    await tx.jobPart.delete({ where: { id: partId } });
  });
}
