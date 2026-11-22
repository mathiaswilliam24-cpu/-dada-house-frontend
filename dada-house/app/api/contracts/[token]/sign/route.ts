import { NextRequest, NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { formatCurrency } from "@/lib/utils";
import { sendTrackedEmail } from "@/lib/customer-email";
import { alertOffice } from "@/lib/voice-agent";
import { renderMaintenanceContractPdf } from "@/lib/pdf/maintenance-contract";
import { CONTRACT_SIGNATURE_STATEMENT, fillContractHtml, fmtDate, fmtUsd, getPaymentReceipt } from "@/lib/maintenance-contract";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAID_STATUSES = ["ACTIVE", "PAID", "PAST_DUE"];
const MAX_SIGNATURE_BYTES = 400_000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { signatureUrl, systemMakeModel, systemAge } = await req.json();
  if (typeof signatureUrl !== "string" || !signatureUrl.startsWith("data:image/png;base64,") || signatureUrl.length > MAX_SIGNATURE_BYTES) {
    return NextResponse.json({ error: "Signature is required" }, { status: 400 });
  }

  const contract = await db.maintenanceContract.findUnique({ where: { token } });
  if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

  // Paid plan (online enrollment or phone registration): the customer signs the agreement after paying.
  if (PAID_STATUSES.includes(contract.status)) return signPaidContract(req, contract.id, signatureUrl);

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

const escHtml = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

async function signPaidContract(req: NextRequest, contractId: string, signatureUrl: string) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  const signedAt = new Date();

  // Sign once: the first signature is the one on file (no overwrite).
  const claimed = await db.maintenanceContract.updateMany({
    where: { id: contractId, customerSignatureUrl: null },
    data: { customerSignatureUrl: signatureUrl, signedAt, agreementAcceptedAt: signedAt },
  });
  const contract = await db.maintenanceContract.findUniqueOrThrow({
    where: { id: contractId },
    include: { customer: true, planType: true, properties: { orderBy: { createdAt: "asc" } }, hvacSystems: true },
  });
  if (claimed.count === 0) return NextResponse.json({ contract, alreadySigned: true });

  const name = [contract.firstName ?? contract.customer.firstName, contract.lastName ?? contract.customer.lastName].filter(Boolean).join(" ");
  const email = contract.email ?? contract.customer.email;
  const phone = contract.phone ?? contract.customer.phone;
  const systems = contract.numberOfSystems || 1;
  const planPrice = contract.billingInterval === "monthly"
    ? (contract.monthlyTotal ?? contract.planType.monthlyPrice * systems)
    : (contract.annualTotal ?? contract.planType.annualPrice * systems);

  await db.customerSignature.create({
    data: {
      kind: "MAINTENANCE_AGREEMENT", customerId: contract.customerId, signerName: name || "Customer", signatureUrl,
      statement: `${CONTRACT_SIGNATURE_STATEMENT} (contract ${contract.id}${contract.membershipNumber ? `, membership ${contract.membershipNumber}` : ""})`,
      amount: planPrice, ipAddress: ip, userAgent,
    },
  }).catch((e) => console.error("contract signature evidence", e));

  // PDF + email + office alert after the response (the customer sees "signed" right away).
  after(async () => {
    try {
      const receipt = await getPaymentReceipt(contract);
      const contractNumber = `MC${contract.id.slice(-6).toUpperCase()}`;
      const pdf = await renderMaintenanceContractPdf({
        contractNumber, membershipNumber: contract.membershipNumber, planName: contract.planType.name,
        customerName: name || "Customer", email, phone,
        properties: contract.properties, numberOfSystems: systems,
        billingInterval: contract.billingInterval, autoRenew: contract.autoRenew, planPrice,
        startDate: contract.membershipStartDate ?? contract.paidAt, renewalDate: contract.renewalDate,
        contractHtml: fillContractHtml(contract.planType.contractHtml, contract),
        signatureUrl, signedAt, signerIp: ip, statement: CONTRACT_SIGNATURE_STATEMENT, receipt,
      });
      const base = (process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");
      const viewUrl = `${base}/print/contract/${contract.token}`;

      if (email) {
        const rows: [string, string][] = [
          ["Membership", contract.membershipNumber ? `#${contract.membershipNumber}` : contractNumber],
          ["Plan", `${contract.planType.name} HVAC Maintenance Plan — ${contract.billingInterval === "monthly" ? "Monthly" : "Annual"}`],
          ["Systems covered", String(systems)],
          ["Payment date", fmtDate(receipt.paidAt)],
          ["Amount paid", receipt.amountPaid != null ? fmtUsd(receipt.amountPaid) : "See your Stripe receipt"],
          ...(receipt.invoiceNumber ? [["Invoice", receipt.invoiceNumber] as [string, string]] : []),
          ["Signed", signedAt.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "long", timeStyle: "short" }) + " ET"],
        ];
        await sendTrackedEmail({
          to: email, customerId: contract.customerId,
          subject: `Your signed DADA HOUSE maintenance contract and payment receipt${contract.membershipNumber ? ` — #${contract.membershipNumber}` : ""}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#0A1628;padding:24px;text-align:center"><h1 style="color:#F7921A;margin:0;font-size:22px">DADA HOUSE</h1>
                <p style="color:#94a3b8;margin:6px 0 0;font-size:13px">HVAC Maintenance Plan</p></div>
              <div style="padding:24px">
                <p style="font-size:15px;color:#0A1628;margin:0 0 8px"><strong>Hi ${escHtml(contract.firstName ?? contract.customer.firstName ?? "")}, thank you for signing your maintenance contract.</strong></p>
                <p style="color:#475569;font-size:14px;margin:0 0 18px">Your signed contract and your payment receipt are attached to this email (PDF). Please keep them for your records.</p>
                <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse;background:#F8FAFC;border:1px solid #e2e8f0;border-radius:10px">
                  ${rows.map(([k, v]) => `<tr><td style="padding:7px 12px;color:#64748b">${k}</td><td style="padding:7px 12px;text-align:right;font-weight:bold">${escHtml(v)}</td></tr>`).join("")}
                </table>
                <div style="text-align:center;margin-top:22px">
                  <a href="${viewUrl}" style="background:#1B3FA8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">View my signed contract</a>
                  ${receipt.receiptUrl ? `<p style="margin-top:14px;font-size:13px"><a href="${receipt.receiptUrl}" style="color:#1B3FA8">Online payment receipt</a></p>` : ""}
                </div>
                <p style="color:#94a3b8;font-size:12px;margin-top:24px;text-align:center">Questions? Call (844) 928-0875 or email customerservice@dada-house.com</p>
              </div>
            </div>`,
          attachmentBuffers: [{ filename: `DADA-HOUSE-maintenance-contract-${contract.membershipNumber ?? contractNumber}.pdf`, content: Buffer.from(pdf) }],
        });
      }

      await alertOffice({
        title: "MAINTENANCE CONTRACT SIGNED",
        url: `/customers/${contract.customerId}`,
        tag: `contract-signed-${contract.id}`,
        text: [`Customer: ${name || "-"}`, `Phone: ${phone ?? "-"}`, `Membership: ${contract.membershipNumber ?? contractNumber}`,
          `Signed copy + receipt emailed: ${email ? "yes" : "no email on file"}`, `Contract: ${viewUrl}`].join("\n"),
      }).catch(console.error);
    } catch (err) {
      console.error("signed contract email", err);
    }
  });

  return NextResponse.json({ contract, emailedTo: email ?? null });
}
