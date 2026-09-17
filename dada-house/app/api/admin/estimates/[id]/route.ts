import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendTrackedEmail } from "@/lib/customer-email";
import { buildEstimateEmail, buildEstimateInvoiceEmail } from "@/lib/email-templates";
import { sendOutboundSms } from "@/lib/messaging";
import { randomUUID } from "crypto";

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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dada-house.com";
    const html = estimate.isInvoice
      ? buildEstimateInvoiceEmail(estimate, lineItems, auth.name ?? "DADA HOUSE", `${baseUrl}/pay/${estimate.paymentToken}`)
      : buildEstimateEmail(estimate, lineItems, auth.name ?? "DADA HOUSE");
    await sendTrackedEmail({
      to: estimate.clientEmail,
      subject: estimate.isInvoice
        ? `Invoice ${estimate.estimateNumber} from DADA HOUSE — $${estimate.total.toFixed(2)} due`
        : `Estimate ${estimate.estimateNumber} from DADA HOUSE`,
      html,
    });
    await db.estimate.update({ where: { id }, data: { sentAt: new Date(), status: "OPEN" } });
    return NextResponse.json({ success: true });
  }

  if (action === "sms") {
    if (!estimate.isInvoice || !estimate.paymentToken) {
      return NextResponse.json({ error: "Convert this estimate to an invoice before sending a payment text." }, { status: 400 });
    }
    const phone = estimate.clientMobile || estimate.clientPhone;
    if (!phone) return NextResponse.json({ error: "No client phone number on file" }, { status: 400 });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dada-house.com";
    const payUrl = `${baseUrl}/pay/${estimate.paymentToken}`;
    await sendOutboundSms(phone, `DADA HOUSE: Hi ${estimate.clientName}, your invoice #${estimate.estimateNumber} for $${estimate.total.toFixed(2)} is ready. Pay here: ${payUrl}`);

    await db.estimate.update({ where: { id }, data: { sentAt: new Date(), status: "OPEN" } });
    return NextResponse.json({ success: true });
  }

  if (action === "convert") {
    if (estimate.isInvoice) return NextResponse.json({ estimate });
    const updated = await db.estimate.update({
      where: { id },
      data: {
        isInvoice: true,
        convertedAt: new Date(),
        paymentToken: estimate.paymentToken ?? randomUUID(),
      },
    });
    return NextResponse.json({ estimate: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
