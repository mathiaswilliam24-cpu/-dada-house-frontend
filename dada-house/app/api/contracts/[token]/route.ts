import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Public, token-gated — the customer viewing/signing/paying their contract has no account. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const contract = await db.maintenanceContract.findUnique({
    where: { token },
    include: {
      customer: { select: { firstName: true, lastName: true, phone: true, email: true, address: true, city: true, state: true, zipCode: true } },
      planType: { select: { name: true, monthlyPrice: true, annualPrice: true, contractHtml: true } },
    },
  });
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  return NextResponse.json({ contract });
}
