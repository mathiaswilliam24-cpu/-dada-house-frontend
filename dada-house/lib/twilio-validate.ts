import twilio from "twilio";
import { NextRequest, NextResponse } from "next/server";

/**
 * Verifies a Twilio webhook's X-Twilio-Signature. The URL used for
 * validation MUST be the exact URL Twilio signed — reconstructed from
 * TWILIO_WEBHOOK_BASE_URL rather than req.url, since reverse-proxy/host-header
 * handling in production can otherwise differ from what Twilio actually saw.
 */
export async function validateTwilioRequest(req: NextRequest): Promise<NextResponse | null> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const baseUrl = process.env.TWILIO_WEBHOOK_BASE_URL;

  if (!authToken || !baseUrl) {
    console.warn("Twilio signature validation skipped — TWILIO_AUTH_TOKEN or TWILIO_WEBHOOK_BASE_URL not set");
    return null;
  }

  const signature = req.headers.get("x-twilio-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Twilio signature" }, { status: 403 });
  }

  const url = new URL(req.url);
  const fullUrl = `${baseUrl.replace(/\/$/, "")}${url.pathname}${url.search}`;

  const formData = await req.clone().formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => { params[key] = String(value); });

  const valid = twilio.validateRequest(authToken, signature, fullUrl, params);
  if (!valid) {
    return NextResponse.json({ error: "Invalid Twilio signature" }, { status: 403 });
  }

  return null;
}
