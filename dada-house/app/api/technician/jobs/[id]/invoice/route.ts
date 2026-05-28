import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { amount, notes, lineItems, dueDate } = await req.json();

  if (!amount) {
    return NextResponse.json({ error: "Amount is required" }, { status: 400 });
  }

  const invoice = await db.invoice.upsert({
    where: { appointmentId: id },
    create: {
      appointmentId: id,
      amount: parseFloat(amount),
      status: "DRAFT",
      notes: notes ?? null,
      lineItems: lineItems ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    update: {
      amount: parseFloat(amount),
      notes: notes ?? undefined,
      lineItems: lineItems ?? undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    },
  });

  return NextResponse.json({ invoice });
}
