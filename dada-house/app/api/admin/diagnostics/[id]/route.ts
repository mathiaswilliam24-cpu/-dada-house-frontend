import { NextRequest, NextResponse, after } from "next/server";
import { requireSupervisor } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";
import { sendDiagnosticCustomerReport } from "@/lib/diagnostic-report-email";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSupervisor(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const diagnostic = await db.serviceDiagnostic.findUnique({
    where: { id },
    include: { appointment: true },
  });
  if (!diagnostic) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [technician, reviewer, photos] = await Promise.all([
    diagnostic.technicianId ? db.user.findUnique({ where: { id: diagnostic.technicianId }, select: { name: true } }) : null,
    diagnostic.reviewedById ? db.user.findUnique({ where: { id: diagnostic.reviewedById }, select: { name: true } }) : null,
    db.jobPhoto.findMany({ where: { appointmentId: diagnostic.appointmentId }, orderBy: { createdAt: "asc" } }),
  ]);

  return NextResponse.json({
    diagnostic,
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

  const diagnostic = await db.serviceDiagnostic.findUnique({ where: { id }, include: { appointment: true } });
  if (!diagnostic) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (diagnostic.status !== "AWAITING_SUPERVISOR_REVIEW") {
    return NextResponse.json({ error: "This diagnostic isn't awaiting review." }, { status: 409 });
  }

  if (action === "return" || action === "additional-testing") {
    if (!comment?.trim()) return NextResponse.json({ error: "A comment is required." }, { status: 400 });

    const updated = await db.serviceDiagnostic.update({
      where: { id },
      data: {
        status: action === "return" ? "RETURNED" : "ADDITIONAL_TESTING_REQUESTED",
        supervisorComment: comment.trim(),
        reviewedById: auth.id,
        reviewedAt: new Date(),
      },
    });

    if (diagnostic.technicianId) {
      const technician = await db.user.findUnique({ where: { id: diagnostic.technicianId }, select: { phone: true } });
      if (technician?.phone) {
        after(() =>
          sendSMS(
            technician.phone!,
            `DADA HOUSE: Your diagnostic for job #${diagnostic.appointment.appointmentNumber} was ${action === "return" ? "returned" : "flagged for additional testing"} by a supervisor: "${comment.trim()}". Please update it in the app.`
          ).catch(console.error)
        );
      }
    }

    return NextResponse.json({ diagnostic: updated });
  }

  if (action === "approve") {
    const updated = await db.serviceDiagnostic.update({
      where: { id },
      data: { status: "APPROVED", reviewedById: auth.id, reviewedAt: new Date(), supervisorComment: comment?.trim() || null },
    });

    after(() => sendDiagnosticCustomerReport(id, auth.id).catch((err) => console.error("Failed to generate/send diagnostic customer report:", err)));

    if (diagnostic.technicianId) {
      const technician = await db.user.findUnique({ where: { id: diagnostic.technicianId }, select: { phone: true } });
      if (technician?.phone) {
        after(() =>
          sendSMS(
            technician.phone!,
            `DADA HOUSE: Your diagnostic for job #${diagnostic.appointment.appointmentNumber} was approved.`
          ).catch(console.error)
        );
      }
    }

    return NextResponse.json({ diagnostic: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
