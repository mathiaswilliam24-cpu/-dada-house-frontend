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

  const { password } = await req.json();
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id }, select: { id: true, email: true, name: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const hashed = await bcrypt.hash(password, 10);
  await db.user.update({
    where: { id },
    data: { password: hashed, mustChangePassword: true },
  });

  const rawBase = process.env.NEXTAUTH_URL ?? "https://dada-house.com";
  const loginUrl = `${rawBase.includes("localhost") ? "https://dada-house.com" : rawBase}/auth/login`;
  const firstName = (user.name || user.email).split(" ")[0];

  await resend.emails.send({
    from: FROM_EMAIL,
    to: user.email,
    subject: "Your DADA HOUSE account credentials 🏠",
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#1B3FA8 0%,#F7921A 100%);padding:40px 32px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700">DADA HOUSE</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px">Home Services · TX · NC · MD</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px">
            <p style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700">Hello ${firstName}! 👋</p>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">
              Here are your login credentials for the DADA HOUSE client portal.
              Your account lets you view your jobs, photos, and download receipts at any time.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border-radius:12px;border:1px solid #fde68a;margin-bottom:28px">
              <tr><td style="padding:20px 24px">
                <p style="margin:0 0 14px;color:#92400e;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">Your Login Credentials</p>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#6b7280;font-size:13px;padding:4px 0;width:80px">Email</td>
                    <td style="color:#111827;font-size:14px;font-weight:600;font-family:monospace;padding:4px 0">${user.email}</td>
                  </tr>
                  <tr>
                    <td style="color:#6b7280;font-size:13px;padding:4px 0">Password</td>
                    <td style="color:#111827;font-size:14px;font-weight:600;font-family:monospace;padding:4px 0">${password}</td>
                  </tr>
                </table>
                <p style="margin:14px 0 0;color:#92400e;font-size:12px;line-height:1.5">
                  ⚠️ You will be asked to <strong>create your own password</strong> the first time you log in.
                </p>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr><td align="center">
                <a href="${loginUrl}" style="display:inline-block;background:#F7921A;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px">
                  Access My Account →
                </a>
              </td></tr>
            </table>
            <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center">
              Questions? Call us at <strong style="color:#F7921A">(346) 649-9353</strong>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 32px;text-align:center">
            <p style="margin:0;color:#9ca3af;font-size:12px">DADA HOUSE · Home Services · TX · NC · MD</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
