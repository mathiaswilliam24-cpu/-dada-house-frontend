import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendTrackedEmail } from "@/lib/customer-email";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id }, select: { email: true } });
  if (!customer?.email) return NextResponse.json({ messages: [] });

  const thread = await db.emailThread.findFirst({
    where: { emailAddress: { equals: customer.email, mode: "insensitive" } },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (thread && thread.unreadCount > 0) {
    await db.emailThread.update({ where: { id: thread.id }, data: { unreadCount: 0 } });
  }

  return NextResponse.json({ messages: thread?.messages ?? [] });
}

const replySchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  attachmentUrls: z.array(z.string().url()).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id }, select: { id: true, email: true } });
  if (!customer?.email) {
    return NextResponse.json({ error: "This customer has no email on file" }, { status: 400 });
  }

  const parsed = replySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await sendTrackedEmail({
    to: customer.email,
    subject: parsed.data.subject,
    html: parsed.data.body.replace(/\n/g, "<br/>"),
    text: parsed.data.body,
    customerId: customer.id,
    sentById: auth.id,
    attachmentUrls: parsed.data.attachmentUrls,
  });

  return NextResponse.json({ ok: true });
}
