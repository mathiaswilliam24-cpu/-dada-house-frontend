import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { jobPartSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const parts = await db.jobPart.findMany({
    where: { appointmentId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ parts });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const result = jobPartSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { quantity, unitCost, ...rest } = result.data;
  const totalCost = quantity * unitCost;

  const part = await db.jobPart.create({
    data: {
      appointmentId: id,
      technicianId: auth.id,
      quantity,
      unitCost,
      totalCost,
      ...rest,
    },
  });

  return NextResponse.json({ part });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const partId = url.searchParams.get("partId");
  if (!partId) return NextResponse.json({ error: "partId required" }, { status: 400 });

  const part = await db.jobPart.findFirst({
    where: { id: partId, technicianId: auth.role === "ADMIN" ? undefined : auth.id },
  });
  if (!part) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.jobPart.delete({ where: { id: partId } });
  return NextResponse.json({ ok: true });
}
