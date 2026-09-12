import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type LineItem = { desc: string; rate: number; qty: number; amount: number };

/** Quick-add a price-book (or custom) item to an existing estimate/invoice's
 *  line items — used by the job-scoped "Add Items" category browser. Keeps
 *  the existing tax/discount delta between subtotal and total rather than
 *  recomputing it, since the full editor (linked from the invoice page) is
 *  the place to fine-tune tax and discounts. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const estimate = await db.estimate.findFirst({ where: { id, technicianId: auth.id } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { desc, rate, qty } = body;
  if (!desc || rate == null) return NextResponse.json({ error: "desc and rate are required" }, { status: 400 });

  const quantity = qty || 1;
  const amount = rate * quantity;
  const newItem: LineItem = { desc, rate, qty: quantity, amount };

  const existingItems = (estimate.lineItems as LineItem[] | null) ?? [];
  const lineItems = [...existingItems, newItem];
  const subtotal = estimate.subtotal + amount;
  const total = estimate.total + amount;

  const updated = await db.estimate.update({
    where: { id },
    data: { lineItems, subtotal, total },
  });

  return NextResponse.json({ estimate: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const estimate = await db.estimate.findFirst({ where: { id, technicianId: auth.id } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { index } = await req.json();
  const existingItems = (estimate.lineItems as LineItem[] | null) ?? [];
  if (index == null || index < 0 || index >= existingItems.length) {
    return NextResponse.json({ error: "Invalid item index" }, { status: 400 });
  }

  const removed = existingItems[index];
  const lineItems = existingItems.filter((_, i) => i !== index);
  const subtotal = estimate.subtotal - removed.amount;
  const total = estimate.total - removed.amount;

  const updated = await db.estimate.update({
    where: { id },
    data: { lineItems, subtotal, total },
  });

  return NextResponse.json({ estimate: updated });
}
