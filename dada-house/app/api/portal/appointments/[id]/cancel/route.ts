import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logJobEvent } from "@/lib/dispatch";
import { notifyCanceled } from "@/lib/dispatch-notify";
import { customerCanCancel } from "@/lib/appointment-cancel";

export const dynamic = "force-dynamic";

const schema = z.object({ reason: z.string().max(300).optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const reason = parsed.success ? parsed.data.reason?.trim() || null : null;

  const appt = await db.appointment.findUnique({ where: { id }, include: { assignments: { select: { technicianId: true } } } });
  if (!appt || appt.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!customerCanCancel(appt)) {
    return NextResponse.json({ error: "This visit is already under way or finished. Please call us at (844) 928-0875." }, { status: 400 });
  }

  await db.appointment.update({ where: { id }, data: { status: "CANCELLED", techStatus: appt.technicianId ? "CANCELED" : null } });
  await logJobEvent({
    appointmentId: id, type: "CANCELED", userId: session.user.id, userName: session.user.name ?? appt.name,
    message: `Canceled by the customer${reason ? `: ${reason}` : ""}`, fromValue: appt.status, toValue: "CANCELLED",
  });
  const techIds = [appt.technicianId, ...appt.assignments.map((a) => a.technicianId)].filter((x): x is string => !!x);
  after(() => notifyCanceled(id, techIds, { by: "customer", userId: session.user!.id, reason }).catch(console.error));
  return NextResponse.json({ ok: true });
}
