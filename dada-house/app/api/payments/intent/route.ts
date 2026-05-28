import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { amount, currency = "usd", appointmentId, orderId } = await req.json();
  if (!amount || typeof amount !== "number") {
    return NextResponse.json({ error: "amount is required" }, { status: 400 });
  }

  const stripe = getStripe();
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata: {
      userId: auth.id,
      appointmentId: appointmentId ?? "",
      orderId: orderId ?? "",
    },
  });

  await db.payment.upsert({
    where: { stripePaymentIntentId: intent.id },
    create: {
      userId: auth.id,
      appointmentId: appointmentId ?? null,
      orderId: orderId ?? null,
      amount,
      currency,
      status: intent.status,
      stripePaymentIntentId: intent.id,
    },
    update: { status: intent.status },
  });

  return NextResponse.json({ clientSecret: intent.client_secret, intentId: intent.id });
}
