/**
 * One-off (2026-11-15): Standard maintenance plan $199/yr → $169/yr, $21/mo → $17/mo.
 * Mirrors PATCH /api/admin/maintenance-plans/[id]: Stripe prices are immutable, so new
 * ones are created on the same product and the plan row points to them. Existing
 * subscriptions keep their current price.
 *   npx tsx --env-file=.env scripts/set-standard-plan-price.ts
 */
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

const PLAN_ID = "cmtp8y76o0000kwpagqq37z0b"; // Standard
const ANNUAL = 169;
const MONTHLY = 17;

async function main() {
  const plan = await db.maintenancePlanType.findUniqueOrThrow({ where: { id: PLAN_ID } });
  if (plan.annualPrice === ANNUAL && plan.monthlyPrice === MONTHLY) {
    console.log("Already up to date.");
    return;
  }
  const stripe = getStripe();
  const productId = (await stripe.prices.retrieve(plan.stripeAnnualPriceId!)).product as string;

  const ap = await stripe.prices.create({
    product: productId, unit_amount: ANNUAL * 100, currency: "usd",
    recurring: { interval: "year" }, nickname: `${plan.name} — Annual`,
  });
  const mp = await stripe.prices.create({
    product: productId, unit_amount: MONTHLY * 100, currency: "usd",
    recurring: { interval: "month" }, nickname: `${plan.name} — Monthly`,
  });

  const updated = await db.maintenancePlanType.update({
    where: { id: PLAN_ID },
    data: { annualPrice: ANNUAL, monthlyPrice: MONTHLY, stripeAnnualPriceId: ap.id, stripeMonthlyPriceId: mp.id },
  });
  console.log(`${updated.name}: $${updated.annualPrice}/yr (${ap.id}) · $${updated.monthlyPrice}/mo (${mp.id})`);
  console.log(`Previous: $${plan.annualPrice}/yr (${plan.stripeAnnualPriceId}) · $${plan.monthlyPrice}/mo (${plan.stripeMonthlyPriceId})`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
