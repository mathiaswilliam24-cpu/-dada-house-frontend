import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { generateAppointmentNumber } from "@/lib/utils";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const { name, phone, email, service, subservice, address, city, preferredDate, preferredTime, description } = body;

  if (!service || !name) {
    return NextResponse.json({ error: "Name and service are required" }, { status: 400 });
  }

  // For walk-in clients (appt: prefix) there is no user row — create without userId
  const isWalkIn = id.startsWith("appt:");
  if (!isWalkIn) {
    const user = await db.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const appointment = await db.appointment.create({
    data: {
      appointmentNumber: generateAppointmentNumber(),
      userId: isWalkIn ? null : id,
      name,
      phone: phone || "",
      email: email || "",
      service,
      subservice: subservice || null,
      address: address || "",
      city: city || "Houston",
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      preferredTime: preferredTime || null,
      description: description || null,
      source: "admin",
      status: "CONFIRMED",
      confirmationToken: crypto.randomBytes(32).toString("hex"),
    },
  });

  return NextResponse.json({ appointment }, { status: 201 });
}
