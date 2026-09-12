import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/customers";
import { CustomerType } from "@/lib/generated/prisma/enums";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const [customer, invoices] = await Promise.all([
    db.customer.findUnique({
      where: { id },
      include: {
        appointments: { orderBy: { createdAt: "desc" }, take: 25 },
        calls: { orderBy: { startedAt: "desc" }, take: 25, include: { agent: { select: { name: true } }, appointment: { select: { id: true, appointmentNumber: true, service: true } }, recording: true, voicemail: true } },
        messageThreads: { orderBy: { lastMessageAt: "desc" }, include: { messages: { orderBy: { createdAt: "asc" } } } },
        doNotContact: true,
        user: { select: { email: true } },
        maintenanceContracts: { orderBy: { createdAt: "desc" }, include: { planType: { select: { name: true, monthlyPrice: true, annualPrice: true } } } },
      },
    }),
    db.invoice.findMany({
      where: { appointment: { customerId: id } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, amount: true, status: true, createdAt: true, paymentToken: true,
        appointment: { select: { appointmentNumber: true, service: true } },
      },
    }),
  ]);

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Fall back to the linked registered-account email when this call-center
  // record has none of its own (e.g. added via /admin/customers separately).
  const email = customer.email || customer.user?.email || null;

  return NextResponse.json({ customer: { ...customer, email, invoices } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { firstName, lastName, phone, secondaryPhone, email, address, city, state, zipCode, customerType, preferredLanguage, tags, notes } = body;

  const customer = await db.customer.update({
    where: { id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(phone !== undefined && { phone: normalizePhone(phone) }),
      ...(secondaryPhone !== undefined && { secondaryPhone: secondaryPhone ? normalizePhone(secondaryPhone) : null }),
      ...(email !== undefined && { email }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(zipCode !== undefined && { zipCode }),
      ...(customerType !== undefined && { customerType: customerType as CustomerType }),
      ...(preferredLanguage !== undefined && { preferredLanguage }),
      ...(Array.isArray(tags) && { tags }),
      ...(notes !== undefined && { notes }),
    },
  }).catch(() => null);

  if (!customer) return NextResponse.json({ error: "Customer not found or update failed" }, { status: 404 });

  return NextResponse.json({ customer });
}
