import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { getLinkedCustomer } from "@/lib/portal-access";
import { redeemPointsOnBill } from "@/lib/loyalty";
import { loadBill } from "@/lib/bill-amounts";

export const dynamic = "force-dynamic";

const schema = z.object({ kind: z.enum(["estimate", "invoice"]), id: z.string().min(1), points: z.number().int().positive() });
const last10 = (p: string | null | undefined) => (p ?? "").replace(/\D/g, "").slice(-10);

/** The client applies his reward points to one of his unpaid bills (deducted before paying the rest online). */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const customer = await getLinkedCustomer(auth.id);
  if (!customer) return NextResponse.json({ error: "Your account is not linked to your DADA HOUSE records yet. Call (844) 928-0875." }, { status: 400 });

  const bill = await loadBill(parsed.data.kind, parsed.data.id);
  const mine = !!bill && (
    bill.appointmentUserId === auth.id || bill.customerId === customer.id ||
    (!!bill.clientPhone && last10(bill.clientPhone) === last10(customer.phone)) ||
    (!!auth.email && !!bill.clientEmail && bill.clientEmail.toLowerCase() === auth.email.toLowerCase())
  );
  if (!bill || !mine) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  if (bill.paid || bill.due <= 0) return NextResponse.json({ error: "This invoice is already paid." }, { status: 400 });

  try {
    const r = await redeemPointsOnBill(customer.id, { kind: bill.kind, id: bill.id }, bill.due, parsed.data.points);
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not apply points" }, { status: 400 });
  }
}
