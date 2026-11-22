import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { myEstimateInvoicesWhere } from "@/lib/portal-access";
import { invoiceGrossTotal } from "@/lib/bill-amounts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  // Technician/office invoices of this client (by email, or by his linked customer record's phone/jobs)
  const techInvoices = await db.estimate.findMany({
    where: await myEstimateInvoicesWhere(auth.id, auth.email),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      estimateNumber: true,
      clientName: true,
      total: true,
      lineItems: true,
      paidAt: true,
      sentAt: true,
      paymentToken: true,
      paymentMethod: true,
      templateColor: true,
      createdAt: true,
      sentByName: true,
      loyaltyDiscount: true,
      technician: { select: { name: true } },
    },
  });

  // Appointment-based invoices for this user's appointments
  const apptInvoices = await db.invoice.findMany({
    where: {
      appointment: { userId: auth.id },
    },
    orderBy: { createdAt: "desc" },
    include: {
      appointment: { select: { service: true, appointmentNumber: true } },
    },
  });

  const techNormalized = techInvoices.map((inv) => ({
    id: inv.id,
    type: "tech" as const,
    number: inv.estimateNumber,
    amount: Math.round((inv.total - (inv.paidAt ? 0 : inv.loyaltyDiscount)) * 100) / 100,
    loyaltyDiscount: inv.loyaltyDiscount,
    status: inv.paidAt ? "PAID" : inv.sentAt ? "SENT" : "DRAFT",
    paidAt: inv.paidAt?.toISOString() ?? null,
    paymentToken: inv.paymentToken,
    paymentMethod: inv.paymentMethod,
    templateColor: inv.templateColor,
    createdAt: inv.createdAt.toISOString(),
    sentByName: inv.sentByName ?? inv.technician?.name ?? "DADA HOUSE",
    description: "Service Invoice",
    lineItems: inv.lineItems,
  }));

  const apptNormalized = apptInvoices.map((inv) => ({
    id: inv.id,
    type: "appointment" as const,
    number: inv.appointment.appointmentNumber,
    amount: Math.round((invoiceGrossTotal(inv.lineItems, inv.appointment.service, inv.amount) - (inv.paidAt ? 0 : inv.loyaltyDiscount)) * 100) / 100,
    loyaltyDiscount: inv.loyaltyDiscount,
    status: inv.status,
    paidAt: inv.paidAt?.toISOString() ?? null,
    paymentToken: inv.status === "PAID" ? null : inv.paymentToken,
    paymentMethod: null,
    templateColor: "#1B3FA8",
    createdAt: inv.createdAt.toISOString(),
    sentByName: "DADA HOUSE",
    description: inv.appointment.service,
    lineItems: inv.lineItems ?? [],
  }));

  const invoices = [...techNormalized, ...apptNormalized].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const unpaid = invoices.filter((i) => i.status !== "PAID");
  const totalOwed = unpaid.reduce((s, i) => s + i.amount, 0);

  return NextResponse.json({ invoices, totalOwed });
}
