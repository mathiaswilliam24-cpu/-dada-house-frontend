import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Active plan list for the "send a maintenance contract" picker on a customer's profile. */
export async function GET(req: NextRequest) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const plans = await db.maintenancePlanType.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, monthlyPrice: true, annualPrice: true },
  });
  return NextResponse.json({ plans });
}
