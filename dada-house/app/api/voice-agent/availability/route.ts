import { NextRequest, NextResponse } from "next/server";
import { inferJobType, JOB_TYPE_KEYS, type JobType } from "@/lib/dispatch";
import { findOpenWindows } from "@/lib/dispatch-availability";

export const dynamic = "force-dynamic";

/**
 * Real open arrival windows for the AI receptionist (Vapi), from the Dispatch Board.
 * GET /api/voice-agent/availability?service=AC&date=2026-11-18&days=3&limit=6
 * Auth: Bearer DADA_HOUSE_API_KEY. Times are North Carolina (Eastern) time.
 * The agent must only offer windows returned here; pass the chosen `start` back as
 * `slotStart` when creating the appointment.
 */
export async function GET(req: NextRequest) {
  const apiKey = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!process.env.DADA_HOUSE_API_KEY || apiKey !== process.env.DADA_HOUSE_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  const rawType = (sp.get("jobType") ?? "").toUpperCase();
  const jobType: JobType = (JOB_TYPE_KEYS as string[]).includes(rawType) ? (rawType as JobType) : inferJobType(sp.get("service"));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("date") ?? "") ? sp.get("date")! : undefined;
  const days = Number(sp.get("days") ?? 3) || 3;
  const limit = Math.min(20, Number(sp.get("limit") ?? 6) || 6);

  const r = await findOpenWindows({ jobType, fromYmd: date, days, limit });
  return NextResponse.json({
    timezone: "America/New_York",
    jobType,
    durationMinutes: r.durationMinutes,
    slots: r.windows,
    message: r.windows.length
      ? `Offer only these arrival windows: ${r.windows.map((w) => w.label).join("; ")}.`
      : "No open arrival windows in this range. Offer to have a dispatcher call back, or check later dates.",
  });
}
