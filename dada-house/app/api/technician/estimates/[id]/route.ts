import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { resend, FROM_EMAIL } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const estimate = await db.estimate.findFirst({
    where: { id, technicianId: auth.id },
  });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ estimate });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
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
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await db.estimate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { action } = await req.json();

  const estimate = await db.estimate.findFirst({ where: { id, technicianId: auth.id } });
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

function buildEstimateEmail(
  est: { estimateNumber: string; clientName: string; total: number; additionalDetails?: string | null },
  lineItems: Array<{ desc: string; rate: number; qty: number; amount: number }>,
  techName: string
) {
  const itemRows = lineItems.map((item) =>
    `<tr><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0">${item.desc}</td><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right">$${item.rate.toFixed(2)}</td><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:center">${item.qty}</td><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold">$${item.amount.toFixed(2)}</td></tr>`
  ).join("");

  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#1B3FA8;padding:24px;border-radius:8px 8px 0 0;text-align:center">
    <h1 style="color:white;margin:0;font-size:24px">DADA HOUSE</h1>
    <p style="color:#93c5fd;margin:4px 0 0">Premier Home Services · Houston, TX</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <h2 style="color:#1B3FA8;margin-top:0">Estimate #${est.estimateNumber}</h2>
    <p>Dear ${est.clientName},</p>
    <p>Thank you for considering DADA HOUSE. Please find your estimate below:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:10px 4px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">DESCRIPTION</th>
          <th style="padding:10px 4px;text-align:right;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">RATE</th>
          <th style="padding:10px 4px;text-align:center;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">QTY</th>
          <th style="padding:10px 4px;text-align:right;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">AMOUNT</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div style="text-align:right;font-size:18px;font-weight:bold;color:#1B3FA8;border-top:2px solid #1B3FA8;padding-top:12px">
      Total: $${est.total.toFixed(2)}
    </div>
    ${est.additionalDetails ? `<p style="margin-top:16px;padding:12px;background:#f9fafb;border-radius:6px;font-size:14px">${est.additionalDetails}</p>` : ""}
    <p style="margin-top:24px">To accept this estimate or have any questions, please contact us:</p>
    <p>📞 (910) 685-8042 · ✉️ customerservice@dada-house.com</p>
    <p style="color:#6b7280;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
      Prepared by ${techName} · DADA HOUSE · 7001 South Texas 6 STE 246, Houston, TX 77083
    </p>
  </div>
</body>
</html>`;
}
