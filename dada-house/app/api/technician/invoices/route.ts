import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { generateEstimateNumber } from "@/lib/utils";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const invoices = await db.estimate.findMany({
    where: {
      technicianId: auth.id,
      isInvoice: true,
      ...(status && status !== "ALL" ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const total = invoices.reduce((s, i) => s + i.total, 0);
  const open = invoices.filter((i) => i.status === "OPEN").length;
  const paid = invoices.filter((i) => i.paidAt !== null).length;

  return NextResponse.json({ invoices, total, open, paid });
}

export async function POST(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const {
    clientName, clientEmail, clientPhone, clientMobile, clientFax,
    clientAddress, clientCity, clientState, clientZip,
    lineItems, additionalDetails,
    subtotal, taxType, taxLabel, taxRate, taxInclusive,
    discountType, discountValue, total,
    templateColor, showFinancing, requestSignature, appointmentId,
  } = body;

  const invoice = await db.estimate.create({
    data: {
      estimateNumber: generateEstimateNumber(),
      technicianId: auth.id,
      appointmentId: appointmentId ?? null,
      isInvoice: true,
      paymentToken: randomUUID(),
      sentByName: auth.name ?? null,
      clientName: clientName ?? "",
      clientEmail: clientEmail ?? "",
      clientPhone: clientPhone ?? null,
      clientMobile: clientMobile ?? null,
      clientFax: clientFax ?? null,
      clientAddress: clientAddress ?? null,
      clientCity: clientCity ?? null,
      clientState: clientState ?? "TX",
      clientZip: clientZip ?? null,
      lineItems: lineItems ?? [],
      additionalDetails: additionalDetails ?? null,
      subtotal: subtotal ?? 0,
      taxType: taxType ?? "none",
      taxLabel: taxLabel ?? null,
      taxRate: taxRate ?? 0,
      taxInclusive: taxInclusive ?? false,
      discountType: discountType ?? "none",
      discountValue: discountValue ?? 0,
      total: total ?? 0,
      templateColor: templateColor ?? "#1B3FA8",
      showFinancing: showFinancing ?? false,
      requestSignature: requestSignature ?? false,
    },
  });

  return NextResponse.json({ invoice }, { status: 201 });
}
