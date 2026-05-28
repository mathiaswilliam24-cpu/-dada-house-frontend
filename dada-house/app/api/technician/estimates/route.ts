import { NextRequest, NextResponse } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { generateEstimateNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const estimates = await db.estimate.findMany({
    where: {
      technicianId: auth.id,
      ...(status && status !== "ALL" ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const total = estimates.reduce((s, e) => s + e.total, 0);
  const open = estimates.filter((e) => e.status === "OPEN").length;
  const closed = estimates.filter((e) => e.status === "CLOSED").length;

  return NextResponse.json({ estimates, total, open, closed });
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

  const estimate = await db.estimate.create({
    data: {
      estimateNumber: generateEstimateNumber(),
      technicianId: auth.id,
      appointmentId: appointmentId ?? null,
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
      requestSignature: requestSignature ?? true,
    },
  });

  return NextResponse.json({ estimate }, { status: 201 });
}
