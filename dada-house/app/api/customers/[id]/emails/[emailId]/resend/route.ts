import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { resendEmail } from "@/lib/email-history";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ emailId: string }> }) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { emailId } = await params;

  try {
    const result = await resendEmail(emailId);
    return NextResponse.json({ success: true, id: result.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to resend" }, { status: 500 });
  }
}
