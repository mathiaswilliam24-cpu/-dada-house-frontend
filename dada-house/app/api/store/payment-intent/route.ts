import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json();
    if (!amount || typeof amount !== "number") {
      return NextResponse.json({ error: "amount is required" }, { status: 400 });
    }
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    });
    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create payment intent" }, { status: 500 });
  }
}
