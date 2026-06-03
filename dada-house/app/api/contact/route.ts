import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/lib/validations";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { contactEmailHtml } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    await resend.emails.send({
      from: FROM_EMAIL,
      to: "customerservice@dada-house.com",
      replyTo: parsed.data.email,
      subject: `Contact Form: ${parsed.data.name} — ${parsed.data.service || "General Inquiry"}`,
      html: contactEmailHtml(parsed.data),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
