import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const schema = z.object({
  firstName:       z.string().min(1),
  lastName:        z.string().min(1),
  phone:           z.string().min(10),
  email:           z.string().email().optional().or(z.literal("")),
  address:         z.string().min(1),
  city:            z.string().min(1),
  state:           z.string().min(2),
  zipCode:         z.string().min(5),
  planTypeId:      z.string().min(1),
  billingInterval: z.enum(["monthly", "annual"]),
  numberOfSystems: z.number().int().min(1).max(10),
  repName:         z.string().optional(),
  notes:           z.string().optional(),
});

function generateMembershipNumber() {
  const year = new Date().getFullYear();
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `MP-${year}-${rand}`;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const {
    firstName, lastName, phone, email,
    address, city, state, zipCode,
    planTypeId, billingInterval, numberOfSystems, repName,
  } = parsed.data;

  const planType = await db.maintenancePlanType.findUnique({ where: { id: planTypeId } });
  if (!planType) return NextResponse.json({ error: "Plan type not found" }, { status: 404 });

  // Find or create Customer
  let customer = await db.customer.findFirst({
    where: { phone: { in: [phone, phone.replace(/\D/g, "")] } },
  });

  if (!customer) {
    customer = await db.customer.create({
      data: { firstName, lastName, phone, email: email || null },
    });
  }

  const annualTotal  = billingInterval === "annual"  ? planType.annualPrice  * numberOfSystems : null;
  const monthlyTotal = billingInterval === "monthly" ? planType.monthlyPrice * numberOfSystems : null;
  const now = new Date();
  const renewal = new Date(now);
  renewal.setFullYear(renewal.getFullYear() + 1);

  const contract = await db.maintenanceContract.create({
    data: {
      customerId:          customer.id,
      planTypeId,
      token:               randomBytes(16).toString("hex"),
      status:              "ACTIVE",
      selfEnrolled:        false,
      membershipNumber:    generateMembershipNumber(),
      firstName,
      lastName,
      email:               email || null,
      phone,
      numberOfSystems,
      billingInterval,
      annualTotal,
      monthlyTotal,
      repName:             repName || null,
      membershipStartDate: now,
      renewalDate:         renewal,
      paidAt:              now,
      properties: {
        create: [{
          address, city, state, zipCode,
          systemCount: numberOfSystems,
        }],
      },
    },
  });

  return NextResponse.json({
    success:          true,
    contractId:       contract.id,
    membershipNumber: contract.membershipNumber,
  });
}
