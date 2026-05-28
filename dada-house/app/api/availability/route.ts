import { NextRequest, NextResponse } from "next/server";
import { getBusySlots, ALL_SLOTS } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const slot = searchParams.get("slot");

  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }

  const busySlots = await getBusySlots(date);
  const availableSlots = ALL_SLOTS.filter((s) => !busySlots.includes(s));

  if (slot) {
    const available = !busySlots.includes(slot);
    return NextResponse.json({ available, availableSlots });
  }

  return NextResponse.json({ availableSlots, busySlots });
}
