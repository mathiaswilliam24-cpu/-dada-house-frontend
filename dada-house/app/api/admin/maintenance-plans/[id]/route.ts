import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Pricing is intentionally not editable here — changing a live Stripe Price
 *  after customers have subscribed needs careful proration handling. Create
 *  a new plan instead if pricing needs to change. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { name, contractHtml, isActive, sortOrder } = await req.json();

  const plan = await db.maintenancePlanType.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(contractHtml !== undefined && { contractHtml }),
      ...(isActive !== undefined && { isActive }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });
  return NextResponse.json({ plan });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(_req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await db.maintenancePlanType.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
