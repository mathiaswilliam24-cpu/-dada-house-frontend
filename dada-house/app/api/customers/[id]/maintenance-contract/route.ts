import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendOutboundSms } from "@/lib/messaging";
import { sendTrackedEmail } from "@/lib/customer-email";
import { createShortLink } from "@/lib/short-links";
import { formatCurrency } from "@/lib/utils";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const { planTypeId, systemMakeModel, systemAge } = await req.json();
  if (!planTypeId) return NextResponse.json({ error: "planTypeId is required" }, { status: 400 });

  const [customer, planType] = await Promise.all([
    db.customer.findUnique({ where: { id } }),
    db.maintenancePlanType.findUnique({ where: { id: planTypeId } }),
  ]);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  if (!planType) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const token = crypto.randomBytes(32).toString("hex");
  const contract = await db.maintenanceContract.create({
    data: {
      customerId: customer.id,
      planTypeId,
      token,
      systemMakeModel: systemMakeModel || undefined,
      systemAge: systemAge || undefined,
      repName: auth.name || undefined,
      sentById: auth.id,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dada-house.com";
  const fullUrl = `${baseUrl}/contract/${token}`;
  const shortUrl = await createShortLink(fullUrl);

  const priceLine = `${formatCurrency(planType.monthlyPrice)}/mo or ${formatCurrency(planType.annualPrice)}/yr`;

  const results = await Promise.allSettled([
    sendOutboundSms(
      customer.phone,
      `DADA HOUSE: Hi ${customer.firstName}, please review and sign your ${planType.name} maintenance plan agreement (${priceLine}) here: ${shortUrl}`,
      { sentById: auth.id }
    ),
    customer.email
      ? sendTrackedEmail({
          to: customer.email,
          subject: `Your DADA HOUSE ${planType.name} Maintenance Plan Agreement — ${priceLine}`,
          html: `<p>Hi ${customer.firstName},</p><p>Please review and sign your ${planType.name} maintenance plan agreement (<strong>${priceLine}</strong>) using the link below:</p><p><a href="${fullUrl}">${fullUrl}</a></p><p>DADA HOUSE</p>`,
          customerId: customer.id,
          sentById: auth.id,
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    contract,
    smsSent: results[0].status === "fulfilled",
    emailSent: results[1].status === "fulfilled" && !!customer.email,
  }, { status: 201 });
}
