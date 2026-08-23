import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { resend, FROM_EMAIL } from "@/lib/resend";

export const dynamic = "force-dynamic";

type LI = { description: string; note?: string; rate: number; qty: number };

const fmtCur = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function parseMeta(raw: unknown, fallbackService: string, fallbackAmount: number) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const m = raw as Record<string, unknown>;
    if (Array.isArray(m.items) && m.items.length > 0) {
      return {
        taxEnabled: m.taxEnabled !== false,
        taxRate:    typeof m.taxRate === "number" ? m.taxRate : 8.25,
        items:      m.items as LI[],
      };
    }
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return { taxEnabled: true, taxRate: 8.25, items: raw as LI[] };
  }
  return { taxEnabled: true, taxRate: 8.25, items: [{ description: fallbackService, rate: fallbackAmount, qty: 1 }] };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      appointment: {
        select: { name: true, phone: true, email: true, address: true, city: true, service: true, appointmentNumber: true },
      },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const clientEmail = invoice.appointment.email;
  if (!clientEmail) return NextResponse.json({ error: "Client has no email address" }, { status: 400 });

  const { taxEnabled, taxRate, items } = parseMeta(invoice.lineItems, invoice.appointment.service, invoice.amount);
  const subtotal   = items.reduce((s, i) => s + i.rate * i.qty, 0);
  const tax        = taxEnabled ? subtotal * taxRate / 100 : 0;
  const total      = subtotal + tax;
  const isPaid     = invoice.status === "PAID";
  const balanceDue = isPaid ? 0 : total;
  const invoiceNum = `INV${id.slice(-6).toUpperCase()}`;
  const dueLabel   = invoice.dueDate ? fmtDate(invoice.dueDate) : "On Receipt";
  const paidLabel  = invoice.paidAt ? fmtDate(invoice.paidAt) : "";
  const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dada-house.com";
  const printUrl   = `${appUrl}/print/invoice/${id}`;

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:12px 16px;font-size:13px;border-bottom:1px solid #f3f4f6;">
        <div style="font-weight:500;color:#111827;white-space:pre-wrap;">${item.description}</div>
        ${item.note ? `<div style="color:#6b7280;font-size:12px;margin-top:2px;white-space:pre-wrap;">${item.note}</div>` : ""}
      </td>
      <td style="padding:12px 16px;font-size:13px;text-align:right;color:#111827;border-bottom:1px solid #f3f4f6;">${fmtCur(item.rate)}</td>
      <td style="padding:12px 16px;font-size:13px;text-align:center;color:#111827;border-bottom:1px solid #f3f4f6;">${item.qty}</td>
      ${taxEnabled ? `<td style="padding:12px 16px;font-size:12px;text-align:right;color:#6b7280;border-bottom:1px solid #f3f4f6;">${fmtCur(item.rate * item.qty * taxRate / 100)}<br/><span style="font-size:10px;">${taxRate}%</span></td>` : ""}
      <td style="padding:12px 16px;font-size:13px;text-align:right;font-weight:600;color:#111827;border-bottom:1px solid #f3f4f6;">${fmtCur(item.rate * item.qty)}</td>
    </tr>
  `).join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:620px;margin:0 auto;background:white;">
    <div style="height:8px;background:${isPaid ? "#16a34a" : "#1B3FA8"};"></div>

    ${isPaid ? `
    <!-- PAID banner -->
    <div style="background:#f0fdf4;border-bottom:1px solid #bbf7d0;padding:14px 32px;display:flex;align-items:center;gap:12px;">
      <div style="width:36px;height:36px;background:#16a34a;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="color:white;font-size:18px;font-weight:700;">✓</span>
      </div>
      <div>
        <div style="font-size:14px;font-weight:700;color:#15803d;">Payment Received — Thank You!</div>
        <div style="font-size:12px;color:#166534;margin-top:2px;">Paid ${paidLabel}${invoice.paymentMethod ? ` · ${invoice.paymentMethod}` : ""}</div>
      </div>
    </div>` : ""}

    <!-- Header -->
    <div style="padding:28px 32px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <img src="https://www.dada-house.com/logo%20dada%20house.png" alt="DADA HOUSE" style="height:60px;width:auto;" />
        <div style="font-size:11px;color:#6b7280;margin-top:6px;line-height:1.6;">
          <strong>TX:</strong> 7001 South Texas 6 STE 246, Houston TX 77083<br/>
          <strong>NC:</strong> 106 Thompson St, Jacksonville NC 28540
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:20px;font-weight:700;color:#111827;letter-spacing:2px;">INVOICE</div>
        <div style="font-size:14px;font-weight:700;color:${isPaid ? "#16a34a" : "#1B3FA8"};margin-bottom:10px;">${invoiceNum}</div>
        <div style="font-size:12px;color:#6b7280;">DATE &nbsp; <strong style="color:#111827;">${fmtDate(invoice.createdAt)}</strong></div>
        ${isPaid
          ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">PAID &nbsp; <strong style="color:#16a34a;">${paidLabel}</strong></div>`
          : `<div style="font-size:12px;color:#6b7280;margin-top:2px;">DUE &nbsp; <strong style="color:#111827;">${dueLabel}</strong></div>`
        }
        <div style="font-size:13px;font-weight:700;color:${isPaid ? "#16a34a" : "#111827"};margin-top:8px;">
          ${isPaid ? "PAID ✓ — USD $0.00" : `BALANCE DUE: USD ${fmtCur(total)}`}
        </div>
      </div>
    </div>

    <!-- Bill To -->
    <div style="padding:18px 32px;border-bottom:1px solid #e5e7eb;">
      <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">BILL TO</div>
      <div style="font-size:16px;font-weight:700;color:#111827;">${invoice.appointment.name}</div>
      ${invoice.appointment.phone ? `<div style="font-size:13px;color:#374151;margin-top:2px;">${invoice.appointment.phone}</div>` : ""}
      ${invoice.appointment.email ? `<div style="font-size:13px;color:#374151;">${invoice.appointment.email}</div>` : ""}
    </div>

    <!-- Line items -->
    <div style="padding:0 32px;">
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <thead>
          <tr style="background:#1B3FA8;color:white;">
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;letter-spacing:0.5px;width:45%;">DESCRIPTION</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;">RATE</th>
            <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;">QTY</th>
            ${taxEnabled ? `<th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;">TAX</th>` : ""}
            <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:700;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="padding:16px 32px 24px;display:flex;justify-content:flex-end;">
      <table style="min-width:200px;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 16px 4px 0;font-size:12px;color:#6b7280;font-weight:600;">SUBTOTAL</td>
          <td style="padding:4px 0;font-size:13px;text-align:right;color:#111827;">${fmtCur(subtotal)}</td>
        </tr>
        <tr>
          <td style="padding:4px 16px 4px 0;font-size:12px;color:#6b7280;font-weight:600;">${taxEnabled ? `TAX (${taxRate}%)` : "TAX"}</td>
          <td style="padding:4px 0;font-size:13px;text-align:right;color:${taxEnabled ? "#111827" : "#9ca3af"};">${taxEnabled ? fmtCur(tax) : "—"}</td>
        </tr>
        <tr style="border-top:2px solid #e5e7eb;">
          <td style="padding:8px 16px 4px 0;font-size:13px;color:#111827;font-weight:700;">TOTAL</td>
          <td style="padding:8px 0 4px;font-size:15px;text-align:right;color:#111827;font-weight:700;">${fmtCur(total)}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:4px 0;">
            <div style="background:${isPaid ? "#f0fdf4" : "#f0f4ff"};border-radius:6px;padding:8px 12px;display:flex;justify-content:space-between;">
              <span style="font-size:12px;color:${isPaid ? "#16a34a" : "#1B3FA8"};font-weight:700;">${isPaid ? "PAID ✓" : "BALANCE DUE"}</span>
              <span style="font-size:14px;color:${isPaid ? "#16a34a" : "#1B3FA8"};font-weight:700;">USD ${fmtCur(balanceDue)}</span>
            </div>
          </td>
        </tr>
      </table>
    </div>

    ${!isPaid ? `
    <!-- Payment instructions (only when not paid) -->
    <div style="margin:0 32px;padding:16px 20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">PAYMENT INSTRUCTIONS</div>
      <div style="font-size:13px;color:#374151;">Zelle : <strong>payment@mydadahouse.com</strong></div>
    </div>` : ""}

    ${invoice.notes ? `
    <div style="margin:16px 32px 0;padding:14px 20px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:4px;">NOTES</div>
      <div style="font-size:13px;color:#374151;white-space:pre-wrap;">${invoice.notes}</div>
    </div>` : ""}

    ${isPaid ? `
    <!-- Thank you message + Review CTA -->
    <div style="margin:24px 32px 0;padding:28px 24px;background:linear-gradient(135deg,#1B3FA8 0%,#2d5be3 100%);border-radius:12px;text-align:center;">
      <div style="font-size:22px;margin-bottom:8px;">🙏</div>
      <div style="font-size:18px;font-weight:700;color:white;margin-bottom:10px;">Thank you, ${invoice.appointment.name.split(" ")[0]}!</div>
      <p style="font-size:13px;color:#c7d7ff;margin:0 0 16px;line-height:1.7;">
        Your trust and confidence in DADA HOUSE means the world to us.<br/>
        It was truly a pleasure serving you, and we look forward<br/>to welcoming you again for your future home service needs.
      </p>
      <p style="font-size:13px;color:#c7d7ff;margin:0 0 20px;line-height:1.7;">
        If you were satisfied with our work, we would be grateful<br/>
        if you could take a moment to share your experience —<br/>
        your review helps other families discover DADA HOUSE.
      </p>
      <a href="https://dada-house.com/reviews"
        style="display:inline-block;padding:13px 32px;background:#F97316;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:0.3px;">
        ⭐ Leave Us a Review
      </a>
    </div>` : ""}

    <!-- View Invoice CTA -->
    <div style="padding:28px 32px;text-align:center;border-top:1px solid #e5e7eb;margin-top:24px;">
      <p style="font-size:13px;color:#374151;margin:0 0 16px;">You can view and download your invoice anytime from the link below.</p>
      <a href="${printUrl}" style="display:inline-block;padding:12px 28px;background:${isPaid ? "#16a34a" : "#F97316"};color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
        ${isPaid ? "✓ View Paid Invoice" : "View Invoice"}
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#374151;margin:0 0 4px;">It is a pleasure to serve you.</p>
      <p style="font-size:12px;color:#374151;margin:0 0 4px;">Our services encompass air conditioning, heating, plumbing, and remodeling.</p>
      <p style="font-size:12px;color:#374151;margin:0;">For additional inquiries, please contact us at (910) 685-8042 or visit our website at www.dada-house.com.</p>
    </div>
  </div>
