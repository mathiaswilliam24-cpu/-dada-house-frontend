import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";
import { resend, FROM_EMAIL } from "@/lib/resend";

const CATEGORY_LABEL: Record<string, string> = {
  PLUMBING: "Plumbing",
  AIR_CONDITIONING: "Air Conditioning",
  HEATING: "Heating",
  REMODELING: "Remodeling",
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com";

interface Project {
  id: string;
  title: string;
  category: string;
  location: string;
  date: string;
  description: string;
  images: string[];
}

function emailHtml(project: Project, link: string): string {
  const catLabel = CATEGORY_LABEL[project.category] ?? project.category;
  const thumb = project.images[0] ?? "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1B3FA8 0%,#0D1D5E 100%);padding:32px 40px;text-align:center">
            <p style="margin:0 0 8px;color:#F7921A;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase">New Completed Project</p>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;line-height:1.2">DADA HOUSE Just Finished<br>a New Project!</h1>
          </td>
        </tr>

        ${thumb ? `
        <!-- Photo -->
        <tr>
          <td style="padding:0">
            <img src="${thumb}" alt="${project.title}" width="600" style="display:block;width:100%;max-height:320px;object-fit:cover">
          </td>
        </tr>` : ""}

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <h2 style="margin:0 0 20px;color:#1B3FA8;font-size:20px;font-weight:800">${project.title}</h2>

            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px">
              <tr>
                <td style="padding:12px 16px;background:#f8fafc;border-radius:8px 8px 0 0;border-bottom:1px solid #e2e8f0">
                  <span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Type of Service</span><br>
                  <span style="font-size:15px;font-weight:700;color:#1B3FA8">${catLabel}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;background:#f8fafc;border-radius:0 0 8px 8px">
                  <span style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px">Location</span><br>
                  <span style="font-size:15px;font-weight:700;color:#0f172a">${project.location}</span>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 28px;color:#475569;font-size:14px;line-height:1.7">${project.description}</p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#F7921A;border-radius:10px">
                  <a href="${link}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none">
                    View Project Photos →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;text-align:center">
            <p style="margin:0 0 4px;color:#94a3b8;font-size:12px">DADA HOUSE · Home Services · TX · NC · MD</p>
            <p style="margin:0;color:#cbd5e1;font-size:11px">You are receiving this because you are a DADA HOUSE client.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Normalize phone to E.164 (+1XXXXXXXXXX) — Twilio requirement
function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export async function notifyClientsNewProject(project: Project) {
  const link = `${BASE_URL}/gallery#project-${project.id}`;
  const catLabel = CATEGORY_LABEL[project.category] ?? project.category;

  console.log(`[gallery-notifications] START — project "${project.title}" (${project.id})`);

  const clients = await db.user.findMany({
    where: { role: "CLIENT" },
    select: { email: true, phone: true, name: true },
  });

  console.log(`[gallery-notifications] Found ${clients.length} CLIENT user(s)`);

  const emailClients = clients.filter((c) => !!c.email);
  const smsClients   = clients
    .filter((c) => !!c.phone && !!toE164(c.phone))
    .map((c) => ({ ...c, e164: toE164(c.phone!)! }));

  console.log(`[gallery-notifications] ${emailClients.length} with email, ${smsClients.length} with valid phone`);

  const smsBody =
    `🏠 DADA HOUSE just completed a new project!\n` +
    `Service: ${catLabel}\n` +
    `Location: ${project.location}\n` +
    `See the photos: ${link}`;

  const tasks: Promise<unknown>[] = [];

  // SMS — parallel, one per client
  for (const client of smsClients) {
    console.log(`[gallery-notifications] Sending SMS to ${client.e164}`);
    tasks.push(
      sendSMS(client.e164, smsBody).catch((err) =>
        console.error(`[gallery-notifications] SMS failed to ${client.e164}:`, err)
      )
    );
  }

  // Emails — parallel via Resend
  for (const client of emailClients) {
    console.log(`[gallery-notifications] Sending email to ${client.email}`);
    tasks.push(
      resend.emails
        .send({
          from: FROM_EMAIL,
          to: client.email,
          subject: `🏠 New Project Completed — ${catLabel} in ${project.location}`,
          html: emailHtml(project, link),
        })
        .catch((err) =>
          console.error(`[gallery-notifications] Email failed to ${client.email}:`, err)
        )
    );
  }

  await Promise.allSettled(tasks);

  // Confirmation SMS to admin
  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) {
    const adminE164 = toE164(adminPhone);
    if (adminE164) {
      await sendSMS(
        adminE164,
        `[DADA HOUSE] New project "${project.title}" published.\n` +
        `Notified: ${emailClients.length} email(s) + ${smsClients.length} SMS sent to clients.`
      ).catch((err) => console.error("[gallery-notifications] Admin SMS failed:", err));
    }
  }

  console.log(
    `[gallery-notifications] DONE — ${emailClients.length} emails + ${smsClients.length} SMS for "${project.title}"`
  );
}
