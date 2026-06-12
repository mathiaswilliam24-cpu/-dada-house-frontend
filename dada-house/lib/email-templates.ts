interface AppointmentEmailData {
  appointmentNumber: string;
  name: string;
  service: string;
  subservice?: string | null;
  address: string;
  city: string;
  preferredDate?: string | null;
  preferredTime?: string | null;
  description?: string | null;
}

export function appointmentConfirmationHtml(data: AppointmentEmailData): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Appointment Confirmation — DADA HOUSE</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1B3FA8 0%,#0D1D5E 100%);padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:12px;">
                <div style="width:48px;height:48px;background:#F7921A;border-radius:12px;display:inline-block;vertical-align:middle;"></div>
                <div style="display:inline-block;vertical-align:middle;text-align:left;">
                  <div style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">DADA</div>
                  <div style="color:#F7921A;font-size:24px;font-weight:900;letter-spacing:-0.5px;margin-top:-4px;">HOUSE</div>
                </div>
              </div>
              <p style="color:#93C5FD;margin:16px 0 0;font-size:14px;">Premier Home Services — Houston, TX</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:20px;margin-bottom:32px;text-align:center;">
                <p style="margin:0;color:#15803D;font-size:18px;font-weight:700;">✓ Appointment Request Received</p>
                <p style="margin:8px 0 0;color:#16A34A;font-size:14px;">Our team will contact you shortly to confirm.</p>
              </div>

              <h2 style="color:#1B3FA8;font-size:20px;font-weight:700;margin:0 0 20px;">Appointment Details</h2>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
                <tr style="background:#F8FAFC;">
                  <td style="padding:14px 20px;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;width:40%;">Appointment #</td>
                  <td style="padding:14px 20px;color:#1B3FA8;font-size:13px;font-weight:700;border-bottom:1px solid #E2E8F0;">${data.appointmentNumber}</td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;">Name</td>
                  <td style="padding:14px 20px;color:#1B3FA8;font-size:13px;border-bottom:1px solid #E2E8F0;">${data.name}</td>
                </tr>
                <tr style="background:#F8FAFC;">
                  <td style="padding:14px 20px;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;">Service</td>
                  <td style="padding:14px 20px;color:#1B3FA8;font-size:13px;border-bottom:1px solid #E2E8F0;">${data.service}${data.subservice ? ` — ${data.subservice}` : ""}</td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;">Address</td>
                  <td style="padding:14px 20px;color:#1B3FA8;font-size:13px;border-bottom:1px solid #E2E8F0;">${data.address}, ${data.city}, TX</td>
                </tr>
                ${data.preferredDate ? `
                <tr style="background:#F8FAFC;">
                  <td style="padding:14px 20px;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;">Preferred Date</td>
                  <td style="padding:14px 20px;color:#1B3FA8;font-size:13px;border-bottom:1px solid #E2E8F0;">${data.preferredDate}${data.preferredTime ? ` at ${data.preferredTime}` : ""}</td>
                </tr>` : ""}
                ${data.description ? `
                <tr>
                  <td style="padding:14px 20px;color:#64748B;font-size:13px;font-weight:600;">Description</td>
                  <td style="padding:14px 20px;color:#1B3FA8;font-size:13px;">${data.description}</td>
                </tr>` : ""}
              </table>

              <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;padding:20px;margin-top:24px;">
                <p style="margin:0 0 8px;color:#c2620a;font-size:13px;font-weight:700;">📞 Need immediate assistance?</p>
                <p style="margin:0;color:#9A3412;font-size:13px;">Service Line: <strong>+1 (910) 685-8042</strong></p>
                <p style="margin:4px 0 0;color:#9A3412;font-size:13px;">Emergency: <strong>832-626-4398</strong></p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1B3FA8;padding:24px 40px;text-align:center;">
              <p style="margin:0;color:#64748B;font-size:12px;">DADA HOUSE — Available 24/7 for Your Home Service Needs</p>
              <p style="margin:8px 0 0;color:#475569;font-size:12px;">customerservice@dada-house.com | dada-house.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function statusUpdateHtml(data: {
  name: string;
  appointmentNumber: string;
  status: string;
  notes?: string | null;
}): string {
  const statusColors: Record<string, string> = {
    CONFIRMED: "#15803D",
    IN_PROGRESS: "#E07F10",
    COMPLETED: "#1D4ED8",
    CANCELLED: "#DC2626",
  };
  const statusLabels: Record<string, string> = {
    CONFIRMED: "Confirmed",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  const color = statusColors[data.status] || "#64748B";
  const label = statusLabels[data.status] || data.status;

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Appointment Update — DADA HOUSE</title></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#1B3FA8;padding:28px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:22px;font-weight:900;">DADA</span><span style="color:#F7921A;font-size:22px;font-weight:900;">HOUSE</span>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;color:#1B3FA8;font-size:16px;">Hi ${data.name},</p>
            <p style="margin:0 0 24px;color:#475569;">Your appointment <strong>#${data.appointmentNumber}</strong> status has been updated:</p>
            <div style="text-align:center;padding:24px;background:#F8FAFC;border-radius:12px;border:2px solid ${color};margin-bottom:24px;">
              <p style="margin:0;font-size:24px;font-weight:900;color:${color};">${label}</p>
            </div>
            ${data.notes ? `<p style="margin:0;color:#475569;font-size:14px;background:#F0F9FF;border:1px solid #BAE6FD;border-radius:8px;padding:16px;">Note from our team: ${data.notes}</p>` : ""}
            <p style="margin:24px 0 0;color:#64748B;font-size:13px;">Questions? Call us at <strong>+1 (910) 685-8042</strong> or <strong>832-626-4398</strong> (Emergency).</p>
          </td>
        </tr>
        <tr>
          <td style="background:#1B3FA8;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#475569;font-size:12px;">DADA HOUSE — customerservice@dada-house.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function adminAppointmentAlertHtml(data: AppointmentEmailData & { phone: string }): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>New Appointment — DADA HOUSE</title></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1B3FA8 0%,#0D1D5E 100%);padding:28px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:22px;font-weight:900;">DADA</span><span style="color:#F7921A;font-size:22px;font-weight:900;">HOUSE</span>
            <p style="margin:8px 0 0;color:#93C5FD;font-size:14px;font-weight:600;">🔔 NEW APPOINTMENT BOOKED</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <div style="background:#FFF7ED;border:2px solid #F7921A;border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:center;">
              <p style="margin:0;color:#c2620a;font-size:16px;font-weight:700;">Appointment #${data.appointmentNumber}</p>
              <p style="margin:4px 0 0;color:#9A3412;font-size:13px;">Action required — please confirm with the client</p>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
              <tr style="background:#F8FAFC;">
                <td style="padding:12px 20px;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;width:38%;">Client Name</td>
                <td style="padding:12px 20px;color:#1B3FA8;font-size:13px;font-weight:700;border-bottom:1px solid #E2E8F0;">${data.name}</td>
              </tr>
              <tr>
                <td style="padding:12px 20px;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;">Phone</td>
                <td style="padding:12px 20px;border-bottom:1px solid #E2E8F0;"><a href="tel:${data.phone}" style="color:#F7921A;font-size:13px;font-weight:700;text-decoration:none;">${data.phone}</a></td>
              </tr>
              <tr style="background:#F8FAFC;">
                <td style="padding:12px 20px;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;">Service</td>
                <td style="padding:12px 20px;color:#1B3FA8;font-size:13px;font-weight:700;border-bottom:1px solid #E2E8F0;">${data.service}${data.subservice ? ` — ${data.subservice}` : ""}</td>
              </tr>
              <tr>
                <td style="padding:12px 20px;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;">Address</td>
                <td style="padding:12px 20px;color:#1B3FA8;font-size:13px;border-bottom:1px solid #E2E8F0;">${data.address}, ${data.city}, TX</td>
              </tr>
              ${data.preferredDate ? `
              <tr style="background:#F8FAFC;">
                <td style="padding:12px 20px;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;">Date / Time</td>
                <td style="padding:12px 20px;color:#1B3FA8;font-size:13px;font-weight:700;border-bottom:1px solid #E2E8F0;">${data.preferredDate}${data.preferredTime ? ` at ${data.preferredTime}` : ""}</td>
              </tr>` : ""}
              ${data.description ? `
              <tr>
                <td style="padding:12px 20px;color:#64748B;font-size:13px;font-weight:600;" valign="top">Description</td>
                <td style="padding:12px 20px;color:#475569;font-size:13px;">${data.description}</td>
              </tr>` : ""}
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#1B3FA8;padding:20px 40px;text-align:center;">
            <p style="margin:0;color:#93C5FD;font-size:12px;">DADA HOUSE Internal Notification — dada-house.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function contactEmailHtml(data: {
  name: string;
  email: string;
  phone?: string | null;
  service?: string | null;
  message: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>Contact Form — DADA HOUSE</title></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#1B3FA8;padding:24px 40px;text-align:center;">
          <span style="color:#fff;font-size:20px;font-weight:900;">DADA</span><span style="color:#F7921A;font-size:20px;font-weight:900;">HOUSE</span>
          <p style="margin:8px 0 0;color:#93C5FD;font-size:13px;">New Contact Form Submission</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
            <tr><td style="padding:12px 20px;background:#F8FAFC;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;width:35%;">From</td>
              <td style="padding:12px 20px;color:#1B3FA8;font-size:13px;border-bottom:1px solid #E2E8F0;">${data.name}</td></tr>
            <tr><td style="padding:12px 20px;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;">Email</td>
              <td style="padding:12px 20px;color:#1B3FA8;font-size:13px;border-bottom:1px solid #E2E8F0;">${data.email}</td></tr>
            ${data.phone ? `<tr><td style="padding:12px 20px;background:#F8FAFC;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;">Phone</td>
              <td style="padding:12px 20px;color:#1B3FA8;font-size:13px;border-bottom:1px solid #E2E8F0;">${data.phone}</td></tr>` : ""}
            ${data.service ? `<tr><td style="padding:12px 20px;color:#64748B;font-size:13px;font-weight:600;border-bottom:1px solid #E2E8F0;">Service</td>
              <td style="padding:12px 20px;color:#1B3FA8;font-size:13px;border-bottom:1px solid #E2E8F0;">${data.service}</td></tr>` : ""}
            <tr><td style="padding:12px 20px;background:#F8FAFC;color:#64748B;font-size:13px;font-weight:600;" valign="top">Message</td>
              <td style="padding:12px 20px;color:#1B3FA8;font-size:13px;">${data.message.replace(/\n/g, "<br/>")}</td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#1B3FA8;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#475569;font-size:12px;">DADA HOUSE — customerservice@dada-house.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildEstimateEmail(
  est: { estimateNumber: string; clientName: string; total: number; additionalDetails?: string | null },
  lineItems: Array<{ desc: string; rate: number; qty: number; amount: number }>,
  preparedBy: string
): string {
  const itemRows = lineItems.map((item) =>
    `<tr><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0">${item.desc}</td><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right">$${item.rate.toFixed(2)}</td><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:center">${item.qty}</td><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold">$${item.amount.toFixed(2)}</td></tr>`
  ).join("");

  return `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#1B3FA8;padding:24px;border-radius:8px 8px 0 0;text-align:center">
    <h1 style="color:white;margin:0;font-size:24px">DADA HOUSE</h1>
    <p style="color:#93c5fd;margin:4px 0 0">Premier Home Services · Houston, TX</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <h2 style="color:#1B3FA8;margin-top:0">Estimate #${est.estimateNumber}</h2>
    <p>Dear ${est.clientName},</p>
    <p>Thank you for considering DADA HOUSE. Please find your estimate below:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:10px 4px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">DESCRIPTION</th>
          <th style="padding:10px 4px;text-align:right;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">RATE</th>
          <th style="padding:10px 4px;text-align:center;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">QTY</th>
          <th style="padding:10px 4px;text-align:right;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb">AMOUNT</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div style="text-align:right;font-size:18px;font-weight:bold;color:#1B3FA8;border-top:2px solid #1B3FA8;padding-top:12px">
      Total: $${est.total.toFixed(2)}
    </div>
    ${est.additionalDetails ? `<p style="margin-top:16px;padding:12px;background:#f9fafb;border-radius:6px;font-size:14px">${est.additionalDetails}</p>` : ""}
    <p style="margin-top:24px">To accept this estimate or have any questions, please contact us:</p>
    <p>📞 (910) 685-8042 · ✉️ customerservice@dada-house.com</p>
    <p style="color:#6b7280;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">
      Prepared by ${preparedBy} · DADA HOUSE · 7001 South Texas 6 STE 246, Houston, TX 77083
    </p>
  </div>
</body>
</html>`;
}
