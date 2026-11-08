import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { sendSMS } from "@/lib/twilio";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
  }

  const { name, phone } = parsed.data;
  const firstName = name.split(" ")[0];
  const link = `${process.env.NEXT_PUBLIC_APP_URL}/hvac-maintenance-plan/enroll`;

  const message =
    `Hi ${firstName}! DADA HOUSE HVAC Maintenance Plan — enroll online in under 5 min and protect your system year-round:\n${link}`;

  try {
    await sendSMS(phone, message);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "SMS failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
