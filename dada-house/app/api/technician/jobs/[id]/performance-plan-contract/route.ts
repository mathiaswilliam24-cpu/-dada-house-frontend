import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { findOrCreateCustomerByPhone } from "@/lib/customers";
import crypto from "crypto";

export const dynamic = "force-dynamic";

/** Technician-initiated Performance Plan Contract, signed in person on the
 *  technician's device — unlike the dispatcher's "send a link" flow, no
 *  invite SMS/email goes out here since the customer is about to sign it
 *  live. Confirmation SMS/email still fire after signing + payment, same as
 *  the dispatcher-initiated path. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { planTypeId, numberOfSystems, systemTypes } = await req.json();
  if (!planTypeId) return NextResponse.json({ error: "planTypeId is required" }, { status: 400 });
  if (!numberOfSystems || numberOfSystems < 1) return NextResponse.json({ error: "numberOfSystems must be at least 1" }, { status: 400 });
  if (!Array.isArray(systemTypes) || systemTypes.length === 0) return NextResponse.json({ error: "At least one system type is required" }, { status: 400 });
  if (systemTypes.length > 2) return NextResponse.json({ error: "At most 2 system types can be selected" }, { status: 400 });

  const job = await db.appointment.findFirst({
    where: { id, technicianId: auth.role === "ADMIN" ? undefined : auth.id },
    select: { name: true, phone: true, email: true },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const planType = await db.maintenancePlanType.findUnique({ where: { id: planTypeId } });
  if (!planType) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const customer = await findOrCreateCustomerByPhone(job.phone, { firstName: job.name, email: job.email });

  const token = crypto.randomBytes(32).toString("hex");
  const contract = await db.maintenanceContract.create({
    data: {
      customerId: customer.id,
      planTypeId,
      token,
      numberOfSystems,
      systemTypes,
      repName: auth.name || undefined,
      sentById: auth.id,
    },
  });

  return NextResponse.json({ contract }, { status: 201 });
}
