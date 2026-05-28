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
  const invoice = await db.estimate.findFirst({ where: { id, technicianId: auth.id, isInvoice: true } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invoice });
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
    "sentAt", "paidAt", "paymentMethod",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  const invoice = await db.estimate.update({
    where: { id },
    data,
  });
  return NextResponse.json({ invoice });
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
  const body = await req.json();
  const { action } = body;

  const invoice = await db.estimate.findFirst({ where: { id, technicianId: auth.id, isInvoice: true } });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "email") {
    if (!invoice.clientEmail) return NextResponse.json({ error: "No client email" }, { status: 400 });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://mydadahouse.com";
    const paymentUrl = `${baseUrl}/pay/${invoice.paymentToken}`;
    const lineItems = (invoice.lineItems as Array<{ desc: string; rate: number; qty: number; amount: number }>) ?? [];
    const html = buildInvoiceEmail(invoice, lineItems, auth.name ?? "DADA HOUSE", paymentUrl);

    await resend.emails.send({
      from: FROM_EMAIL,
      to: invoice.clientEmail,
      subject: `Invoice ${invoice.estimateNumber} from DADA HOUSE — $${invoice.total.toFixed(2)} due`,
      html,
    });

    await db.estimate.update({ where: { id }, data: { sentAt: new Date(), status: "OPEN" } });
    return NextResponse.json({ success: true });
  }

  if (action === "mark-paid") {
    const paymentMethod = (body.method as string | undefined) ?? invoice.paymentMethod ?? "CASH";

    await db.estimate.update({
      where: { id },
      data: { paidAt: new Date(), status: "CLOSED", paymentMethod },
    });

    // Send receipt email
    if (invoice.clientEmail) {
      const lineItems = (invoice.lineItems as Array<{ desc: string; rate: number; qty: number; amount: number }>) ?? [];
      const html = buildReceiptEmail(invoice, lineItems, paymentMethod);
      resend.emails.send({
        from: FROM_EMAIL,
        to: invoice.clientEmail,
        subject: `Payment Received — Invoice ${invoice.estimateNumber} · DADA HOUSE`,
        html,
      }).catch(console.error);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

function buildInvoiceEmail(
  inv: { estimateNumber: string; clientName: string; total: number; additionalDetails?: string | null },
  lineItems: Array<{ desc: string; rate: number; qty: number; amount: number }>,
  techName: string,
  paymentUrl: string
) {
  const itemRows = lineItems.map((item) =>
    `<tr>
      <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0">${item.desc}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right">$${item.rate.toFixed(2)}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:center">${item.qty}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold">$${item.amount.toFixed(2)}</td>
    </tr>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#1B3FA8;padding:24px;border-radius:8px 8px 0 0;text-align:center">
    <h1 style="color:white;margin:0;font-size:24px">DADA HOUSE</h1>
    <p style="color:#93c5fd;margin:4px 0 0">Premier Home Services · Houston, TX</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <h2 style="color:#1B3FA8;margin-top:0">Invoice #${inv.estimateNumber}</h2>
    <p>Dear ${inv.clientName},</p>
    <p>Thank you for choosing DADA HOUSE. Please find your invoice below:</p>
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
    <div style="text-align:right;font-size:18px;font-weight:bold;color:#1B3FA8;border-top:2px solid #1B3FA8;padding-top:12px;margin-bottom:24px">
      Total Due: $${inv.total.toFixed(2)}
    </div>
    ${inv.additionalDetails ? `<p style="padding:12px;background:#f9fafb;border-radius:6px;font-size:14px;margin-bottom:24px">${inv.additionalDetails}</p>` : ""}

    <p style="font-weight:bold;margin-bottom:8px">Choose how you'd like to pay:</p>
    <a href="${paymentUrl}" style="display:block;text-align:center;background:#1B3FA8;color:white;padding:16px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin-bottom:16px">
      Pay Now — Select Payment Method
    </a>
    <div style="display:flex;gap:8px;margin-bottom:24px">
      <a href="${paymentUrl}?method=zelle" style="flex:1;text-align:center;background:#6C4BEF;color:white;padding:12px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:bold">Zelle</a>
      <a href="${paymentUrl}?method=card" style="flex:1;text-align:center;background:#059669;color:white;padding:12px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:bold">Credit/Debit Card</a>
      <a href="${paymentUrl}?method=cash" style="flex:1;text-align:center;background:#78716c;color:white;padding:12px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:bold">Cash</a>
    </div>

    <p style="color:#6b7280;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
      Prepared by ${techName} · DADA HOUSE · 7001 South Texas 6 STE 246, Houston, TX 77083<br>
      (910) 685-8042 · customerservice@mydadahouse.com
    </p>
  </div>
</body>
</html>`;
}

function buildReceiptEmail(
  inv: { estimateNumber: string; clientName: string; total: number },
  lineItems: Array<{ desc: string; rate: number; qty: number; amount: number }>,
  method: string
) {
  const methodLabel = method === "ZELLE" ? "Zelle" : method === "CARD" ? "Credit/Debit Card" : "Cash";
  const itemRows = lineItems.map((item) =>
    `<tr>
      <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0">${item.desc}</td>
      <td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold">$${item.amount.toFixed(2)}</td>
    </tr>`
  ).join("");

  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#059669;padding:24px;border-radius:8px 8px 0 0;text-align:center">
    <h1 style="color:white;margin:0;font-size:24px">✓ Payment Received</h1>
    <p style="color:#a7f3d0;margin:4px 0 0">DADA HOUSE · Premier Home Services</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p>Dear ${inv.clientName},</p>
    <p>Thank you for your payment! Your invoice #${inv.estimateNumber} has been marked as paid.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0;font-size:13px;color:#166534"><strong>Payment method:</strong> ${methodLabel}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#166534"><strong>Amount paid:</strong> $${inv.total.toFixed(2)}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#166534"><strong>Date:</strong> ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tbody>${itemRows}</tbody>
      <tfoot>
        <tr>
          <td style="padding:12px 4px;border-top:2px solid #1B3FA8;font-weight:bold;color:#1B3FA8">Total Paid</td>
          <td style="padding:12px 4px;border-top:2px solid #1B3FA8;text-align:right;font-weight:bold;font-size:18px;color:#1B3FA8">$${inv.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    <p>We truly appreciate your business. If you have any questions or need follow-up service, don't hesitate to reach out.</p>
    <p>📞 (910) 685-8042 · ✉️ customerservice@mydadahouse.com</p>
    <p style="color:#6b7280;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
      DADA HOUSE · 7001 South Texas 6 STE 246, Houston, TX 77083
    </p>
  </div>
</body>
</html>`;
}
