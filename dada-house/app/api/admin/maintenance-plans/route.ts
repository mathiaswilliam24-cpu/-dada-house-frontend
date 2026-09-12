import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const plans = await db.maintenancePlanType.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ plans });
}

/** Creating a plan here also creates its Stripe Product + two recurring
 *  Prices (monthly/annual) so the admin never has to touch Stripe directly. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { name, monthlyPrice, annualPrice, contractHtml, sortOrder } = await req.json();
  if (!name || !monthlyPrice || !annualPrice || !contractHtml) {
    return NextResponse.json({ error: "name, monthlyPrice, annualPrice, and contractHtml are required" }, { status: 400 });
  }

  const stripe = getStripe();
  const product = await stripe.products.create({
    name: `DADA HOUSE ${name} HVAC Maintenance Plan`,
  });
  const monthly = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(parseFloat(monthlyPrice) * 100),
    currency: "usd",
    recurring: { interval: "month" },
    nickname: `${name} — Monthly`,
  });
  const annual = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(parseFloat(annualPrice) * 100),
    currency: "usd",
    recurring: { interval: "year" },
    nickname: `${name} — Annual`,
  });

  const plan = await db.maintenancePlanType.create({
    data: {
      name,
      monthlyPrice: parseFloat(monthlyPrice),
      annualPrice: parseFloat(annualPrice),
      stripeMonthlyPriceId: monthly.id,
      stripeAnnualPriceId: annual.id,
      contractHtml,
      sortOrder: sortOrder ?? 0,
    },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
