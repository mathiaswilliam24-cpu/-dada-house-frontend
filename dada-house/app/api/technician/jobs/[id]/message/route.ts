import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendOutboundSms, DoNotContactError } from "@/lib/messaging";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { text } = await req.json();
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }

  const staffRoles = ["ADMIN", "SUPER_ADMIN"];
  const job = await db.appointment.findFirst({
    where: { id, technicianId: staffRoles.includes(auth.role) ? undefined : auth.id },
    select: { phone: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!job.phone) return NextResponse.json({ error: "No customer phone number on file for this job." }, { status: 400 });

  try {
    await sendOutboundSms(job.phone, text.trim(), { sentById: auth.id });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof DoNotContactError) {
      return NextResponse.json({ error: "This number has opted out of texts and can't be messaged." }, { status: 400 });
    }
    console.error("Technician SMS send failed:", err);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
