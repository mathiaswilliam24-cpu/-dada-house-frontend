import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date");
  if (!dateStr) return NextResponse.json({ busyTimes: [] });

  const date = new Date(dateStr);
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

  // Check both appointments and installation orders for that day
  const [appointments, orders] = await Promise.all([
    db.appointment.findMany({
      where: {
        preferredDate: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["CANCELLED"] },
        preferredTime: { not: null },
      },
      select: { preferredTime: true },
    }),
    db.order.findMany({
      where: {
        installationDate: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["CANCELLED"] },
        installationTime: { not: null },
      },
      select: { installationTime: true },
    }),
  ]);

  const busyTimes = [
    ...appointments.map(a => a.preferredTime).filter(Boolean),
    ...orders.map(o => o.installationTime).filter(Boolean),
  ] as string[];

  // Each slot can hold max 2 technicians
  const slotCount: Record<string, number> = {};
  for (const t of busyTimes) slotCount[t] = (slotCount[t] ?? 0) + 1;
  const fullSlots = Object.entries(slotCount).filter(([, c]) => c >= 2).map(([t]) => t);

  return NextResponse.json({ busyTimes: fullSlots });
}
