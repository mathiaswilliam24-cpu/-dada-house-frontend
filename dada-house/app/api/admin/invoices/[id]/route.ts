import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      appointment: {
        select: { name: true, phone: true, email: true, address: true, city: true, service: true, appointmentNumber: true },
      },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invoice });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { status, amount, notes, pdfUrl, paidAt, dueDate, lineItems, paymentMethod } = body;

  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (amount !== undefined) data.amount = parseFloat(amount);
  if (notes !== undefined) data.notes = notes;
  if (pdfUrl !== undefined) data.pdfUrl = pdfUrl;
  if (paidAt) data.paidAt = new Date(paidAt);
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
  if (lineItems !== undefined) data.lineItems = lineItems;
  if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;

  const invoice = await db.invoice.update({ where: { id }, data });
  return NextResponse.json({ invoice });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await db.invoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
