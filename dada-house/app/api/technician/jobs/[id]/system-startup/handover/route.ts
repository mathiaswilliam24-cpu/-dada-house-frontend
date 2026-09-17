import { NextRequest, NextResponse, after } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendSystemStartupReport } from "@/lib/system-startup-report-email";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const staffRoles = ["ADMIN", "SUPER_ADMIN"];
  const appointment = await db.appointment.findFirst({
    where: { id, technicianId: staffRoles.includes(auth.role) ? undefined : auth.id },
    select: { id: true },
  });
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const startup = await db.systemStartup.findUnique({ where: { appointmentId: id } });
  if (!startup) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (startup.status !== "APPROVED") {
    return NextResponse.json({ error: "This startup hasn't been approved by a supervisor yet." }, { status: 409 });
  }

  const { handoverChecklist, customerSignatureUrl } = await req.json();
  if (!customerSignatureUrl) {
    return NextResponse.json({ error: "Customer signature is required." }, { status: 400 });
  }

  const updated = await db.systemStartup.update({
    where: { appointmentId: id },
    data: {
      handoverChecklist: handoverChecklist ?? [],
      customerSignatureUrl,
      customerHandoverAt: new Date(),
    },
  });

  after(() => sendSystemStartupReport(updated.id, auth.id).catch((err) => console.error("Failed to generate/send system startup report:", err)));

  return NextResponse.json({ startup: updated });
}
