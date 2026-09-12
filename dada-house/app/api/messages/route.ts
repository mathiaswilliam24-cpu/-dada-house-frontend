import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendOutboundSms, DoNotContactError } from "@/lib/messaging";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const threads = await db.messageThread.findMany({
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({ threads });
}

/** Starts a new conversation with a phone number that has no thread yet. */
export async function POST(req: NextRequest) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { phone, body, mediaUrls } = await req.json();
  if (!phone || !body) return NextResponse.json({ error: "Phone and message body are required" }, { status: 400 });

  try {
    const message = await sendOutboundSms(phone, body, { sentById: auth.id, mediaUrls });
    const thread = await db.messageThread.findUnique({ where: { id: message.threadId } });
    return NextResponse.json({ message, thread }, { status: 201 });
  } catch (err) {
    if (err instanceof DoNotContactError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Failed to start new conversation", err);
    const detail = err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
