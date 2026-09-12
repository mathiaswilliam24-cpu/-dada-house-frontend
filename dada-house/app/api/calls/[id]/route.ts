import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { CallDisposition } from "@/lib/generated/prisma/enums";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const call = await db.call.findUnique({
    where: { id },
    include: {
      customer: true,
      agent: { select: { id: true, name: true } },
      appointment: { select: { id: true, appointmentNumber: true } },
      recording: true,
      voicemail: true,
    },
  });

  if (!call) return NextResponse.json({ error: "Call not found" }, { status: 404 });
  return NextResponse.json({ call });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { disposition, dispositionNotes, appointmentId } = await req.json();

  const call = await db.call.update({
    where: { id },
    data: {
      ...(disposition !== undefined && { disposition: disposition as CallDisposition }),
      ...(dispositionNotes !== undefined && { dispositionNotes }),
      ...(appointmentId !== undefined && { appointmentId }),
    },
  }).catch(() => null);

  if (!call) return NextResponse.json({ error: "Call not found or update failed" }, { status: 404 });
  return NextResponse.json({ call });
}
