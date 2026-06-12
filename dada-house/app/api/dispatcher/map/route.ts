import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;

  const technicians = await db.user.findMany({
    where: { role: "TECHNICIAN" },
    select: {
      id: true,
      name: true,
      image: true,
      phone: true,
      technicianLocations: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
      technicianAppointments: {
        where: { status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
        orderBy: { preferredDate: "asc" },
        take: 1,
        select: {
          id: true,
          appointmentNumber: true,
          service: true,
          address: true,
          techStatus: true,
          timeLog: { select: { enRouteAt: true, arrivedAt: true, startedAt: true } },
        },
      },
      technicianClockEntries: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    },
  });

  const mapped = technicians.map((t) => {
    const loc = t.technicianLocations[0];
    const job = t.technicianAppointments[0];
    const lastClock = t.technicianClockEntries[0];
    return {
      id: t.id,
      name: t.name,
      phone: t.phone,
      lastLat: loc?.lat ?? null,
      lastLng: loc?.lng ?? null,
      updatedAt: loc?.timestamp?.toISOString() ?? null,
      clockedIn: lastClock?.type === "IN",
      clockedInAt: lastClock?.type === "IN" ? lastClock.timestamp.toISOString() : null,
      activeJob: job
        ? {
            number: job.appointmentNumber,
            service: job.service,
            address: job.address,
            techStatus: job.techStatus,
            enRouteAt: job.timeLog?.enRouteAt?.toISOString() ?? null,
            arrivedAt: job.timeLog?.arrivedAt?.toISOString() ?? null,
            startedAt: job.timeLog?.startedAt?.toISOString() ?? null,
          }
        : null,
    };
  });

  return NextResponse.json({ technicians: mapped });
}
