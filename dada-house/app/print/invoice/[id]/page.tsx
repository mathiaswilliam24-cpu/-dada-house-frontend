import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PrintToolbar } from "@/components/print/print-toolbar";

export const dynamic = "force-dynamic";

type LI = { description: string; note?: string; rate: number; qty: number };

const fmtCur = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function parseMeta(raw: unknown, fallbackService: string, fallbackAmount: number) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const m = raw as Record<string, unknown>;
    if (Array.isArray(m.items) && m.items.length > 0) {
      return {
        taxEnabled: m.taxEnabled !== false,
        taxRate:    typeof m.taxRate === "number" ? m.taxRate : 8.25,
        items:      m.items as LI[],
      };
    }
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return { taxEnabled: true, taxRate: 8.25, items: raw as LI[] };
  }
  return { taxEnabled: true, taxRate: 8.25, items: [{ description: fallbackService, rate: fallbackAmount, qty: 1 }] };
}

export default async function PrintInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      appointment: {
        select: { name: true, phone: true, email: true, address: true, city: true, service: true, appointmentNumber: true, userId: true },
      },
    },
  });
  if (!invoice) notFound();

  // The link sent to customers by email/SMS carries the invoice's own payment token,
  // so it opens without requiring a portal login (most call-center customers don't have one).
  const hasValidToken = !!token && !!invoice.paymentToken && token === invoice.paymentToken;

  if (!hasValidToken) {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user) redirect("/auth/login");
    // Clients can only view their own invoices
    if (user.role !== "ADMIN" && invoice.appointment.userId !== user.id) {
      redirect("/dashboard");
    }
  }

  const { taxEnabled, taxRate, items } = parseMeta(invoice.lineItems, invoice.appointment.service, invoice.amount);
  const subtotal   = items.reduce((s, i) => s + i.rate * i.qty, 0);
  const tax        = taxEnabled ? subtotal * taxRate / 100 : 0;
  const total      = subtotal + tax;
  const isPaid     = invoice.status === "PAID";
  const isEstimate = invoice.status === "DRAFT";
  const balanceDue = isPaid ? 0 : total;
  const invoiceNum = `${isEstimate ? "EST" : "INV"}${id.slice(-6).toUpperCase()}`;
  const docLabel   = isEstimate ? "ESTIMATE" : "INVOICE";

  return (
    <>
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0 !important; background: white !important; }
          #invoice-root { padding-top: 0 !important; }
        }
        * { font-family: Arial, Helvetica, sans-serif; box-sizing: border-box; }
        body { background: #f3f4f6; margin: 0; }
        @media screen and (max-width: 640px) {
          .dh-doc-section { padding-left: 16px !important; padding-right: 16px !important; margin-left: 0 !important; margin-right: 0 !important; }
          .dh-payment-totals { flex-direction: column !important; gap: 20px !important; }
          .dh-totals-box { min-width: 0 !important; width: 100% !important; }

          /* Line items become stacked cards instead of a cramped 5-column table */
          .dh-items-table thead { display: none; }
          .dh-items-table, .dh-items-table tbody, .dh-items-table tr, .dh-items-table td {
            display: block; width: 100%;
          }
          .dh-items-table tr {
            border: 1px solid #e5e7eb !important; border-radius: 8px; margin-bottom: 12px; padding: 10px 12px;
          }
          .dh-items-table td {
            text-align: left !important; padding: 4px 0 !important; border: none !important;
          }
          .dh-items-table td[data-label]:not([data-label=""])::before {
            content: attr(data-label); display: block; font-size: 10px; font-weight: 700;
            color: #6b7280; letter-spacing: 0.5px; margin-top: 6px;
          }
        }
      `}</style>

      <PrintToolbar invoiceNum={invoiceNum} label={docLabel === "ESTIMATE" ? "Estimate" : "Invoice"} />

      <div id="invoice-root" style={{ paddingTop: "60px", paddingBottom: "40px" }}>
        <div
          id="invoice"
          style={{ maxWidth: "800px", margin: "24px auto", background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", borderRadius: "4px" }}
        >
          {/* Blue top bar */}
          <div style={{ height: "14px", background: "#1B3FA8" }} />

          {/* Header */}
          <div className="dh-doc-section" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", padding: "28px 40px 20px", borderBottom: "1px solid #e5e7eb", gap: "24px" }}>
            <div style={{ flexShrink: 0, width: "110px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo dada house.png" alt="DADA HOUSE" style={{ width: "100%", height: "auto" }} />
            </div>

            <div style={{ flex: 1, fontSize: "12px", color: "#374151", lineHeight: "1.65" }}>
              <div style={{ fontWeight: "bold", fontSize: "15px", color: "#111827", marginBottom: "4px" }}>DADA HOUSE LLC</div>
              <div>Business Number (844) 928-0875</div>
              <div><strong>TX:</strong> 7001 South Texas 6 STE 246, Houston, TX 77083</div>
              <div><strong>NC:</strong> 106 Thompson Street, Jacksonville, NC 28540</div>
              <div>☎ (844) 928-0875</div>
              <div style={{ color: "#1B3FA8" }}>https://www.dada-house.com</div>
              <div>customerservice@mydadahouse.com</div>
            </div>

            <div style={{ textAlign: "right", fontSize: "12px", minWidth: "180px" }}>
              <div style={{ fontSize: "22px", fontWeight: "bold", color: "#111827", letterSpacing: "2px" }}>{docLabel}</div>
              <div style={{ fontWeight: "700", fontSize: "14px", color: "#1B3FA8", marginBottom: "14px" }}>{invoiceNum}</div>
              <table style={{ marginLeft: "auto", borderCollapse: "collapse", width: "100%" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "3px 14px 3px 0", color: "#6b7280", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" as const, textAlign: "right" as const }}>DATE</td>
                    <td style={{ padding: "3px 0", fontWeight: "500", textAlign: "right" as const }}>{fmtDate(invoice.createdAt)}</td>
                  </tr>
                  {!isEstimate && (
                    <tr>
                      <td style={{ padding: "3px 14px 3px 0", color: "#6b7280", fontWeight: "600", fontSize: "11px", textTransform: "uppercase" as const, textAlign: "right" as const }}>DUE</td>
                      <td style={{ padding: "3px 0", fontWeight: "500", textAlign: "right" as const }}>
                        {invoice.dueDate ? fmtDate(invoice.dueDate) : "On Receipt"}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={{ padding: "10px 14px 3px 0", color: isPaid ? "#16a34a" : "#111827", fontWeight: "700", fontSize: "11px", textTransform: "uppercase" as const, textAlign: "right" as const }}>
                      {isEstimate ? "ESTIMATE TOTAL" : isPaid ? "PAID ✓" : "BALANCE DUE"}
                    </td>
                    <td style={{ padding: "10px 0 3px", fontWeight: "700", color: isPaid ? "#16a34a" : "#111827", textAlign: "right" as const }}>
                      USD {fmtCur(balanceDue)}
                    </td>
                  </tr>
                  {isPaid && invoice.paidAt && (
                    <tr>
                      <td colSpan={2} style={{ padding: "2px 0", textAlign: "right" as const, fontSize: "11px", color: "#6b7280" }}>
                        Paid {fmtDate(invoice.paidAt)}{invoice.paymentMethod ? ` · ${invoice.paymentMethod}` : ""}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bill To */}
          <div className="dh-doc-section" style={{ padding: "18px 40px", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: "6px" }}>BILL TO</div>
            <div style={{ fontWeight: "700", fontSize: "16px", color: "#111827" }}>{invoice.appointment.name}</div>
            {invoice.appointment.phone && <div style={{ color: "#374151", fontSize: "13px", marginTop: "2px" }}>{invoice.appointment.phone}</div>}
            {invoice.appointment.email && <div style={{ color: "#374151", fontSize: "13px" }}>{invoice.appointment.email}</div>}
            {invoice.appointment.address && (
              <div style={{ color: "#374151", fontSize: "13px" }}>
                {invoice.appointment.address}{invoice.appointment.city ? `, ${invoice.appointment.city}` : ""}
              </div>
            )}
          </div>

          {/* Line items */}
          <div className="dh-doc-section" style={{ padding: "0 40px" }}>
            <table className="dh-items-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
              <thead>
                <tr style={{ background: "#1B3FA8", color: "white" }}>
                  <th style={{ padding: "11px 14px", textAlign: "left" as const, fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", width: "45%" }}>DESCRIPTION</th>
                  <th style={{ padding: "11px 14px", textAlign: "right" as const, fontSize: "11px", fontWeight: "700" }}>RATE</th>
                  <th style={{ padding: "11px 14px", textAlign: "center" as const, fontSize: "11px", fontWeight: "700" }}>QTY</th>
                  {taxEnabled && <th style={{ padding: "11px 14px", textAlign: "right" as const, fontSize: "11px", fontWeight: "700" }}>TAX</th>}
                  <th style={{ padding: "11px 14px", textAlign: "right" as const, fontSize: "11px", fontWeight: "700" }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td data-label="" style={{ padding: "14px", fontSize: "13px", color: "#111827" }}>
                      <div style={{ fontWeight: "500", whiteSpace: "pre-wrap" }}>{item.description}</div>
                      {item.note && <div style={{ color: "#6b7280", fontSize: "12px", marginTop: "2px", whiteSpace: "pre-wrap" }}>{item.note}</div>}
                    </td>
                    <td data-label="RATE" style={{ padding: "14px", textAlign: "right" as const, fontSize: "13px", color: "#111827" }}>{fmtCur(item.rate)}</td>
                    <td data-label="QTY" style={{ padding: "14px", textAlign: "center" as const, fontSize: "13px", color: "#111827" }}>{item.qty}</td>
                    {taxEnabled && (
                      <td data-label="TAX" style={{ padding: "14px", textAlign: "right" as const, fontSize: "13px", color: "#111827" }}>
                        <div>{fmtCur(item.rate * item.qty * taxRate / 100)}</div>
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>{taxRate}%</div>
                      </td>
                    )}
                    <td data-label="AMOUNT" style={{ padding: "14px", textAlign: "right" as const, fontSize: "13px", fontWeight: "600", color: "#111827" }}>{fmtCur(item.rate * item.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment info + Totals */}
          <div className="dh-doc-section dh-payment-totals" style={{ display: "flex", padding: "24px 40px", gap: "40px", borderTop: "1px solid #e5e7eb", marginTop: "8px" }}>
            <div style={{ flex: 1, fontSize: "13px", minWidth: "200px" }}>
              <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827", marginBottom: "8px" }}>Payment Info</div>
              <div style={{ fontWeight: "600", fontSize: "11px", color: "#6b7280", letterSpacing: "0.5px", textTransform: "uppercase" as const, marginBottom: "4px" }}>PAYMENT INSTRUCTIONS</div>
              <div style={{ color: "#374151" }}>Zelle : payment@mydadahouse.com</div>
              {invoice.notes && (
                <>
                  <div style={{ fontWeight: "600", fontSize: "11px", color: "#6b7280", letterSpacing: "0.5px", textTransform: "uppercase" as const, marginTop: "12px", marginBottom: "4px" }}>NOTES</div>
                  <div style={{ color: "#374151", whiteSpace: "pre-wrap" }}>{invoice.notes}</div>
                </>
              )}
            </div>
            <div className="dh-totals-box" style={{ minWidth: "230px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "5px 0", fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>SUBTOTAL</td>
                    <td style={{ padding: "5px 0", fontSize: "13px", textAlign: "right" as const, color: "#111827" }}>{fmtCur(subtotal)}</td>
                  </tr>
                  {taxEnabled ? (
                    <tr>
                      <td style={{ padding: "5px 0", fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>TAX ({taxRate}%)</td>
                      <td style={{ padding: "5px 0", fontSize: "13px", textAlign: "right" as const, color: "#111827" }}>{fmtCur(tax)}</td>
                    </tr>
                  ) : (
                    <tr>
                      <td style={{ padding: "5px 0", fontSize: "12px", color: "#6b7280", fontWeight: "600" }}>TAX</td>
                      <td style={{ padding: "5px 0", fontSize: "13px", textAlign: "right" as const, color: "#6b7280" }}>—</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: "2px solid #e5e7eb" }}>
                    <td style={{ padding: "8px 0 5px", fontSize: "13px", color: "#111827", fontWeight: "700" }}>TOTAL</td>
                    <td style={{ padding: "8px 0 5px", fontSize: "15px", textAlign: "right" as const, color: "#111827", fontWeight: "700" }}>{fmtCur(total)}</td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ padding: "2px 0" }}>
                      <div style={{ background: isPaid ? "#f0fdf4" : "#f0f4ff", borderRadius: "6px", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", color: isPaid ? "#16a34a" : "#1B3FA8", fontWeight: "700" }}>
                          {isEstimate ? "ESTIMATE TOTAL" : isPaid ? "PAID ✓" : "BALANCE DUE"}
                        </span>
                        <span style={{ fontSize: "15px", color: isPaid ? "#16a34a" : "#1B3FA8", fontWeight: "700" }}>
                          USD {fmtCur(balanceDue)}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="dh-doc-section" style={{ margin: "0 40px", borderTop: "1px solid #e5e7eb", padding: "20px 0 32px" }}>
            <p style={{ fontSize: "12px", color: "#374151", margin: "0 0 6px" }}>It is a pleasure to serve you.</p>
            <p style={{ fontSize: "12px", color: "#374151", margin: "0 0 6px" }}>Our services encompass air conditioning, heating, plumbing, and remodeling.</p>
            <p style={{ fontSize: "12px", color: "#374151", margin: 0 }}>
              For additional inquiries, please contact us at (844) 928-0875 or visit our website at www.dada-house.com.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
