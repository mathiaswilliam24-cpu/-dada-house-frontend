import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { status, amount, notes, pdfUrl, paidAt, dueDate } = body;

  const data: Record<string, unknown> = {};
  if (status) data.status = status;
  if (amount !== undefined) data.amount = parseFloat(amount);
  if (notes !== undefined) data.notes = notes;
  if (pdfUrl !== undefined) data.pdfUrl = pdfUrl;
  if (paidAt) data.paidAt = new Date(paidAt);
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;

  const invoice = await db.invoice.update({ where: { id }, data });
  return NextResponse.json({ invoice });
}
