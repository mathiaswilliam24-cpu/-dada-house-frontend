import { NextRequest, NextResponse, after } from "next/server";
import { requireSupervisor } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSupervisor(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const startup = await db.systemStartup.findUnique({ where: { id }, include: { appointment: true } });
  if (!startup) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [technician, reviewer, photos] = await Promise.all([
    startup.technicianId ? db.user.findUnique({ where: { id: startup.technicianId }, select: { name: true } }) : null,
    startup.reviewedById ? db.user.findUnique({ where: { id: startup.reviewedById }, select: { name: true } }) : null,
    db.jobPhoto.findMany({ where: { appointmentId: startup.appointmentId }, orderBy: { createdAt: "asc" } }),
  ]);

  return NextResponse.json({
    startup,
    technicianName: technician?.name ?? null,
    reviewerName: reviewer?.name ?? null,
    photos,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSupervisor(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { action, comment } = body as { action: string; comment?: string };

  const startup = await db.systemStartup.findUnique({ where: { id }, include: { appointment: true } });
  if (!startup) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (startup.status !== "AWAITING_SUPERVISOR_REVIEW") {
    return NextResponse.json({ error: "This startup form isn't awaiting review." }, { status: 409 });
  }

  if (action === "return" || action === "additional-testing") {
    if (!comment?.trim()) return NextResponse.json({ error: "A comment is required." }, { status: 400 });

    const updated = await db.systemStartup.update({
      where: { id },
      data: {
        status: action === "return" ? "RETURNED" : "ADDITIONAL_TESTING_REQUESTED",
        supervisorComment: comment.trim(),
        reviewedById: auth.id,
        reviewedAt: new Date(),
      },
    });

    if (startup.technicianId) {
      const technician = await db.user.findUnique({ where: { id: startup.technicianId }, select: { phone: true } });
      if (technician?.phone) {
        after(() =>
          sendSMS(
            technician.phone!,
            `DADA HOUSE: Your System Startup for job #${startup.appointment.appointmentNumber} was ${action === "return" ? "returned" : "flagged for additional testing"} by a supervisor: "${comment.trim()}". Please update it in the app.`
          ).catch(console.error)
        );
      }
    }

    return NextResponse.json({ startup: updated });
  }

  if (action === "approve") {
    const updated = await db.systemStartup.update({
      where: { id },
      data: { status: "APPROVED", reviewedById: auth.id, reviewedAt: new Date(), supervisorComment: comment?.trim() || null },
    });

    // Approval unlocks Section 15 (Customer Handover) in the technician's copy —
    // the customer report only goes out once that step is completed, not here.
    if (startup.technicianId) {
      const technician = await db.user.findUnique({ where: { id: startup.technicianId }, select: { phone: true } });
      if (technician?.phone) {
        after(() =>
          sendSMS(
            technician.phone!,
            `DADA HOUSE: Your System Startup for job #${startup.appointment.appointmentNumber} was approved. Complete the Customer Handover step to finish.`
          ).catch(console.error)
        );
      }
    }

    return NextResponse.json({ startup: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
