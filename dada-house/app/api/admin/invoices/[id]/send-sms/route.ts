import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";

export const dynamic = "force-dynamic";

const fmtCur = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

type LI = { rate: number; qty: number };

function computeTotal(raw: unknown, fallbackAmount: number) {
  let items: LI[];
  let taxEnabled = true;
  let taxRate = 8.25;

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const m = raw as Record<string, unknown>;
    if (Array.isArray(m.items) && m.items.length > 0) {
      items = m.items as LI[];
      taxEnabled = m.taxEnabled !== false;
      taxRate = typeof m.taxRate === "number" ? m.taxRate : 8.25;
    } else {
      items = [{ rate: fallbackAmount, qty: 1 }];
    }
  } else if (Array.isArray(raw) && raw.length > 0) {
    items = raw as LI[];
  } else {
    items = [{ rate: fallbackAmount, qty: 1 }];
  }

  const subtotal = items.reduce((s, i) => s + i.rate * i.qty, 0);
  const tax = taxEnabled ? subtotal * taxRate / 100 : 0;
  return subtotal + tax;
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
        select: { name: true, phone: true, service: true },
      },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const phone = invoice.appointment.phone;
  if (!phone) return NextResponse.json({ error: "Client has no phone number" }, { status: 400 });

  const total      = computeTotal(invoice.lineItems, invoice.amount);
  const isPaid     = invoice.status === "PAID";
  const invoiceNum = `INV${id.slice(-6).toUpperCase()}`;
  const dueLabel   = invoice.dueDate
    ? invoice.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "On Receipt";
  const paidLabel  = invoice.paidAt
    ? invoice.paidAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
  const payMethod  = (invoice as { paymentMethod?: string | null }).paymentMethod;

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dada-house.com";
  const printUrl = `${appUrl}/print/invoice/${id}`;

  const message = isPaid
    ? `DADA HOUSE LLC — Hello ${invoice.appointment.name},

✅ Payment confirmed! Thank you.

Invoice: ${invoiceNum}
Service: ${invoice.appointment.service}
Amount paid: ${fmtCur(total)}${paidLabel ? `\nPaid: ${paidLabel}` : ""}${payMethod ? ` · ${payMethod}` : ""}
Balance due: $0.00

View your paid invoice:
${printUrl}

---
We truly appreciate your trust in DADA HOUSE! It was a pleasure serving you.

Could you take 1 minute to leave us a review? It makes a big difference:
https://dada-house.com/reviews

Questions? Call (346) 649-9353`
    : `DADA HOUSE LLC — Hello ${invoice.appointment.name},

Your invoice ${invoiceNum} for ${invoice.appointment.service} is ready.

Amount: ${fmtCur(total)}
Due: ${dueLabel}

View & Download PDF:
${printUrl}

Payment via Zelle: payment@mydadahouse.com

Thank you for choosing DADA HOUSE!
Questions? Call (346) 649-9353`;

  // Always use E.164 format — strip everything then add +1
  function toE164(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return raw.startsWith("+") ? raw : `+${digits}`;
  }

  const adminPhone = toE164(process.env.ADMIN_PHONE ?? "3466499353");
  const clientPhone = toE164(phone);

  const copyMsg = `[COPY — sent to client ${invoice.appointment.name}]\n\n${message}`;

  try {
    await sendSMS(clientPhone, message);
  } catch (err) {
    console.error("send-sms client error", err);
    return NextResponse.json({ error: "Failed to send SMS to client" }, { status: 500 });
  }

  // Admin copy — send even if same number (admin wants both confirmations)
  try {
    await sendSMS(adminPhone, copyMsg);
  } catch (err) {
    console.error("send-sms admin copy error", err);
    // Don't block — client already received the SMS
  }

  return NextResponse.json({ ok: true });
}
