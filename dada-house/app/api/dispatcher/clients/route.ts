import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/customers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ clients: [] });

  // Search past appointments, the call-center Customer table, AND registered
  // CLIENT accounts (e.g. added via /admin/customers "Add Customer") — a client
  // can exist in any one of these three places without being in the others.
  const [apptRows, customerRows, userRows] = await Promise.all([
    db.appointment.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { name: true, phone: true, email: true, address: true, city: true, zipCode: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.customer.findMany({
      where: {
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { firstName: true, lastName: true, phone: true, email: true, address: true, city: true, zipCode: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    db.user.findMany({
      where: {
        role: "CLIENT",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { name: true, phone: true, email: true, properties: { take: 1, orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const customerResults = customerRows.map((c) => ({
    name: `${c.firstName} ${c.lastName ?? ""}`.trim(),
    phone: c.phone,
    email: c.email ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    zipCode: c.zipCode ?? "",
  }));

  const userResults = userRows.map((u) => ({
    name: u.name ?? "",
    phone: u.phone ? normalizePhone(u.phone) : "",
    email: u.email,
    address: u.properties[0]?.address ?? "",
    city: u.properties[0]?.city ?? "",
    zipCode: u.properties[0]?.zipCode ?? "",
  }));

  // Customer/User records first (more likely to be up to date) — deduplicate by phone.
  const seen = new Set<string>();
  const clients = [...customerResults, ...userResults, ...apptRows].filter(r => {
    const key = r.phone || r.email || r.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);

  return NextResponse.json({ clients });
}
