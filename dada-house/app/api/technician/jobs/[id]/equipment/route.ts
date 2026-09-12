import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { findOrCreateCustomerByPhone } from "@/lib/customers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const job = await db.appointment.findFirst({
    where: { id, technicianId: auth.role === "ADMIN" ? undefined : auth.id },
    select: { phone: true, name: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customer = await findOrCreateCustomerByPhone(job.phone, { firstName: job.name });
  const equipment = await db.equipment.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ equipment });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const job = await db.appointment.findFirst({
    where: { id, technicianId: auth.role === "ADMIN" ? undefined : auth.id },
    select: { phone: true, name: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { type, makeModel, serialNumber, installDate, age, location, notes } = body;
  if (!type) return NextResponse.json({ error: "Equipment type is required" }, { status: 400 });

  const customer = await findOrCreateCustomerByPhone(job.phone, { firstName: job.name });
  const equipment = await db.equipment.create({
    data: {
      customerId: customer.id,
      technicianId: auth.id,
      type,
      makeModel: makeModel || null,
      serialNumber: serialNumber || null,
      installDate: installDate ? new Date(installDate) : null,
      age: age || null,
      location: location || null,
      notes: notes || null,
    },
  });

  return NextResponse.json({ equipment }, { status: 201 });
}
