import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { action } = await req.json();
  if (action !== "in" && action !== "out") {
    return NextResponse.json({ error: "action must be 'in' or 'out'" }, { status: 400 });
  }

  const log = await db.maintenanceLog.create({
    data: {
      userId: auth.id,
      technicianId: auth.id,
      notes: `Clock ${action} at ${new Date().toISOString()}`,
    },
  });

  return NextResponse.json({ success: true, log, action, timestamp: new Date().toISOString() });
}
