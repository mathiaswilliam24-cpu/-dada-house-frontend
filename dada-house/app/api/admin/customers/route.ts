import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";

  // 1. Registered users with CLIENT role
  const registeredUsers = await db.user.findMany({
    where: { role: "CLIENT" },
    select: {
      id: true, name: true, email: true, phone: true, createdAt: true,
      _count: { select: { appointments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Appointment-only clients (no registered account)
  const apptRows = await db.appointment.findMany({
    where: { userId: null },
    select: { name: true, phone: true, email: true, address: true, city: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  // Deduplicate appt clients by phone (keep most recent)
  const seenPhones = new Set(registeredUsers.map(u => u.phone).filter(Boolean));
  const seenEmails = new Set(registeredUsers.map(u => u.email).filter(Boolean));
  const apptClients: { id: string; name: string; email: string; phone: string; createdAt: Date; appointmentCount: number; hasAccount: false }[] = [];
  const apptCounts: Record<string, number> = {};

  for (const row of apptRows) {
    const key = row.phone || row.email || row.name;
    if (!apptCounts[key]) apptCounts[key] = 0;
    apptCounts[key]++;
  }

  const seenKeys = new Set<string>();
  for (const row of apptRows) {
    const key = row.phone || row.email || row.name;
    if (seenKeys.has(key)) continue;
    if (row.phone && seenPhones.has(row.phone)) continue;
    if (row.email && seenEmails.has(row.email)) continue;
    seenKeys.add(key);
    apptClients.push({
      id: `appt:${key}`,
      name: row.name,
      email: row.email ?? "",
      phone: row.phone ?? "",
      createdAt: row.createdAt,
      appointmentCount: apptCounts[key] ?? 1,
      hasAccount: false,
    });
  }

  // Merge
  const all = [
    ...registeredUsers.map(u => ({
      id: u.id,
      name: u.name ?? "(No name)",
      email: u.email,
      phone: u.phone ?? "",
      createdAt: u.createdAt,
      appointmentCount: u._count.appointments,
      hasAccount: true,
    })),
    ...apptClients,
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Filter by search
  const filtered = q
    ? all.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q)
      )
    : all;

  return NextResponse.json({ customers: filtered, total: filtered.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { name, email, phone, address, city, zipCode } = await req.json();
  if (!name || !email) return NextResponse.json({ error: "Name and email are required" }, { status: 400 });

  // Check if email already exists
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

  const password = await bcrypt.hash(Math.random().toString(36).slice(-10), 10);

  const user = await db.user.create({
    data: { name, email, phone: phone || null, role: "CLIENT", password },
  });

  return NextResponse.json({ user }, { status: 201 });
}
