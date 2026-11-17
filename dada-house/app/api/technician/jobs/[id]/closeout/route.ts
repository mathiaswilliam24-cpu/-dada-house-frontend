import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  workCompletionStatement, paymentAcknowledgmentStatement, recordSignature, requestMeta,
} from "@/lib/in-person-payments";

export const dynamic = "force-dynamic";

const KINDS = ["WORK_COMPLETION", "PAYMENT_ACKNOWLEDGMENT"] as const;
type Kind = (typeof KINDS)[number];

async function context(id: string, auth: { id: string; role: string }) {
  const isAdmin = auth.role === "ADMIN" || auth.role === "SUPER_ADMIN";
  const appt = await db.appointment.findFirst({
    where: { id, ...(isAdmin ? {} : { technicianId: auth.id }) },
    select: { id: true, name: true, customerId: true },
  });
  if (!appt) return null;
  const invoice = await db.estimate.findFirst({
    where: { appointmentId: id, isInvoice: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, estimateNumber: true, total: true, paidAt: true, clientName: true },
  });
  const cardAuth = await db.customerSignature.findFirst({
    where: { appointmentId: id, kind: "PAYMENT_AUTHORIZATION", stripePaymentIntentId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  const cardPayment = cardAuth?.stripePaymentIntentId
    ? await db.jobPayment.findFirst({ where: { stripePaymentIntentId: cardAuth.stripePaymentIntentId } })
    : null;
  const paid = cardPayment && cardAuth
    ? { amount: cardPayment.amount, brand: cardAuth.cardBrand, last4: cardAuth.cardLast4 }
    : null;
  return { appt, invoice, paid };
}

function statementFor(kind: Kind, name: string, ctx: NonNullable<Awaited<ReturnType<typeof context>>>) {
  const num = ctx.invoice?.estimateNumber ?? null;
  return kind === "WORK_COMPLETION" ? workCompletionStatement(name, num) : paymentAcknowledgmentStatement(name, ctx.paid, num);
}

/** The two signatures collected when the technician closes out a job. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const ctx = await context(id, auth);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const name = ctx.invoice?.clientName || ctx.appt.name || "";
  const signed = await db.customerSignature.findMany({
    where: { appointmentId: id, kind: { in: [...KINDS] } },
    select: { kind: true, signerName: true, createdAt: true },
  });
  return NextResponse.json({
    customerName: name,
    invoice: ctx.invoice,
    paid: ctx.paid,
    steps: KINDS.map((kind) => ({
      kind,
      title: kind === "WORK_COMPLETION" ? "Work Completion" : "Payment Acknowledgment",
      statementTemplate: statementFor(kind, "{name}", ctx),
      signed: signed.find((s) => s.kind === kind) ?? null,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const ctx = await context(id, auth);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const kind = body.kind as Kind;
  const signerName = String(body.signerName ?? "").trim();
  if (!KINDS.includes(kind)) return NextResponse.json({ error: "Unknown signature" }, { status: 400 });
  if (!signerName || !body.signature) return NextResponse.json({ error: "Name and signature are required" }, { status: 400 });

  const sig = await recordSignature({
    kind, signerName, signature: body.signature, statement: statementFor(kind, signerName, ctx),
    amount: kind === "PAYMENT_ACKNOWLEDGMENT" ? ctx.paid?.amount ?? ctx.invoice?.total ?? null : null,
    cardBrand: ctx.paid?.brand, cardLast4: ctx.paid?.last4,
    estimateId: ctx.invoice?.id, appointmentId: id, customerId: ctx.appt.customerId,
    collectedById: auth.id, ...requestMeta(req),
  });
  if (kind === "WORK_COMPLETION") {
    await db.appointment.update({ where: { id }, data: { signatureUrl: sig.signatureUrl } }).catch(() => {});
    await db.invoice.updateMany({ where: { appointmentId: id }, data: { signatureUrl: sig.signatureUrl } }).catch(() => {});
  }
  return NextResponse.json({ ok: true, id: sig.id });
}
