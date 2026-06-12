import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { buildEstimateEmail } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const estimate = await db.estimate.findUnique({ where: { id } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ estimate });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();

  const allowed = [
    "clientName", "clientEmail", "clientPhone", "clientMobile", "clientFax",
    "clientAddress", "clientCity", "clientState", "clientZip",
    "lineItems", "additionalDetails",
    "subtotal", "taxType", "taxLabel", "taxRate", "taxInclusive",
    "discountType", "discountValue", "total",
    "status", "templateColor", "showFinancing", "requestSignature",
    "sentAt", "signatureUrl",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const estimate = await db.estimate.update({ where: { id }, data });
  return NextResponse.json({ estimate });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await db.estimate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { action } = await req.json();

  const estimate = await db.estimate.findUnique({ where: { id } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "email") {
    const lineItems = (estimate.lineItems as Array<{ desc: string; rate: number; qty: number; amount: number }>) ?? [];
    const html = buildEstimateEmail(estimate, lineItems, auth.name ?? "DADA HOUSE");
    await resend.emails.send({
      from: FROM_EMAIL,
      to: estimate.clientEmail,
      subject: `Estimate ${estimate.estimateNumber} from DADA HOUSE`,
      html,
    });
    await db.estimate.update({ where: { id }, data: { sentAt: new Date() } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
