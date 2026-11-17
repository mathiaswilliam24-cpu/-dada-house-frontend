import { NextRequest, NextResponse, after } from "next/server";
import { randomUUID } from "crypto";
import type Stripe from "stripe";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import {
  approvalStatement, paymentStatement, recordSignature, requestMeta,
  customerForEstimate, ensureStripeCustomer, listCardsOnFile, quoteCard, finalizeCardPayment,
} from "@/lib/in-person-payments";
import { sendPaymentReceiptSms, notifyAdminPayment, sendEstimateReceiptEmail } from "@/lib/payment-receipts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Auth = { id: string; role: string };

async function loadEstimate(id: string, auth: Auth) {
  const isAdmin = auth.role === "ADMIN" || auth.role === "SUPER_ADMIN";
  return db.estimate.findFirst({ where: { id, ...(isAdmin ? {} : { technicianId: auth.id }) } });
}

/** Present-to-customer flow on the technician's device: review → approval signature →
 *  card (new or on file) → payment authorization signature → charge. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const estimate = await loadEstimate(id, auth);
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const customer = await customerForEstimate(estimate);
  const cards = await listCardsOnFile(customer?.stripeCustomerId).catch(() => []);
  const signatures = await db.customerSignature.findMany({
    where: { estimateId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, kind: true, signerName: true, createdAt: true, amount: true, cardLast4: true },
  });
  return NextResponse.json({ estimate, cards, canSaveCard: !!customer, signatures });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const estimate = await loadEstimate(id, auth);
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const action = String(body.action ?? "");
  const signerName = String(body.signerName ?? "").trim();
  const meta = requestMeta(req);

  try {
    // 1. Customer approves the estimate (items, tax, total) with a signature.
    if (action === "approve") {
      if (!signerName || !body.signature) return NextResponse.json({ error: "Name and signature are required" }, { status: 400 });
      if (!(estimate.total > 0)) return NextResponse.json({ error: "This estimate has no amount." }, { status: 400 });
      const customer = await customerForEstimate(estimate);
      const sig = await recordSignature({
        kind: "ESTIMATE_APPROVAL", signerName, signature: body.signature,
        statement: approvalStatement(estimate, signerName), amount: estimate.total,
        estimateId: id, appointmentId: estimate.appointmentId, customerId: customer?.id,
        collectedById: auth.id, ...meta,
      });
      const updated = await db.estimate.update({
        where: { id },
        data: {
          signatureUrl: sig.signatureUrl,
          isInvoice: true,
          convertedAt: estimate.convertedAt ?? new Date(),
          paymentToken: estimate.paymentToken ?? randomUUID(),
        },
      });
      return NextResponse.json({ estimate: updated });
    }

    if (estimate.paidAt) return NextResponse.json({ error: "This invoice is already paid." }, { status: 400 });

    // 2. Amount to authorize for the chosen card (credit cards carry the 3% fee).
    if (action === "quote" || action === "charge") {
      const paymentMethodId = String(body.paymentMethodId ?? "");
      if (!paymentMethodId) return NextResponse.json({ error: "Missing card" }, { status: 400 });
      const customer = await customerForEstimate(estimate);
      const q = await quoteCard(paymentMethodId, estimate.total);
      const pmCustomer = typeof q.pm.customer === "string" ? q.pm.customer : q.pm.customer?.id ?? null;
      if (pmCustomer && pmCustomer !== customer?.stripeCustomerId) {
        return NextResponse.json({ error: "This card is not on file for this customer." }, { status: 403 });
      }
      const isSavedCard = !!pmCustomer;
      const saveCard = !isSavedCard && !!body.saveCard && !!customer;
      const statement = paymentStatement({
        signerName: signerName || "[customer name]", estimateNumber: estimate.estimateNumber,
        invoiceTotal: estimate.total, cardFee: q.cardFee, chargeTotal: q.chargeTotal,
        brand: q.brand, last4: q.last4, saveCard,
      });

      if (action === "quote") {
        return NextResponse.json({ brand: q.brand, last4: q.last4, funding: q.funding, cardFee: q.cardFee, chargeTotal: q.chargeTotal, saveCard, statement });
      }

      // 3. Customer signs the exact amount, then the card is charged.
      if (!signerName || !body.signature) return NextResponse.json({ error: "Name and signature are required" }, { status: 400 });
      const sig = await recordSignature({
        kind: "PAYMENT_AUTHORIZATION", signerName, signature: body.signature, statement,
        amount: q.chargeTotal, cardBrand: q.brand, cardLast4: q.last4,
        estimateId: id, appointmentId: estimate.appointmentId, customerId: customer?.id,
        collectedById: auth.id, ...meta,
      });

      const stripeCustomerId = customer ? await ensureStripeCustomer(customer, estimate) : undefined;
      const stripe = getStripe();
      let pi: Stripe.PaymentIntent;
      try {
        pi = await stripe.paymentIntents.create({
          amount: Math.round(q.chargeTotal * 100),
          currency: "usd",
          customer: stripeCustomerId,
          payment_method: paymentMethodId,
          payment_method_types: ["card"],
          confirm: true,
          ...(saveCard ? { setup_future_usage: "off_session" as const } : {}),
          description: `DADA HOUSE Invoice #${estimate.estimateNumber}`,
          receipt_email: estimate.clientEmail || undefined,
          metadata: {
            estimateId: id, invoiceId: id, estimateNumber: estimate.estimateNumber,
            channel: "technician_device", technicianId: auth.id, signatureId: sig.id,
            signerName, cardFee: String(q.cardFee), cardFunding: q.funding,
          },
          expand: ["payment_method"],
        });
      } catch (err) {
        const msg = (err as { message?: string })?.message ?? "Card was declined";
        return NextResponse.json({ error: msg, signatureId: sig.id }, { status: 402 });
      }
      await db.customerSignature.update({ where: { id: sig.id }, data: { stripePaymentIntentId: pi.id } });

      if (pi.status === "requires_action") {
        return NextResponse.json({ status: "requires_action", clientSecret: pi.client_secret, paymentIntentId: pi.id });
      }
      if (pi.status !== "succeeded") return NextResponse.json({ error: "Payment was not approved." }, { status: 402 });
      return NextResponse.json(await completed(estimate, pi, auth.id));
    }

    // After 3-D Secure on the device.
    if (action === "confirm") {
      const pi = await getStripe().paymentIntents.retrieve(String(body.paymentIntentId ?? ""), { expand: ["payment_method"] });
      if (pi.metadata?.estimateId !== id) return NextResponse.json({ error: "Payment does not match this invoice" }, { status: 400 });
      if (pi.status !== "succeeded") return NextResponse.json({ error: "Payment was not approved." }, { status: 402 });
      return NextResponse.json(await completed(estimate, pi, auth.id));
    }
  } catch (err) {
    console.error("present flow error", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

async function completed(estimate: NonNullable<Awaited<ReturnType<typeof loadEstimate>>>, pi: Stripe.PaymentIntent, technicianId: string) {
  const { cardFee } = await finalizeCardPayment(estimate, pi, technicianId);
  const lineItems = (estimate.lineItems as Array<{ desc: string; rate: number; qty: number; amount: number }>) ?? [];
  const card = typeof pi.payment_method === "string" ? null : pi.payment_method?.card;
  if (estimate.clientEmail) {
    const clientEmail = estimate.clientEmail;
    after(() => sendEstimateReceiptEmail({ ...estimate, clientEmail }, lineItems, cardFee).catch(console.error));
  }
  const phone = estimate.clientMobile || estimate.clientPhone;
  if (phone) after(() => sendPaymentReceiptSms(phone, estimate.estimateNumber, estimate.total, cardFee).catch(console.error));
  after(() => notifyAdminPayment(estimate.clientName, estimate.estimateNumber, estimate.total, cardFee, "Credit Card (technician device)"));
  return { status: "succeeded", amount: pi.amount / 100, cardFee, brand: card?.brand ?? null, last4: card?.last4 ?? null };
}
