import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { normalizePhone } from "@/lib/customers";

export const runtime = "nodejs";

async function sendConfirmationEmail(contract: {
  id: string;
  membershipNumber: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  numberOfSystems: number;
  billingInterval: string | null;
  annualTotal: number | null;
  monthlyTotal: number | null;
  membershipStartDate: Date | null;
  renewalDate: Date | null;
}) {
  if (!contract.email) return;
  const isAnnual = contract.billingInterval === "annual";
  const amount = isAnnual ? contract.annualTotal : contract.monthlyTotal;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: contract.email,
    subject: `Welcome to DADA HOUSE HVAC Maintenance Plan — #${contract.membershipNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
        <div style="background:#0A1628;padding:32px 24px;text-align:center">
          <h1 style="color:#F7921A;margin:0;font-size:24px">DADA HOUSE</h1>
          <p style="color:#94a3b8;margin:8px 0 0;font-size:14px">HVAC Maintenance Plan</p>
        </div>
        <div style="padding:32px 24px">
          <h2 style="color:#0A1628;margin:0 0 8px">Welcome to the DADA HOUSE Comfort Family! 🎉</h2>
          <p style="color:#64748b;margin:0 0 24px">Hi ${contract.firstName}, your HVAC Maintenance Plan is now active.</p>

          <div style="background:#F8FAFC;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px">
            <table style="width:100%;font-size:14px;color:#334155">
              <tr><td style="padding:4px 0;color:#64748b">Membership Number</td><td style="text-align:right;font-weight:bold;color:#F7921A">${contract.membershipNumber}</td></tr>
              <tr><td style="padding:4px 0;color:#64748b">Systems Covered</td><td style="text-align:right;font-weight:bold">${contract.numberOfSystems}</td></tr>
              <tr><td style="padding:4px 0;color:#64748b">Billing</td><td style="text-align:right;font-weight:bold">${isAnnual ? `$${amount?.toFixed(0)}/year` : `$${amount?.toFixed(2)}/month`}</td></tr>
              ${contract.membershipStartDate ? `<tr><td style="padding:4px 0;color:#64748b">Start Date</td><td style="text-align:right;font-weight:bold">${new Date(contract.membershipStartDate).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</td></tr>` : ""}
            </table>
          </div>

          <p style="color:#334155;font-size:14px"><strong>What's next?</strong></p>
          <ul style="color:#64748b;font-size:14px;line-height:1.8">
            <li>Our scheduling team will contact you within 24 hours to confirm your first tune-up appointment.</li>
            <li>You'll receive appointment reminders 48 and 24 hours before your visit.</li>
            <li>As a member, call <strong>(844) 928-0875</strong> for priority service anytime.</li>
          </ul>

          <div style="text-align:center;margin-top:28px">
            <a href="https://dada-house.com/dashboard" style="background:#1B3FA8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px">Access Your Dashboard →</a>
          </div>
        </div>
        <div style="background:#F8FAFC;padding:16px 24px;text-align:center;font-size:12px;color:#94a3b8">
          DADA HOUSE · (844) 928-0875 · Texas &amp; North Carolina<br>
          <a href="mailto:customerservice@dada-house.com" style="color:#94a3b8">customerservice@dada-house.com</a>
        </div>
      </div>
    `,
  }).catch(err => console.error("Confirmation email error:", err));
}

async function sendConfirmationSMS(contract: {
  phone: string | null;
  membershipNumber: string | null;
  firstName: string | null;
  numberOfSystems: number;
}) {
  if (!contract.phone) return;
  const phone = normalizePhone(contract.phone);
  const msg = `Hi ${contract.firstName}! 🏠 Your DADA HOUSE HVAC Maintenance Plan is active (Membership #${contract.membershipNumber}). ${contract.numberOfSystems} system${contract.numberOfSystems !== 1 ? "s" : ""} covered. We'll schedule your first tune-up soon. Call (844) 928-0875 for priority service. Reply STOP to opt out.`;
  await sendSMS(phone, msg).catch(err => console.error("Confirmation SMS error:", err));
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn("STRIPE_WEBHOOK_SECRET not set — skipping signature verification");
  }

  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: unknown) {
    console.error("Stripe webhook signature error:", err);
    return NextResponse.json({ error: "Webhook signature invalid" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const contractId = session.metadata?.contractId;
        if (!contractId) break;

        const contract = await db.maintenanceContract.findUnique({ where: { id: contractId } });
        if (!contract) break;

        const now = new Date();
        const renewalDate = new Date(now);
        if (contract.billingInterval === "annual") {
          renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        } else {
          renewalDate.setMonth(renewalDate.getMonth() + 1);
        }

        const updated = await db.maintenanceContract.update({
          where: { id: contractId },
          data: {
            status: "ACTIVE",
            stripeSubscriptionId: session.subscription as string,
            stripeCustomerId: session.customer as string,
            paidAt: now,
            membershipStartDate: now,
            renewalDate,
            signedAt: now,
          },
        });

        // Send confirmations
        await Promise.all([
          sendConfirmationEmail(updated),
          sendConfirmationSMS(updated),
        ]);

        // Update Stripe customer metadata
        if (session.customer && typeof session.customer === "string") {
          await stripe.customers.update(session.customer, {
            metadata: { contractId, membershipNumber: updated.membershipNumber ?? "" },
          }).catch(() => {});
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db.maintenanceContract.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: "CANCELLED" },
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        if (sub.status === "past_due") {
          await db.maintenanceContract.updateMany({
            where: { stripeSubscriptionId: sub.id },
            data: { status: "PAST_DUE" },
          });
        } else if (sub.status === "active") {
          await db.maintenanceContract.updateMany({
            where: { stripeSubscriptionId: sub.id },
            data: { status: "ACTIVE" },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : (invoice.subscription?.id ?? invoice.parent?.subscription_details?.subscription ?? null);
        if (subId) {
          const contract = await db.maintenanceContract.findFirst({ where: { stripeSubscriptionId: subId } });
          if (contract?.email) {
            await resend.emails.send({
              from: FROM_EMAIL,
              to: contract.email,
              subject: "Action Required: DADA HOUSE Maintenance Plan Payment Failed",
              html: `<p>Hi ${contract.firstName}, your HVAC Maintenance Plan payment could not be processed. Please update your payment method to keep your membership active. Call us at (844) 928-0875 or visit your customer dashboard.</p>`,
            }).catch(() => {});
          }
        }
        break;
      }
    }
  } catch (err: unknown) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
