import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fillContractHtml } from "@/lib/maintenance-contract";

export const dynamic = "force-dynamic";

/** Public, token-gated — the customer viewing/signing/paying their contract has no account. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const contract = await db.maintenanceContract.findUnique({
    where: { token },
    select: {
      id: true, status: true, systemMakeModel: true, systemAge: true, numberOfSystems: true, systemTypes: true,
      billingInterval: true, autoRenew: true, membershipNumber: true, paidAt: true, membershipStartDate: true, renewalDate: true,
      annualTotal: true, monthlyTotal: true, firstName: true, lastName: true, email: true, phone: true,
      customerSignatureUrl: true, signedAt: true,
      customer: { select: { firstName: true, lastName: true, phone: true, email: true, address: true, city: true, state: true, zipCode: true } },
      planType: { select: { name: true, monthlyPrice: true, annualPrice: true, contractHtml: true } },
      properties: { orderBy: { createdAt: "asc" }, select: { id: true, nickname: true, address: true, apt: true, city: true, state: true, zipCode: true, systemCount: true } },
      hvacSystems: { select: { propertyId: true, nickname: true, coolingType: true, heatingType: true, brand: true, model: true, age: true } },
    },
  });
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  const { customerSignatureUrl, ...rest } = contract;
  return NextResponse.json({
    contract: {
      ...rest,
      customerSigned: !!customerSignatureUrl,
      planType: { ...contract.planType, contractHtml: fillContractHtml(contract.planType.contractHtml, contract) },
    },
  });
}
