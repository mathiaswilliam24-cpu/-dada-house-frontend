import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { z } from "zod";
import { linkCustomerToUser, verifyPortalInvite } from "@/lib/portal-access";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8),
  invite: z.string().max(400).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const { name, email, phone, password, invite } = parsed.data;

    // Personal invite (texted/emailed to the customer after a payment): links the new account to his records.
    const inviteCustomerId = verifyPortalInvite(invite);
    let invitedPhone: string | null = null;
    if (inviteCustomerId) {
      const c = await db.customer.findUnique({ where: { id: inviteCustomerId }, select: { userId: true, phone: true } });
      if (c?.userId) {
        return NextResponse.json({ error: "You already have an account. Please sign in.", signIn: true }, { status: 409 });
      }
      invitedPhone = c?.phone ?? null;
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: { name, email, phone: invitedPhone ?? phone, password: hashed, role: "CLIENT" },
    });
    const linked = inviteCustomerId ? await linkCustomerToUser(inviteCustomerId, user.id).catch(() => false) : false;

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name, linked },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
