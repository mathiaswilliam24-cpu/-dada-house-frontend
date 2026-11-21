import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

/**
 * Maintenance-plan promotions = active Stripe promotion codes (the same codes customers can type
 * at checkout). Nothing is invented: a promotion exists only if Stripe returns it as usable now.
 */
export type Promo = {
  id: string; code: string; description: string;
  percentOff: number | null; amountOff: number | null; // amountOff in dollars
  duration: string; durationMonths: number | null;
  expiresAt: string | null; firstTimeOnly: boolean; minimumAmount: number | null;
  remaining: number | null;
};

function describe(c: Stripe.Coupon) {
  const off = c.percent_off != null ? `${c.percent_off}% off` : c.amount_off != null ? `$${(c.amount_off / 100).toFixed(2).replace(/\.00$/, "")} off` : "discount";
  const dur = c.duration === "once" ? "the first payment" : c.duration === "forever" ? "every payment" : `the first ${c.duration_in_months} months`;
  return `${off} ${dur}`;
}

function usable(p: Stripe.PromotionCode, now = Date.now() / 1000): Stripe.Coupon | null {
  const c = p.promotion?.coupon;
  if (!p.active || !c || typeof c === "string" || !c.valid) return null;
  if (p.expires_at && p.expires_at < now) return null;
  if (c.redeem_by && c.redeem_by < now) return null;
  if (p.max_redemptions != null && p.times_redeemed >= p.max_redemptions) return null;
  if (c.max_redemptions != null && c.times_redeemed >= c.max_redemptions) return null;
  if (c.currency && c.amount_off != null && c.currency !== "usd") return null;
  return c;
}

function toPromo(p: Stripe.PromotionCode, c: Stripe.Coupon): Promo {
  const left = [p.max_redemptions != null ? p.max_redemptions - p.times_redeemed : null, c.max_redemptions != null ? c.max_redemptions - c.times_redeemed : null].filter((x): x is number => x != null);
  return {
    id: p.id, code: p.code, description: describe(c),
    percentOff: c.percent_off ?? null, amountOff: c.amount_off != null ? c.amount_off / 100 : null,
    duration: c.duration, durationMonths: c.duration_in_months ?? null,
    expiresAt: p.expires_at ? new Date(p.expires_at * 1000).toISOString() : c.redeem_by ? new Date(c.redeem_by * 1000).toISOString() : null,
    firstTimeOnly: !!p.restrictions?.first_time_transaction,
    minimumAmount: p.restrictions?.minimum_amount != null ? p.restrictions.minimum_amount / 100 : null,
    remaining: left.length ? Math.min(...left) : null,
  };
}

export async function activePromotions(): Promise<Promo[]> {
  const res = await getStripe().promotionCodes.list({ active: true, limit: 50, expand: ["data.promotion.coupon"] });
  return res.data.flatMap((p) => { const c = usable(p); return c ? [toPromo(p, c)] : []; });
}

export async function findPromotion(code: string): Promise<Promo | null> {
  const res = await getStripe().promotionCodes.list({ code: code.trim(), active: true, limit: 1, expand: ["data.promotion.coupon"] });
  const p = res.data[0];
  const c = p ? usable(p) : null;
  return p && c ? toPromo(p, c) : null;
}

/** First-payment price after a promotion (the checkout page shows Stripe's final amount, taxes included). */
export function applyPromo(amount: number, promo: Promo | null) {
  if (!promo) return amount;
  if (promo.minimumAmount != null && amount < promo.minimumAmount) return amount;
  const off = promo.percentOff != null ? amount * (promo.percentOff / 100) : promo.amountOff ?? 0;
  return Math.max(0, Math.round((amount - off) * 100) / 100);
}
