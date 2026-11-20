import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { renderHvacReportPdf } from "@/lib/pdf/hvac-diagnostic-report";

export const dynamic = "force-dynamic";

/** Public, token-gated PDF of a COMPLETED HVAC diagnostic — the link shared with the customer. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token || token.length < 20) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const s = await db.hvacDiagnosticSession.findUnique({ where: { reportToken: token }, select: { id: true, status: true, reportNumber: true } });
  if (!s || s.status !== "COMPLETED") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const pdf = await renderHvacReportPdf(s.id);
  if (!pdf) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${s.reportNumber}.pdf"`, "Cache-Control": "private, max-age=300" },
  });
}
