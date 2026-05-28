import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { planId, paymentMethodId } = await req.json();
  if (!planId || !paymentMethodId) {
    return NextResponse.json({ error: "planId and paymentMethodId are required" }, { status: 400 });
  }

  const plan = await db.servicePlan.findUnique({ where: { id: planId } });
  if (!plan || !plan.stripePriceId) {
    return NextResponse.json({ error: "Plan not found or not configured" }, { status: 404 });
  }

  const stripe = getStripe();
  const user = await db.user.findUnique({ where: { id: auth.id } });

  let customerId: string;
  const existing = await stripe.customers.list({ email: user!.email, limit: 1 });
  if (existing.data.length > 0) {
    customerId = existing.data[0].id;
  } else {
    const customer = await stripe.customers.create({ email: user!.email, name: user?.name ?? undefined });
    customerId = customer.id;
  }

  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: plan.stripePriceId }],
  });

  await db.customerServicePlan.upsert({
    where: { id: `${auth.id}-${planId}` },
    create: {
      id: `${auth.id}-${planId}`,
      userId: auth.id,
      planId,
      status: "ACTIVE",
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
    },
    update: {
      status: "ACTIVE",
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
    },
  });

  return NextResponse.json({ success: true, subscriptionId: subscription.id });
}
