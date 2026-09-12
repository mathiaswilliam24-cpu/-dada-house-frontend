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
    select: { phone: true, name: true, projectId: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customer = await findOrCreateCustomerByPhone(job.phone, { firstName: job.name });
  const projects = await db.project.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { appointments: true } } },
  });

  return NextResponse.json({ projects, currentProjectId: job.projectId });
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
  const { name, description, linkCurrentJob } = body;
  if (!name) return NextResponse.json({ error: "Project name is required" }, { status: 400 });

  const customer = await findOrCreateCustomerByPhone(job.phone, { firstName: job.name });
  const project = await db.project.create({
    data: { customerId: customer.id, name, description: description || null },
  });

  if (linkCurrentJob) {
    await db.appointment.update({ where: { id }, data: { projectId: project.id } });
  }

  return NextResponse.json({ project }, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const job = await db.appointment.findFirst({
    where: { id, technicianId: auth.role === "ADMIN" ? undefined : auth.id },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { projectId } = await req.json();
  await db.appointment.update({ where: { id }, data: { projectId: projectId || null } });

  return NextResponse.json({ success: true });
}
