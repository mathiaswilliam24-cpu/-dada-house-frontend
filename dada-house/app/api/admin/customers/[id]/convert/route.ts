import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { resend, FROM_EMAIL } from "@/lib/resend";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

  if (!id.startsWith("appt:")) {
    return NextResponse.json({ error: "This client already has an account" }, { status: 400 });
  }

  const key = id.slice(5); // strip "appt:" prefix

  const { password } = await req.json();
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Find walk-in appointments to get email/name
  const appts = await db.appointment.findMany({
    where: {
      userId: null,
      OR: [{ phone: key }, { email: key }, { name: key }],
    },
    select: { id: true, email: true, name: true, phone: true },
  });

  if (appts.length === 0) {
    return NextResponse.json({ error: "No appointments found for this client" }, { status: 404 });
  }

  const email = appts[0].email;
  const name = appts[0].name;
  const phone = appts[0].phone;

  if (!email) {
    return NextResponse.json({ error: "No email found for this client — cannot create account" }, { status: 400 });
  }

  // Check if account already exists
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // Just re-link appointments to the existing account
    const apptIds = appts.map((a) => a.id);
    await db.appointment.updateMany({
      where: { id: { in: apptIds }, userId: null },
      data: { userId: existing.id },
    });
    return NextResponse.json({
      userId: existing.id,
      email,
      alreadyExisted: true,
      linked: apptIds.length,
    });
  }

  // Create new account
  const hashed = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: {
      email,
      name: name || null,
      phone: phone || null,
      password: hashed,
      role: "CLIENT",
      mustChangePassword: true,
    },
  });

  // Link all walk-in appointments to the new account
  const apptIds = appts.map((a) => a.id);
  await db.appointment.updateMany({
    where: { id: { in: apptIds }, userId: null },
    data: { userId: user.id },
  });

  // Send welcome email with credentials
  const rawBase = process.env.NEXTAUTH_URL ?? "https://dada-house.com";
  const loginUrl = `${rawBase.includes("localhost") ? "https://dada-house.com" : rawBase}/auth/login`;
  const firstName = (name || email).split(" ")[0];

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your DADA HOUSE account is ready 🏠",
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1B3FA8 0%,#F7921A 100%);padding:40px 32px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px">DADA HOUSE</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px">Houston Home Services</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px">
            <p style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700">Hello ${firstName}! 👋</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">
              We've created a personal account for you on the DADA HOUSE client portal.
              Your account gives you instant access to everything related to your services with us.
            </p>

            <!-- Benefits -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faff;border-radius:12px;border:1px solid #e0e7ff;padding:0;margin-bottom:28px">
              <tr><td style="padding:20px 24px">
                <p style="margin:0 0 14px;color:#1B3FA8;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">What you can do in your account</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:5px 0;color:#374151;font-size:14px">✅ &nbsp;View all your completed and upcoming jobs</td></tr>
                  <tr><td style="padding:5px 0;color:#374151;font-size:14px">📸 &nbsp;See photos and videos of work done at your home</td></tr>
                  <tr><td style="padding:5px 0;color:#374151;font-size:14px">🧾 &nbsp;Download your invoices and receipts at any time</td></tr>
                  <tr><td style="padding:5px 0;color:#374151;font-size:14px">📅 &nbsp;Book new services directly online</td></tr>
                </table>
              </td></tr>
            </table>

            <!-- Credentials -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border-radius:12px;border:1px solid #fde68a;margin-bottom:28px">
              <tr><td style="padding:20px 24px">
                <p style="margin:0 0 14px;color:#92400e;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Your Login Credentials</p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#6b7280;font-size:13px;padding:4px 0;width:80px">Email</td>
                    <td style="color:#111827;font-size:14px;font-weight:600;font-family:monospace;padding:4px 0">${email}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;font-size:13px;padding:4px 0">Password</td>
                    <td style="color:#111827;font-size:14px;font-weight:600;font-family:monospace;padding:4px 0">${password}</td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;color:#92400e;font-size:12px;line-height:1.5">
                  ⚠️ For your security, you will be asked to <strong>create your own password</strong> the first time you log in.
                </p>
              </td></tr>
            </table>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr><td align="center">
                <a href="${loginUrl}" style="display:inline-block;background:#F7921A;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;letter-spacing:0.2px">
                  Access My Account →
                </a>
              </td></tr>
            </table>

            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6">
              If you have any questions, call us at <strong style="color:#F7921A">(832) 669-6747</strong><br>
              or reply to this email — we're always happy to help.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 32px;text-align:center">
            <p style="margin:0;color:#9ca3af;font-size:12px">DADA HOUSE · Houston Home Services</p>
            <p style="margin:4px 0 0;color:#d1d5db;font-size:11px">This email was sent because an account was created for you.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }).catch(() => { /* email failure is non-fatal */ });

  return NextResponse.json({
    userId: user.id,
    email,
    name,
    alreadyExisted: false,
    linked: apptIds.length,
  });
}