</body>
</html>`;

  const adminEmail = process.env.APPOINTMENT_ALERT_EMAIL ?? "mathiaswilliam24@gmail.com";

  const adminNotifHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
    <div style="background:#1B3FA8;color:white;border-radius:8px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;font-weight:700;">✅ Invoice sent to client</p>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#6b7280;width:120px;">Invoice #</td><td style="padding:6px 0;font-weight:600;color:#111827;">${invoiceNum}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Client</td><td style="padding:6px 0;color:#111827;">${invoice.appointment.name}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Email sent to</td><td style="padding:6px 0;color:#111827;">${clientEmail}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Amount</td><td style="padding:6px 0;font-weight:700;color:#1B3FA8;">${fmtCur(total)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Due</td><td style="padding:6px 0;color:#111827;">${dueLabel}</td></tr>
    </table>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dada-house.com"}/print/invoice/${id}"
        style="display:inline-block;padding:10px 20px;background:#F97316;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">
        View Invoice PDF
      </a>
    </div>
    <p style="margin-top:16px;font-size:12px;color:#9ca3af;">— DADA HOUSE Admin System</p>
  </div>
</body>
</html>`;

  try {
    // Send to client
    const subject = isPaid
      ? `✅ Payment confirmed — Invoice ${invoiceNum} · DADA HOUSE LLC`
      : `Invoice ${invoiceNum} from DADA HOUSE LLC — ${fmtCur(total)} due ${dueLabel}`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: clientEmail,
      subject,
      html,
    });

    // Send separate confirmation copy to admin (never blocks client delivery)
    if (adminEmail !== clientEmail) {
      resend.emails.send({
        from: FROM_EMAIL,
        to: adminEmail,
        subject: `[COPY] ${isPaid ? "Paid invoice" : "Invoice"} ${invoiceNum} sent to ${invoice.appointment.name} — ${fmtCur(total)}`,
        html: adminNotifHtml,
      }).catch(err => console.error("admin copy email error", err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-email error", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
