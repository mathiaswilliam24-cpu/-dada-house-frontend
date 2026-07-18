import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ clients: [] });

  // Search past appointments (deduplicate by phone)
  const rows = await db.appointment.findMany({
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
  });

  // Deduplicate by phone (keep most recent)
  const seen = new Set<string>();
  const clients = rows.filter(r => {
    const key = r.phone || r.email || r.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);

  return NextResponse.json({ clients });
}
