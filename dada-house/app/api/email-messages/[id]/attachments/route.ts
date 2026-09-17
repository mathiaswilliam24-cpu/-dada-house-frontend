import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getResend } from "@/lib/resend";

export const dynamic = "force-dynamic";

/**
 * Report PDFs (Clean & Check, Diagnostic, System Startup, etc.) are attached
 * via Resend at send time but never stored in our own DB/file storage — the
 * only durable copy is the one Resend kept for the sent email. This fetches
 * it back on demand via EmailMessage.resendId, rather than re-persisting
 * every generated PDF somewhere ourselves.
 */
// Opened directly as `<a href target="_blank">` so the browser navigates to
// this route and follows the redirect itself — fetching JSON first and then
// calling window.open() would lose the "user gesture" and get popup-blocked.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const message = await db.emailMessage.findUnique({ where: { id }, select: { resendId: true } });
  if (!message?.resendId) {
    return new NextResponse("No attachment found on this email.", { status: 404 });
  }

  const result = await getResend().emails.attachments.list({ emailId: message.resendId });
  if (result.error || !result.data || result.data.data.length === 0) {
    return new NextResponse(result.error?.message ?? "No attachment found on this email.", { status: 404 });
  }

  return NextResponse.redirect(result.data.data[0].download_url);
}
