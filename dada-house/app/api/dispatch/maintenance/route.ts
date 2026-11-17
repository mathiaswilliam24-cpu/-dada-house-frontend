import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { syncMaintenanceVisits, visitState, SEASONS, type Season } from "@/lib/maintenance-visits";

export const dynamic = "force-dynamic";

/** Maintenance visit scheduler: every included tune-up of covered memberships, with its state. */
export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;

  await syncMaintenanceVisits();
  const now = new Date();
  const visits = await db.maintenanceVisit.findMany({
    where: { OR: [{ status: { in: ["DUE", "SCHEDULED"] } }, { updatedAt: { gte: new Date(now.getTime() - 400 * 86400000) } }] },
    orderBy: [{ windowEnd: "asc" }],
    include: {
      contract: {
        select: {
          id: true, status: true, membershipNumber: true, numberOfSystems: true,
          planType: { select: { name: true } },
          customer: { select: { id: true, firstName: true, lastName: true, phone: true, address: true, city: true, zipCode: true } },
          properties: { select: { address: true, city: true, zipCode: true }, take: 1 },
          _count: { select: { hvacSystems: true } },
        },
      },
      appointment: { select: { id: true, appointmentNumber: true, scheduledStart: true, technician: { select: { name: true } }, status: true } },
    },
    take: 1000,
  });

  const rows = visits.map((v) => {
    const c = v.contract;
    const prop = c.properties[0];
    return {
      id: v.id,
      state: visitState(v, now),
      visitNumber: v.visitNumber,
      season: v.season,
      seasonLabel: SEASONS[v.season as Season]?.label ?? v.season,
      windowStart: v.windowStart.toISOString(),
      windowEnd: v.windowEnd.toISOString(),
      completedAt: v.completedAt?.toISOString() ?? null,
      notes: v.notes,
      contractStatus: c.status,
      membershipNumber: c.membershipNumber,
      plan: c.planType.name,
      systems: Math.max(1, c._count.hvacSystems || c.numberOfSystems || 1),
      customer: {
        id: c.customer.id,
        name: [c.customer.firstName, c.customer.lastName].filter(Boolean).join(" "),
        phone: c.customer.phone,
        address: [prop?.address ?? c.customer.address, prop?.city ?? c.customer.city, prop?.zipCode ?? c.customer.zipCode].filter(Boolean).join(", "),
      },
      job: v.appointment ? {
        id: v.appointment.id, number: v.appointment.appointmentNumber, status: v.appointment.status,
        scheduledStart: v.appointment.scheduledStart?.toISOString() ?? null, technician: v.appointment.technician?.name ?? null,
      } : null,
    };
  });

  const counts: Record<string, number> = { OVERDUE: 0, DUE_NOW: 0, UPCOMING: 0, SCHEDULED: 0, COMPLETED: 0, SKIPPED: 0 };
  rows.forEach((r) => counts[r.state]++);
  const members = await db.maintenanceContract.count({ where: { status: { in: ["ACTIVE", "PAID", "PAST_DUE"] } } });
  return NextResponse.json({ visits: rows, counts, members });
}
