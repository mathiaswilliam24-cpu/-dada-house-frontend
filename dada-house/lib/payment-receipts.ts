import { resend, FROM_EMAIL } from "@/lib/resend";
import { sendOutboundSms } from "@/lib/messaging";

/** Customer receipts and owner alerts for invoice payments (online /pay page and technician devices). */
export async function sendPaymentReceiptSms(phone: string, invoiceNum: string, total: number, cardFee: number) {
  const chargeTotal = total + cardFee;
  const feeLine = cardFee > 0 ? ` (incl. ${cardFee.toFixed(2)} card fee)` : "";
  await sendOutboundSms(
    phone,
    `DADA HOUSE: Thanks! Payment received for Invoice ${invoiceNum} — $${chargeTotal.toFixed(2)} charged${feeLine}. Questions? Call (844) 928-0875.`
  );
}

export async function notifyAdminPayment(clientName: string, invoiceNum: string, total: number, cardFee: number, method: string) {
  const chargeTotal = total + cardFee;
  const feeLine = cardFee > 0 ? ` (+$${cardFee.toFixed(2)} card fee)` : "";

  const adminPhone = process.env.ADMIN_PHONE;
  if (adminPhone) {
    await sendOutboundSms(
      adminPhone,
      `💳 DADA HOUSE Payment Received!\nClient: ${clientName}\nInvoice: ${invoiceNum}\nAmount: $${chargeTotal.toFixed(2)}${feeLine}\nMethod: ${method}`
    ).catch(console.error);
  }

  const alertEmail = process.env.APPOINTMENT_ALERT_EMAIL;
  if (alertEmail) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: alertEmail,
      subject: `💳 Payment Received — ${clientName} · $${chargeTotal.toFixed(2)} (${method})`,
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#16a34a;padding:20px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:white;margin:0;font-size:20px">💳 Payment Received</h2>
    <p style="color:#bbf7d0;margin:4px 0 0;font-size:13px">DADA HOUSE — Admin Alert</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:20px 24px;border-radius:0 0 8px 8px">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:8px 0;color:#6b7280;width:140px">Client</td><td style="padding:8px 0;font-weight:700">${clientName}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Invoice</td><td style="padding:8px 0">${invoiceNum}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280">Method</td><td style="padding:8px 0">${method}</td></tr>
      ${cardFee > 0 ? `<tr><td style="padding:8px 0;color:#6b7280">Card fee</td><td style="padding:8px 0">$${cardFee.toFixed(2)}</td></tr>` : ""}
      <tr style="border-top:2px solid #1B3FA8"><td style="padding:10px 0;font-weight:700;color:#1B3FA8">Total Charged</td><td style="padding:10px 0;font-weight:700;color:#1B3FA8;font-size:18px">$${chargeTotal.toFixed(2)}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Received ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET</p>
  </div>
</body></html>`,
    }).catch(console.error);
  }
}

export async function sendEstimateReceiptEmail(
  inv: { estimateNumber: string; clientName: string; total: number; clientEmail: string },
  lineItems: Array<{ desc: string; rate: number; qty: number; amount: number }>,
  cardFee: number
) {
  const itemRows = lineItems.map((item) =>
    `<tr><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0">${item.desc}</td><td style="padding:8px 4px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:bold">$${item.amount.toFixed(2)}</td></tr>`
  ).join("");
  const chargeTotal = inv.total + cardFee;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: inv.clientEmail,
    subject: `Payment Received — Invoice ${inv.estimateNumber} · DADA HOUSE`,
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#059669;padding:24px;border-radius:8px 8px 0 0;text-align:center">
    <h1 style="color:white;margin:0;font-size:24px">✓ Payment Received</h1>
    <p style="color:#a7f3d0;margin:4px 0 0">DADA HOUSE · Premier Home Services</p>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p>Dear ${inv.clientName},</p>
    <p>Thank you for your payment! Invoice #${inv.estimateNumber} is now paid.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tbody>${itemRows}</tbody>
      <tfoot>
        ${cardFee > 0 ? `<tr><td style="padding:8px 4px;color:#6b7280">Card processing fee (3%)</td><td style="padding:8px 4px;text-align:right;color:#6b7280">$${cardFee.toFixed(2)}</td></tr>` : ""}
        <tr><td style="padding:12px 4px;border-top:2px solid #1B3FA8;font-weight:bold;color:#1B3FA8">Total Charged</td><td style="padding:12px 4px;border-top:2px solid #1B3FA8;text-align:right;font-weight:bold;font-size:18px;color:#1B3FA8">$${chargeTotal.toFixed(2)}</td></tr>
      </tfoot>
    </table>
    <p>We appreciate your business. For any questions: 📞 (844) 928-0875</p>
    <p style="color:#6b7280;font-size:12px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px">DADA HOUSE · 7001 South Texas 6 STE 246, Houston, TX 77083</p>
  </div></body></html>`,
  });
}

export async function sendAdminInvoiceReceiptEmail(opts: {
  invoiceNum: string; clientName: string; clientEmail: string; total: number; cardFee: number;
}) {
  const chargeTotal = opts.total + opts.cardFee;
  await resend.emails.send({
    from: FROM_EMAIL,
    to: opts.clientEmail,
    subject: `Payment Received — Invoice ${opts.invoiceNum} · DADA HOUSE`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:white;">
    <div style="height:8px;background:#16a34a;"></div>
    <div style="padding:24px 32px 16px;text-align:center;">
      <img src="https://www.dada-house.com/logo%20dada%20house.png" alt="DADA HOUSE" style="height:56px;width:auto;" />
    </div>
    <div style="padding:0 32px 20px;text-align:center;">
      <div style="font-size:18px;font-weight:700;color:#16a34a;">✓ Payment Received — Thank You!</div>
      <div style="font-size:13px;color:#6b7280;margin-top:4px;">Invoice ${opts.invoiceNum}</div>
    </div>
    <div style="padding:0 32px 24px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:6px 0;color:#6b7280;">Amount</td><td style="padding:6px 0;text-align:right;color:#111827;">$${opts.total.toFixed(2)}</td></tr>
        ${opts.cardFee > 0 ? `<tr><td style="padding:6px 0;color:#6b7280;">Card processing fee (3%)</td><td style="padding:6px 0;text-align:right;color:#111827;">$${opts.cardFee.toFixed(2)}</td></tr>` : ""}
        <tr style="border-top:2px solid #e5e7eb;"><td style="padding:10px 0 4px;font-weight:700;color:#111827;">Total Charged</td><td style="padding:10px 0 4px;text-align:right;font-weight:700;color:#16a34a;font-size:16px;">$${chargeTotal.toFixed(2)}</td></tr>
      </table>
    </div>
    <div style="padding:20px 32px 28px;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#374151;margin:0 0 4px;">Thank you, ${opts.clientName}, for choosing DADA HOUSE.</p>
      <p style="font-size:12px;color:#374151;margin:0;">Questions? Call (844) 928-0875 or visit www.dada-house.com.</p>
    </div>
  </div>
</body></html>`,
  });
}
