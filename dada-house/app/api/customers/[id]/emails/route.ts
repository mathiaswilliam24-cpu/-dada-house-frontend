import { NextRequest, NextResponse } from "next/server";
import { requireCallCenterStaff } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getEmailsSentTo } from "@/lib/email-history";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCallCenterStaff(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id }, select: { email: true } });
  if (!customer?.email) return NextResponse.json({ emails: [] });

  const emails = await getEmailsSentTo(customer.email);
  return NextResponse.json({ emails });
}
