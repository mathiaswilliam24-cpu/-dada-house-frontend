import { NextRequest, NextResponse } from "next/server";
import { voiceAuthError, toolArgs } from "@/lib/voice-agent";
import { PRICING, calcPropertyAnnual, calcPropertyMonthly } from "@/lib/enrollment-pricing";
import { activePromotions, findPromotion, applyPromo } from "@/lib/promotions";

export const dynamic = "force-dynamic";

/** What the plan includes — must stay identical to the public plan page and agreement. */
const PLAN_BENEFITS = [
  "Two tune-ups per membership year: one spring cooling tune-up and one fall heating tune-up (16-point inspection each)",
  "10% off HVAC repairs (parts and labor) during the membership year",
  "$69 service call fee for members if something breaks between tune-ups",
  "Priority scheduling",
  "Reminder before each seasonal tune-up",
];

/**
 * AI receptionist tool — maintenance plan terms, price quote and current promotions.
 * GET /api/voice-agent/plan?systems=2&billing=annual&promoCode=SAVE10
 * Prices come from the same pricing engine as the online checkout. Taxes, if any, are shown on
 * the secure checkout page. Promotions are live Stripe promotion codes only.
 */
export async function GET(req: NextRequest) {
  const denied = voiceAuthError(req); if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  const systems = Math.min(20, Math.max(1, Number(sp.get("systems") ?? 1) || 1));
  const billing = sp.get("billing") === "monthly" ? "monthly" : "annual";
  const code = (sp.get("promoCode") ?? "").trim();

  const annual = calcPropertyAnnual(systems), monthly = calcPropertyMonthly(systems);
  let promotions: Awaited<ReturnType<typeof activePromotions>> = [];
  let promoError: string | null = null;
  try { promotions = await activePromotions(); } catch (e) { promoError = "Promotions could not be checked right now — quote the standard price and do not promise a discount."; console.error(e); }
  const promo = code ? await findPromotion(code).catch(() => null) : null;
  const base = billing === "annual" ? annual : monthly;

  return NextResponse.json({
    plan: "DADA HOUSE HVAC Maintenance Plan",
    benefits: PLAN_BENEFITS,
    pricing: {
      annual: { firstSystem: PRICING.annual.base, eachAdditionalSystemSameAddress: PRICING.annual.additional },
      monthly: { firstSystem: PRICING.monthly.base, eachAdditionalSystemSameAddress: PRICING.monthly.additional, commitment: "12 months" },
      note: "Per service address: each additional address starts again at the first-system price.",
    },
    quote: {
      systems, billing, amount: base,
      text: billing === "annual" ? `$${annual}/year for ${systems} system${systems > 1 ? "s" : ""} at one address` : `$${monthly.toFixed(2)}/month for ${systems} system${systems > 1 ? "s" : ""} at one address (12-month commitment)`,
      promoCode: code || null,
      promoValid: code ? !!promo : null,
      firstPaymentAfterPromo: promo ? applyPromo(base, promo) : null,
      promoDetails: promo,
      taxes: "Shown on the secure checkout page if applicable.",
    },
    promotions,
    message: promoError ?? (promotions.length
      ? `Active promotions: ${promotions.map((p) => `${p.code} = ${p.description}${p.expiresAt ? ` (until ${p.expiresAt.slice(0, 10)})` : ""}${p.firstTimeOnly ? ", new customers only" : ""}`).join("; ")}. Only mention these.`
      : "No active promotion right now — quote the standard price."),
  });
}

/** Same as GET, with the arguments in a JSON body (Vapi API-request / function tools). */
export async function POST(req: NextRequest) {
  const denied = voiceAuthError(req); if (denied) return denied;
  const a = await toolArgs(req);
  const u = new URL(req.url);
  for (const k of ["systems", "billing", "promoCode"]) if (a[k] != null && a[k] !== "") u.searchParams.set(k, String(a[k]));
  return GET(new NextRequest(u, { headers: req.headers }));
}
