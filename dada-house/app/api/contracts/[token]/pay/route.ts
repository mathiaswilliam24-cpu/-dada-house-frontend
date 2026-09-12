import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { sendOutboundSms } from "@/lib/messaging";
import { sendTrackedEmail } from "@/lib/customer-email";
import { createShortLink } from "@/lib/short-links";

export const dynamic = "force-dynamic";

const fmtCur = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { interval, saveCard, paymentMethodId } = await req.json();

  if (interval !== "monthly" && interval !== "annual") {
    return NextResponse.json({ error: "interval must be 'monthly' or 'annual'" }, { status: 400 });
  }
  if (!paymentMethodId) {
    return NextResponse.json({ error: "paymentMethodId is required" }, { status: 400 });
  }

  const contract = await db.maintenanceContract.findUnique({
    where: { token },
    include: { customer: true, planType: true },
  });
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  if (contract.status !== "SIGNED" && contract.status !== "PAST_DUE") {
    return NextResponse.json({ error: "Contract must be signed before payment" }, { status: 400 });
  }

  const { customer, planType } = contract;
  const customerEmail = customer.email;
  if (!customerEmail) {
    return NextResponse.json({ error: "No email on file for this customer" }, { status: 400 });
  }

  const stripe = getStripe();

  // Monthly is always recurring — save-card is not optional there.
  const isRecurring = interval === "monthly" || saveCard;

  // Find or create the Stripe Customer, with address so Stripe Tax can compute the right rate.
  let stripeCustomerId: string;
  const existing = await stripe.customers.list({ email: customerEmail, limit: 1 });
  if (existing.data.length > 0) {
    stripeCustomerId = existing.data[0].id;
  } else {
    const created = await stripe.customers.create({
      email: customerEmail,
      name: `${customer.firstName} ${customer.lastName ?? ""}`.trim(),
      phone: customer.phone,
      address: {
        line1: customer.address ?? undefined,
        city: customer.city ?? undefined,
        state: customer.state ?? undefined,
        postal_code: customer.zipCode ?? undefined,
        country: "US",
      },
    });
    stripeCustomerId = created.id;
  }

  // Amounts actually charged (subtotal/tax/total), for the receipt email/SMS — filled in below
  // once we know what Stripe Tax computed. Multi-system contracts (Performance Plan) bill the
  // plan price once per system via Stripe's line-item quantity.
  const quantity = contract.numberOfSystems || 1;
  let subtotalCents = Math.round((interval === "monthly" ? planType.monthlyPrice : planType.annualPrice) * 100) * quantity;
  let taxCents = 0;
  let totalCents = subtotalCents;

  try {
    if (isRecurring) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
      await stripe.customers.update(stripeCustomerId, { invoice_settings: { default_payment_method: paymentMethodId } });

      const priceId = interval === "monthly" ? planType.stripeMonthlyPriceId : planType.stripeAnnualPriceId;
      if (!priceId) return NextResponse.json({ error: "Plan is not fully configured" }, { status: 500 });

      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId, quantity }],
        default_payment_method: paymentMethodId,
        automatic_tax: { enabled: true },
        expand: ["latest_invoice"],
      });

      const latestInvoice = subscription.latest_invoice;
      if (latestInvoice && typeof latestInvoice !== "string") {
        subtotalCents = latestInvoice.subtotal ?? subtotalCents;
        totalCents = latestInvoice.total ?? totalCents;
        taxCents = totalCents - subtotalCents;
      }

      await db.maintenanceContract.update({
        where: { token },
        data: {
          status: "ACTIVE",
          billingInterval: interval,
          autoRenew: true,
          stripeSubscriptionId: subscription.id,
          paidAt: new Date(),
        },
      });
    } else {
      // Annual, card not saved: a real PaymentIntent doesn't support automatic_tax
      // directly in this Stripe API version — Invoices do, so route the one-time
      // charge through a single ad-hoc invoice instead, then detach the card
      // immediately after so nothing is left saved on the customer.
      await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });

      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        amount: subtotalCents,
        currency: "usd",
        description: `${planType.name} Maintenance Plan — Annual (one-time) × ${quantity} system${quantity === 1 ? "" : "s"}`,
      });

      const invoice = await stripe.invoices.create({
        customer: stripeCustomerId,
        collection_method: "charge_automatically",
        automatic_tax: { enabled: true },
        default_payment_method: paymentMethodId,
        metadata: { maintenanceContractId: contract.id },
      });

      const finalized = await stripe.invoices.finalizeInvoice(invoice.id!);
      const paid = await stripe.invoices.pay(finalized.id!, { payment_method: paymentMethodId });

      subtotalCents = paid.subtotal ?? subtotalCents;
      totalCents = paid.total ?? totalCents;
      taxCents = totalCents - subtotalCents;

      await stripe.paymentMethods.detach(paymentMethodId).catch((err) =>
        console.error("Failed to detach one-time payment method (non-fatal):", err)
      );

      await db.maintenanceContract.update({
        where: { token },
        data: {
          status: "PAID",
          billingInterval: "annual",
          autoRenew: false,
          stripePaymentIntentId: finalized.id, // the ad-hoc invoice id, used as the payment reference
          paidAt: new Date(),
        },
      });
    }
  } catch (err) {
    console.error("Maintenance contract payment failed", err);
    const message = err instanceof Error ? err.message : "Payment failed";
    return NextResponse.json({ error: message }, { status: 402 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dada-house.com";
  const copyUrl = `${baseUrl}/print/contract/${token}`;
  const receiptNum = `MC${contract.id.slice(-6).toUpperCase()}`;
  const subtotal = subtotalCents / 100;
  const tax = taxCents / 100;
  const total = totalCents / 100;

  const receiptHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:620px;margin:0 auto;background:white;">
    <div style="height:8px;background:#16a34a;"></div>

    <div style="background:#f0fdf4;border-bottom:1px solid #bbf7d0;padding:14px 32px;display:flex;align-items:center;gap:12px;">
      <div style="width:36px;height:36px;background:#16a34a;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="color:white;font-size:18px;font-weight:700;">&#10003;</span>
      </div>
      <div>
        <div style="font-size:14px;font-weight:700;color:#15803d;">Payment Received — Thank You!</div>
        <div style="font-size:12px;color:#166534;margin-top:2px;">${planType.name} Maintenance Plan · ${interval === "monthly" ? "Monthly" : "Annual"}</div>
      </div>
    </div>

    <div style="padding:28px 32px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <img src="https://www.dada-house.com/logo%20dada%20house.png" alt="DADA HOUSE" style="height:60px;width:auto;" />
        <div style="font-size:11px;color:#6b7280;margin-top:6px;line-height:1.6;">
          <strong>TX:</strong> 7001 South Texas 6 STE 246, Houston TX 77083<br/>
          <strong>NC:</strong> 106 Thompson St, Jacksonville NC 28540
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:20px;font-weight:700;color:#111827;letter-spacing:2px;">RECEIPT</div>
        <div style="font-size:14px;font-weight:700;color:#16a34a;margin-bottom:10px;">${receiptNum}</div>
        <div style="font-size:12px;color:#6b7280;">DATE &nbsp; <strong style="color:#111827;">${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</strong></div>
      </div>
    </div>

    <div style="padding:18px 32px;border-bottom:1px solid #e5e7eb;">
      <div style="font-size:11px;font-weight:600;color:#6b7280;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">BILLED TO</div>
      <div style="font-size:16px;font-weight:700;color:#111827;">${customer.firstName} ${customer.lastName ?? ""}</div>
      <div style="font-size:13px;color:#374151;margin-top:2px;">${customer.phone}</div>
      <div style="font-size:13px;color:#374151;">${customerEmail}</div>
    </div>

    <div style="padding:20px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#374151;">${planType.name} Maintenance Plan (${interval === "monthly" ? "Monthly" : "Annual"})${quantity > 1 ? ` × ${quantity} systems` : ""}</td>
          <td style="padding:6px 0;font-size:13px;text-align:right;color:#111827;">${fmtCur(subtotal)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#6b7280;">Tax</td>
          <td style="padding:6px 0;font-size:13px;text-align:right;color:#111827;">${fmtCur(tax)}</td>
        </tr>
        <tr style="border-top:2px solid #e5e7eb;">
          <td style="padding:10px 0 4px;font-size:14px;color:#111827;font-weight:700;">TOTAL CHARGED</td>
          <td style="padding:10px 0 4px;font-size:16px;text-align:right;color:#16a34a;font-weight:700;">${fmtCur(total)}</td>
        </tr>
      </table>
      <div style="margin-top:12px;font-size:12px;color:#6b7280;">
        ${isRecurring
          ? `This card will be billed automatically every ${interval === "monthly" ? "month" : "year"} unless you cancel.`
          : "One-time payment — your plan will not renew automatically."}
      </div>
    </div>

    <div style="padding:8px 32px 32px;text-align:center;">
      <a href="${copyUrl}" style="display:inline-block;padding:12px 28px;background:#F97316;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
        View Signed Contract &amp; Receipt
      </a>
    </div>

    <div style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#374151;margin:0 0 4px;">Thank you for trusting DADA HOUSE with your home's maintenance.</p>
      <p style="font-size:12px;color:#374151;margin:0;">Questions? Call (844) 928-0875 or visit www.dada-house.com.</p>
    </div>
  </div>
</body>
</html>`;

  const shortCopyUrl = await createShortLink(copyUrl);

  await Promise.allSettled([
    sendOutboundSms(customer.phone, `DADA HOUSE: Thanks! Your ${planType.name} maintenance plan is confirmed — ${fmtCur(total)} charged. View your receipt: ${shortCopyUrl}`),
    sendTrackedEmail({
      to: customerEmail,
      subject: `✅ Payment confirmed — ${planType.name} Maintenance Plan · DADA HOUSE`,
      html: receiptHtml,
      customerId: customer.id,
    }),
  ]);

  return NextResponse.json({ success: true });
}
