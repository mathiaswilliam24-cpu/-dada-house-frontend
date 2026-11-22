import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPortalInvite } from "@/lib/portal-access";

export const dynamic = "force-dynamic";

/** Public: what the personal "create your account" link pre-fills (only for a valid, unexpired invite). */
export async function GET(req: NextRequest) {
  const customerId = verifyPortalInvite(new URL(req.url).searchParams.get("token"));
  if (!customerId) return NextResponse.json({ error: "This link has expired. You can still create your account below." }, { status: 404 });
  const c = await db.customer.findUnique({ where: { id: customerId }, select: { firstName: true, lastName: true, email: true, phone: true, userId: true } });
  if (!c) return NextResponse.json({ error: "This link has expired. You can still create your account below." }, { status: 404 });
  return NextResponse.json({
    firstName: c.firstName, name: [c.firstName, c.lastName].filter(Boolean).join(" "), email: c.email ?? "",
    phoneLast4: c.phone.replace(/\D/g, "").slice(-4), hasAccount: !!c.userId,
  });
}
