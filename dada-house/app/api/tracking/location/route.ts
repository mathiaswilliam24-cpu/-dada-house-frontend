import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getSupabaseClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { lat, lng, heading, speed, appointmentId } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    const location = await db.technicianLocation.create({
      data: {
        userId: auth.id,
        lat,
        lng,
        heading: heading ?? null,
        speed: speed ?? null,
      },
    });

    if (appointmentId) {
      const supabase = getSupabaseClient();
      await supabase.channel(`tracking:${appointmentId}`).send({
        type: "broadcast",
        event: "location",
        payload: { lat, lng, heading, speed, timestamp: location.timestamp },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[tracking/location POST]", error);
    return NextResponse.json({ error: "Failed to save location" }, { status: 500 });
  }
}
