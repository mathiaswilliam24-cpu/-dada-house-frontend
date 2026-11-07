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

  const rawId = await params;
  const id = decodeURIComponent(rawId.id);

  // ── Helper: build response from a Customer record (maintenance-plan enrollees) ─
  async function buildFromCustomer(phone: string, displayId: string) {
    const customer = await db.customer.findFirst({
      where: { OR: [{ phone }, { phone: phone.replace(/\D/g, "") }] },
      include: {
        appointments: {
          orderBy: { createdAt: "desc" },
          include: {
            invoice: { select: { id: true, amount: true, status: true, paidAt: true } },
            technician: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!customer) return null;
    return {
      id: displayId,
      name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
      email: customer.email ?? "",
      phone: customer.phone,
      role: "CLIENT",
      createdAt: customer.createdAt.toISOString(),
      appointments: customer.appointments.map(a => ({
        id: a.id,
        appointmentNumber: a.appointmentNumber,
        service: a.service,
        subservice: a.subservice,
        status: a.status,
        notes: a.notes,
        photos: a.photos,
        createdAt: a.createdAt.toISOString(),
        preferredDate: a.preferredDate?.toISOString() ?? null,
        preferredTime: a.preferredTime,
        address: a.address,
        city: a.city,
        description: a.description,
        technician: a.technician ? { id: a.technician.id, name: a.technician.name } : null,
        invoice: a.invoice ? { id: a.invoice.id, amount: a.invoice.amount, status: a.invoice.status, paidAt: a.invoice.paidAt?.toISOString() ?? null } : null,
      })),
      reviews: [],
      properties: customer.address ? [{ id: customer.id, address: customer.address, city: customer.city ?? "", zipCode: customer.zipCode ?? "", type: "Residential", sqft: null }] : [],
      servicePlans: [],
    };
  }

  // ── Walk-in / phone client (no registered account) ──────────────────────
  if (id.startsWith("appt:")) {
    const key = id.slice(5);
    const appts = await db.appointment.findMany({
      where: { userId: null, OR: [{ phone: key }, { email: key }, { name: key }] },
      orderBy: { createdAt: "desc" },
      include: {
        invoice: { select: { id: true, amount: true, status: true, paidAt: true } },
        technician: { select: { id: true, name: true } },
      },
    });
    if (appts.length > 0) {
      const first = appts[0];
      return NextResponse.json({
        user: {
          id,
          name: first.name,
          email: first.email ?? "",
          phone: first.phone ?? null,
          role: "CLIENT",
          createdAt: first.createdAt.toISOString(),
          appointments: appts.map(a => ({
            id: a.id, appointmentNumber: a.appointmentNumber, service: a.service,
            subservice: a.subservice, status: a.status, notes: a.notes, photos: a.photos,
            createdAt: a.createdAt.toISOString(), preferredDate: a.preferredDate?.toISOString() ?? null,
            preferredTime: a.preferredTime, address: a.address, city: a.city, description: a.description,
            technician: a.technician ? { id: a.technician.id, name: a.technician.name } : null,
            invoice: a.invoice ? { id: a.invoice.id, amount: a.invoice.amount, status: a.invoice.status, paidAt: a.invoice.paidAt?.toISOString() ?? null } : null,
          })),
          reviews: [], properties: [], servicePlans: [],
        },
      });
    }
    // No appointments — may be a maintenance-plan-only enrollee in Customer table
    const fromCustomer = await buildFromCustomer(key, id);
    if (fromCustomer) return NextResponse.json({ user: fromCustomer });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── Phone number in URL → look up Customer record ─────────────────────────
  if (id.startsWith("+") || /^\d{10,}$/.test(id)) {
    const fromCustomer = await buildFromCustomer(id, `appt:${id}`);
    if (fromCustomer) return NextResponse.json({ user: fromCustomer });
  }

  // ── Registered user ───────────────────────────────────────────────────────
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      appointments: {
        orderBy: { createdAt: "desc" },
        include: {
          invoice: { select: { id: true, amount: true, status: true, paidAt: true } },
          technician: { select: { id: true, name: true } },
        },
      },
      reviews: { orderBy: { createdAt: "desc" } },
      properties: { orderBy: { createdAt: "desc" } },
      servicePlans: {
        include: { plan: { select: { name: true, price: true, interval: true } } },
        orderBy: { createdAt: "desc" },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
        take: 10,
      },
      // Customer record links dispatcher appointments (via customerId)
      customerRecord: {
        select: {
          id: true,
          appointments: {
            orderBy: { createdAt: "desc" },
            include: {
              invoice: { select: { id: true, amount: true, status: true, paidAt: true } },
              technician: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Merge dispatcher appointments (via Customer record) with direct user appointments
  // Deduplicate by appointment id so an appointment linked both ways only appears once
  const { customerRecord, ...userWithoutCustomer } = user as typeof user & { customerRecord?: { id: string; appointments: typeof user.appointments } | null };
  const directIds = new Set(user.appointments.map((a) => a.id));
  const extraAppts = (customerRecord?.appointments ?? []).filter((a) => !directIds.has(a.id));
  const mergedAppointments = [...user.appointments, ...extraAppts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({ user: { ...userWithoutCustomer, appointments: mergedAppointments } });
}
