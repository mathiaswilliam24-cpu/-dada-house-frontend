import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { getStripe } from "@/lib/stripe";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  code: z.string().min(3).max(20).regex(/^[A-Z0-9_-]+$/, "Uppercase letters, numbers, dashes only"),
  name: z.string().min(1),
  type: z.enum(["percent", "fixed"]),
  amount: z.number().positive(),
  maxUses: z.number().int().positive().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const stripe = getStripe();
  const [activeCodes, inactiveCodes] = await Promise.all([
    stripe.promotionCodes.list({ limit: 100, active: true }),
    stripe.promotionCodes.list({ limit: 50, active: false }),
  ]);

  const all = [...activeCodes.data, ...inactiveCodes.data].map((pc) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coupon = (pc as any).coupon as { name?: string; percent_off?: number | null; amount_off?: number | null } ?? {};
    return {
      id: pc.id,
      code: pc.code,
      name: (coupon.name as string | undefined) ?? pc.code,
      active: pc.active,
      type: coupon.percent_off != null ? "percent" : "fixed",
      amount: coupon.percent_off ?? (coupon.amount_off != null ? coupon.amount_off / 100 : 0),
      timesRedeemed: pc.times_redeemed,
      maxRedemptions: pc.max_redemptions,
      expiresAt: pc.expires_at ? new Date(pc.expires_at * 1000).toISOString() : null,
      createdAt: new Date(pc.created * 1000).toISOString(),
    };
  });

  all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return NextResponse.json({ codes: all });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  }

  const { code, name, type, amount, maxUses, expiresAt } = parsed.data;
  const stripe = getStripe();

  try {
    const coupon = await stripe.coupons.create({
      name,
      ...(type === "percent"
        ? { percent_off: amount }
        : { amount_off: Math.round(amount * 100), currency: "usd" }),
      duration: "once",
      ...(maxUses ? { max_redemptions: maxUses } : {}),
      ...(expiresAt ? { redeem_by: Math.floor(new Date(expiresAt).getTime() / 1000) } : {}),
    });

    const promoCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code,
      ...(maxUses ? { max_redemptions: maxUses } : {}),
      ...(expiresAt ? { expires_at: Math.floor(new Date(expiresAt).getTime() / 1000) } : {}),
    });

    return NextResponse.json({
      id: promoCode.id,
      code: promoCode.code,
      name,
      type,
      amount,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
