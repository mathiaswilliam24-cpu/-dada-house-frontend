import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { jobPaymentSchema } from "@/lib/validations";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const payments = await db.jobPayment.findMany({
    where: { appointmentId: id },
    orderBy: { createdAt: "asc" },
  });
  const total = payments.reduce((s, p) => s + p.amount, 0);
  return NextResponse.json({ payments, total });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const result = jobPaymentSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { amount, method, reference, notes } = result.data;

  let stripePaymentIntentId: string | undefined;

  // For card payments, create a Stripe payment link
  if (method === "CARD" && body.createStripeLink) {
    try {
      const stripe = getStripe();
      const appt = await db.appointment.findFirst({
        where: { id },
        select: { name: true, email: true },
      });
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        receipt_email: appt?.email,
        metadata: { appointmentId: id, collectedBy: auth.id },
      });
      stripePaymentIntentId = intent.id;
    } catch (err) {
      console.error("Stripe error:", err);
    }
  }

  const payment = await db.jobPayment.create({
    data: {
      appointmentId: id,
      amount,
      method,
      reference: reference ?? null,
      notes: notes ?? null,
      collectedBy: auth.id,
      stripePaymentIntentId: stripePaymentIntentId ?? null,
    },
  });

  // Update invoice status if invoice exists
  await db.invoice.updateMany({
    where: { appointmentId: id },
    data: { status: "PAID", paidAt: new Date() },
  }).catch(() => {});

  return NextResponse.json({ payment });
}
