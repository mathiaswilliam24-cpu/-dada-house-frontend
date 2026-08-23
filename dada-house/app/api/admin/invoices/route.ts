import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { generateAppointmentNumber } from "@/lib/utils";
import crypto from "crypto";

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

  const body = await req.json();
  const { notes, dueDate, status: reqStatus } = body;

  const invoiceStatus = reqStatus === "SENT" ? "SENT" : "DRAFT";

  // Compute amount from lineItems if provided
  let amount: number = parseFloat(body.amount ?? "0");
  if (body.lineItems && typeof body.lineItems === "object") {
    const meta = body.lineItems as { taxEnabled?: boolean; taxRate?: number; items?: { rate: number; qty: number }[] };
    if (Array.isArray(meta.items) && meta.items.length > 0) {
      const sub = meta.items.reduce((s: number, i: { rate: number; qty: number }) => s + (i.rate || 0) * (i.qty || 1), 0);
      const tax = meta.taxEnabled !== false ? sub * ((meta.taxRate ?? 8.25) / 100) : 0;
      amount = sub + tax;
    }
  }

  if (!amount || amount <= 0) return NextResponse.json({ error: "Amount is required" }, { status: 400 });

  let appointmentId: string = body.appointmentId;

  // If no appointmentId supplied, create a minimal appointment from customer info
  if (!appointmentId) {
    const { customerName, customerPhone, customerEmail, customerAddress, customerCity, service, userId } = body;
    if (!service) {
      return NextResponse.json({ error: "Service is required" }, { status: 400 });
    }
    const appt = await db.appointment.create({
      data: {
        appointmentNumber: generateAppointmentNumber(),
        name: customerName || "Client",
        phone: customerPhone || "",
        email: customerEmail || "",
        address: customerAddress || "",
        city: customerCity || "Houston",
        service,
        status: "CONFIRMED",
        source: "admin-invoice",
        ...(userId ? { userId } : {}),
      },
    });
    appointmentId = appt.id;
  }

  const existing = await db.invoice.findUnique({ where: { appointmentId } });
  if (existing) {
    return NextResponse.json({ error: "An invoice already exists for this appointment" }, { status: 409 });
  }

  const paymentToken = crypto.randomBytes(32).toString("hex");

  const invoice = await db.invoice.create({
    data: {
      appointmentId,
      amount,
      status: invoiceStatus,
      notes: notes || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      paymentToken,
      ...(body.lineItems ? { lineItems: body.lineItems } : {}),
    },
    include: {
      appointment: {
        select: { id: true, appointmentNumber: true, name: true, phone: true, service: true, email: true },
      },
    },
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
