import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const items = await db.inventoryItem.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const lowStock = items.filter((i) => i.quantity <= i.minQuantity);

  return NextResponse.json({ items, lowStock });
}
