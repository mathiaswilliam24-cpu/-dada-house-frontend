import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const [appointmentInvoices, technicianInvoices] = await Promise.all([
    db.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        appointment: {
          select: { id: true, appointmentNumber: true, name: true, phone: true, service: true, email: true },
        },
      },
    }),
    db.estimate.findMany({
      where: { isInvoice: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, estimateNumber: true, clientName: true, clientEmail: true,
        total: true, status: true, paidAt: true, sentAt: true, sentByName: true,
        paymentMethod: true, createdAt: true, isInvoice: true,
        technician: { select: { name: true } },
      },
    }),
  ]);

  // Normalize technician invoices to a compatible shape
  const normalizedTechInvoices = technicianInvoices.map((inv) => ({
    id: inv.id,
    amount: inv.total,
    status: inv.paidAt ? "PAID" : inv.sentAt ? "SENT" : "DRAFT",
    paidAt: inv.paidAt?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(),
    dueDate: null,
    pdfUrl: null,
    notes: null,
    sentByName: inv.sentByName ?? inv.technician?.name ?? null,
    paymentMethod: inv.paymentMethod ?? null,
    isTechnicianInvoice: true,
    estimateNumber: inv.estimateNumber,
    appointment: {
      id: "",
      appointmentNumber: inv.estimateNumber,
      name: inv.clientName,
      phone: "",
      service: "Direct Invoice",
      email: inv.clientEmail,
    },
  }));

  const invoices = [...appointmentInvoices, ...normalizedTechInvoices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { appointmentId, amount, notes, dueDate } = await req.json();
  if (!appointmentId || !amount) {
    return NextResponse.json({ error: "appointmentId and amount are required" }, { status: 400 });
  }

  const existing = await db.invoice.findUnique({ where: { appointmentId } });
  if (existing) {
    return NextResponse.json({ error: "An invoice already exists for this appointment" }, { status: 409 });
  }

  const invoice = await db.invoice.create({
    data: {
      appointmentId,
      amount: parseFloat(amount),
      status: "DRAFT",
      notes: notes || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: {
      appointment: {
        select: { id: true, appointmentNumber: true, name: true, phone: true, service: true, email: true },
      },
    },
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
