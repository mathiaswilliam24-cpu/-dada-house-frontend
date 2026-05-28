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
        take: 1,
        select: {
          id: true,
          appointmentNumber: true,
          service: true,
          address: true,
          techStatus: true,
        },
      },
    },
  });

  const mapped = technicians.map((t) => {
    const loc = t.technicianLocations[0];
    const job = t.technicianAppointments[0];
    return {
      id: t.id,
      name: t.name,
      image: t.image,
      phone: t.phone,
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      updatedAt: loc?.timestamp?.toISOString() ?? null,
      activeJob: job ? `${job.appointmentNumber} — ${job.service}` : null,
    };
  });

  return NextResponse.json({ technicians: mapped });
}
