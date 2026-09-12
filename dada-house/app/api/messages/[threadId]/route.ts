import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendOutboundSms, DoNotContactError } from "@/lib/messaging";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { threadId } = await params;

  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    include: {
      customer: true,
      messages: { orderBy: { createdAt: "asc" }, include: { sentBy: { select: { name: true } } } },
    },
  });

  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  await db.messageThread.update({ where: { id: threadId }, data: { unreadCount: 0 } }).catch(() => {});

  return NextResponse.json({ thread });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { threadId } = await params;
  const { body, templateId, mediaUrls } = await req.json();
  if (!body) return NextResponse.json({ error: "Message body is required" }, { status: 400 });

  const thread = await db.messageThread.findUnique({ where: { id: threadId } });
  if (!thread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  try {
    const message = await sendOutboundSms(thread.phoneNumber, body, { sentById: auth.id, templateId, mediaUrls });
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    if (err instanceof DoNotContactError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Failed to send message", err);
    const detail = err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
