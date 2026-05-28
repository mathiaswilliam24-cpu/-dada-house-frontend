import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    await db.payment.updateMany({
      where: { stripePaymentIntentId: intent.id },
      data: { status: "succeeded" },
    });

    // Mark invoice PAID if linked
    if (intent.metadata.appointmentId) {
      await db.invoice.updateMany({
        where: { appointmentId: intent.metadata.appointmentId },
        data: { status: "PAID", paidAt: new Date(), stripePaymentIntentId: intent.id },
      });
    }

    // Mark order as PROCESSING if linked
    if (intent.metadata.orderId) {
      await db.order.updateMany({
        where: { id: intent.metadata.orderId },
        data: { status: "PROCESSING", paidAt: new Date(), stripePaymentIntentId: intent.id },
      });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object;
    const status = event.type === "customer.subscription.deleted" ? "CANCELLED" :
      sub.status === "active" ? "ACTIVE" :
      sub.status === "past_due" ? "PAST_DUE" :
      sub.status === "paused" ? "PAUSED" : "CANCELLED";

    await db.customerServicePlan.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: {
        status,
        currentPeriodEnd: new Date(((sub as unknown) as { current_period_end: number }).current_period_end * 1000),
      },
    });
  }

  return NextResponse.json({ received: true });
}
