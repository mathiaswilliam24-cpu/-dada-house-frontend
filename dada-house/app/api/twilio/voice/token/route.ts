import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { createVoiceAccessToken } from "@/lib/twilio-voice";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const token = createVoiceAccessToken(auth.id);
    return NextResponse.json({ token });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to issue token" }, { status: 500 });
  }
}
