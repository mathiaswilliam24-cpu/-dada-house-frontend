import { NextRequest, NextResponse } from "next/server";
import { getTwilioClient } from "@/lib/twilio";
import { db } from "@/lib/db";
import { verifyOtpSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = verifyOtpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { phone, code } = result.data;
    const verifySid = process.env.TWILIO_VERIFY_SID;
    if (!verifySid) {
      return NextResponse.json({ error: "OTP service not configured" }, { status: 503 });
    }

    const client = getTwilioClient();
    const check = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({ to: phone, code });

    if (check.status !== "approved") {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    // Find or create user by phone
    let user = await db.user.findFirst({ where: { phone } });
    if (!user) {
      user = await db.user.create({
        data: {
          phone,
          email: `phone_${phone.replace(/\D/g, "")}@dada-house.com`,
          role: "CLIENT",
        },
      });
    }

    return NextResponse.json({ success: true, userId: user.id, email: user.email });
  } catch (error) {
    console.error("[phone-otp/verify]", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

