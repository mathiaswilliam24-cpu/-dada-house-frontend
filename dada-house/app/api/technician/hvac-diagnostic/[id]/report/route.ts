import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { canAccess } from "@/lib/hvac/server";
import { renderHvacReportPdf } from "@/lib/pdf/hvac-diagnostic-report";

export const dynamic = "force-dynamic";

/** PDF of a diagnostic (drafts are marked "Draft"). Technician who owns it, or admin. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const s = await db.hvacDiagnosticSession.findUnique({ where: { id }, select: { technicianId: true, reportNumber: true } });
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccess(s, auth)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const pdf = await renderHvacReportPdf(id);
  if (!pdf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${s.reportNumber ?? "hvac-diagnostic-draft"}.pdf"`, "Cache-Control": "no-store" },
  });
}
