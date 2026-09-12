import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { signatureUrl, systemMakeModel, systemAge } = await req.json();
  if (!signatureUrl) return NextResponse.json({ error: "Signature is required" }, { status: 400 });

  const contract = await db.maintenanceContract.findUnique({ where: { token } });
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  const updated = await db.maintenanceContract.update({
    where: { token },
    data: {
      customerSignatureUrl: signatureUrl,
      signedAt: new Date(),
      status: "SIGNED",
      agreementStartDate: contract.agreementStartDate ?? new Date(),
      ...(systemMakeModel && { systemMakeModel }),
      ...(systemAge && { systemAge }),
    },
    include: { customer: true, planType: true },
  });

  const { customer, planType } = updated;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dada-house.com";
  const customerUrl = `${baseUrl}/customers/${customer.id}`;
  const priceLine = `${formatCurrency(planType.monthlyPrice)}/mo or ${formatCurrency(planType.annualPrice)}/yr`;

  await Promise.allSettled([
    process.env.ADMIN_PHONE
      ? sendSMS(
          process.env.ADMIN_PHONE,
          `DADA HOUSE: ${customer.firstName} ${customer.lastName ?? ""} just signed the ${planType.name} maintenance plan (${priceLine}). Awaiting payment. ${customerUrl}`
        )
      : Promise.resolve(),
    process.env.APPOINTMENT_ALERT_EMAIL
      ? resend.emails.send({
          from: FROM_EMAIL,
          to: process.env.APPOINTMENT_ALERT_EMAIL,
          subject: `[CONTRACT SIGNED] ${planType.name} — ${customer.firstName} ${customer.lastName ?? ""}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px;">
              <div style="background:#1B3FA8;color:white;border-radius:8px;padding:14px 18px;margin-bottom:16px;">
                <p style="margin:0;font-size:14px;font-weight:700;">✅ Maintenance contract signed</p>
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <tr><td style="padding:6px 0;color:#6b7280;width:100px;">Client</td><td style="padding:6px 0;color:#111827;">${customer.firstName} ${customer.lastName ?? ""}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;">Phone</td><td style="padding:6px 0;color:#111827;">${customer.phone}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;">Plan</td><td style="padding:6px 0;font-weight:700;color:#1B3FA8;">${planType.name} — ${priceLine}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;">Status</td><td style="padding:6px 0;color:#111827;">Signed — awaiting payment</td></tr>
              </table>
              <div style="margin-top:16px;">
                <a href="${customerUrl}" style="display:inline-block;padding:10px 20px;background:#F97316;color:white;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">View Customer</a>
              </div>
            </div>`,
        })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ contract: updated });
}
