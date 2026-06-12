import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const lastEntry = await db.technicianClockEntry.findFirst({
    where: { userId: auth.id },
    orderBy: { timestamp: "desc" },
  });

  return NextResponse.json({ clockedIn: lastEntry?.type === "IN", lastEntry });
}

export async function POST(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { action, lat, lng, address } = await req.json();
  if (action !== "in" && action !== "out") {
    return NextResponse.json({ error: "action must be 'in' or 'out'" }, { status: 400 });
  }

  const entry = await db.technicianClockEntry.create({
    data: {
      userId: auth.id,
      type: action === "in" ? "IN" : "OUT",
      lat: typeof lat === "number" ? lat : null,
      lng: typeof lng === "number" ? lng : null,
      address: typeof address === "string" ? address : null,
    },
  });

  return NextResponse.json({ success: true, entry });
}
