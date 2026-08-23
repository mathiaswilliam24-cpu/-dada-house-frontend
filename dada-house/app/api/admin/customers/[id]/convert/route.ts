import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  if (!id.startsWith("appt:")) {
    return NextResponse.json({ error: "This client already has an account" }, { status: 400 });
  }

  const key = id.slice(5); // strip "appt:" prefix

  const { password } = await req.json();
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Find walk-in appointments to get email/name
  const appts = await db.appointment.findMany({
    where: {
      userId: null,
      OR: [{ phone: key }, { email: key }, { name: key }],
    },
    select: { id: true, email: true, name: true, phone: true },
  });

  if (appts.length === 0) {
    return NextResponse.json({ error: "No appointments found for this client" }, { status: 404 });
  }

  const email = appts[0].email;
  const name = appts[0].name;
  const phone = appts[0].phone;

  if (!email) {
    return NextResponse.json({ error: "No email found for this client — cannot create account" }, { status: 400 });
  }

  // Check if account already exists
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // Just re-link appointments to the existing account
    const apptIds = appts.map((a) => a.id);
    await db.appointment.updateMany({
      where: { id: { in: apptIds }, userId: null },
      data: { userId: existing.id },
    });
    return NextResponse.json({
      userId: existing.id,
      email,
      alreadyExisted: true,
      linked: apptIds.length,
    });
  }

  // Create new account
  const hashed = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      email,
      name: name || null,
      phone: phone || null,
      password: hashed,
      role: "CLIENT",
      mustChangePassword: true,
    },
  });

  // Link all walk-in appointments to the new account
  const apptIds = appts.map((a) => a.id);
  await db.appointment.updateMany({
    where: { id: { in: apptIds }, userId: null },
    data: { userId: user.id },
  });

  return NextResponse.json({
    userId: user.id,
    email,
    name,
    alreadyExisted: false,
    linked: apptIds.length,
  });
}
