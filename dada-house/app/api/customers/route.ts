import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/customers";
import { CustomerType } from "@/lib/generated/prisma/enums";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const customers = await db.customer.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { address: { contains: q, mode: "insensitive" } },
            { phone: { contains: q.replace(/\D/g, "") || q } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { _count: { select: { appointments: true, calls: true, messageThreads: true } } },
  });

  return NextResponse.json({ customers, total: customers.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const { firstName, lastName, phone, secondaryPhone, email, address, city, state, zipCode, customerType, preferredLanguage, tags, notes } = body;

  if (!firstName || !phone) {
    return NextResponse.json({ error: "First name and phone are required" }, { status: 400 });
  }

  const normalizedPhone = normalizePhone(phone);
  const existing = await db.customer.findUnique({ where: { phone: normalizedPhone } });
  if (existing) {
    return NextResponse.json({ error: "A customer with this phone number already exists", customer: existing }, { status: 409 });
  }

  const customer = await db.customer.create({
    data: {
      firstName,
      lastName: lastName || null,
      phone: normalizedPhone,
      secondaryPhone: secondaryPhone ? normalizePhone(secondaryPhone) : null,
      email: email || null,
      address: address || null,
      city: city || undefined,
      state: state || undefined,
      zipCode: zipCode || null,
      customerType: (customerType as CustomerType) || undefined,
      preferredLanguage: preferredLanguage || undefined,
      tags: Array.isArray(tags) ? tags : [],
      notes: notes || null,
    },
  });

  return NextResponse.json({ customer }, { status: 201 });
}
