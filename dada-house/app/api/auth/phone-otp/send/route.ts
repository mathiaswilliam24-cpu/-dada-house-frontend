import { NextRequest, NextResponse } from "next/server";
import { getTwilioClient } from "@/lib/twilio";
import { phoneOtpSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = phoneOtpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { phone } = result.data;
    const verifySid = process.env.TWILIO_VERIFY_SID;
    if (!verifySid) {
      return NextResponse.json({ error: "OTP service not configured" }, { status: 503 });
    }

    const client = getTwilioClient();
    await client.verify.v2
      .services(verifySid)
      .verifications.create({ to: phone, channel: "sms" });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[phone-otp/send]", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}

