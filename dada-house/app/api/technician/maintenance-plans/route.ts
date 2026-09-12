import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Active maintenance plans, technician-facing — used by the "Add Items" →
 *  Comfort Protection Plans category on a job's invoice. */
export async function GET(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const plans = await db.maintenancePlanType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, monthlyPrice: true, annualPrice: true },
  });
  return NextResponse.json({ plans });
}
