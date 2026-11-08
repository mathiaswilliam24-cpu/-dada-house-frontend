import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { name, monthlyPrice, annualPrice, contractHtml, isActive, sortOrder } = body;

  const existing = await db.maintenancePlanType.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  // If prices changed, create new Stripe prices (Stripe prices are immutable)
  let stripeMonthlyPriceId = existing.stripeMonthlyPriceId;
  let stripeAnnualPriceId  = existing.stripeAnnualPriceId;

  if ((monthlyPrice !== undefined && monthlyPrice !== existing.monthlyPrice) ||
      (annualPrice  !== undefined && annualPrice  !== existing.annualPrice)) {
    try {
      const stripe      = getStripe();
      const productName = `DADA HOUSE ${name ?? existing.name} HVAC Maintenance Plan`;

      // Ensure a Stripe product exists
      let productId = existing.stripeMonthlyPriceId
        ? (await stripe.prices.retrieve(existing.stripeMonthlyPriceId)).product as string
        : null;

      if (!productId) {
        const product = await stripe.products.create({ name: productName });
        productId = product.id;
      }

      if (monthlyPrice !== undefined && monthlyPrice !== existing.monthlyPrice) {
        const mp = await stripe.prices.create({
          product: productId,
          unit_amount: Math.round(parseFloat(monthlyPrice) * 100),
          currency: "usd",
          recurring: { interval: "month" },
          nickname: `${name ?? existing.name} — Monthly`,
        });
        stripeMonthlyPriceId = mp.id;
      }

      if (annualPrice !== undefined && annualPrice !== existing.annualPrice) {
        const ap = await stripe.prices.create({
          product: productId,
          unit_amount: Math.round(parseFloat(annualPrice) * 100),
          currency: "usd",
          recurring: { interval: "year" },
          nickname: `${name ?? existing.name} — Annual`,
        });
        stripeAnnualPriceId = ap.id;
      }
    } catch (err) {
      console.error("Stripe price update failed:", err);
      // Continue — DB update still happens even if Stripe fails
    }
  }

  const plan = await db.maintenancePlanType.update({
    where: { id },
    data: {
      ...(name         !== undefined && { name }),
      ...(monthlyPrice !== undefined && { monthlyPrice: parseFloat(monthlyPrice) }),
      ...(annualPrice  !== undefined && { annualPrice:  parseFloat(annualPrice)  }),
      ...(contractHtml !== undefined && { contractHtml }),
      ...(isActive     !== undefined && { isActive }),
      ...(sortOrder    !== undefined && { sortOrder }),
      stripeMonthlyPriceId,
      stripeAnnualPriceId,
    },
  });
  return NextResponse.json({ plan });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(_req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await db.maintenancePlanType.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
