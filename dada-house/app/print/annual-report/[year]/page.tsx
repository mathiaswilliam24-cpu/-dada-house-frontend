import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const fmtCur = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function AnnualReportPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const session = await auth();
  const user = session?.user as { id?: string; name?: string; email?: string; role?: string } | undefined;
  if (!user?.id) redirect("/auth/login");

  const { year } = await params;
  const yr = parseInt(year, 10);
  if (isNaN(yr) || yr < 2020 || yr > 2100) notFound();

  const start = new Date(`${yr}-01-01T00:00:00.000Z`);
  const end   = new Date(`${yr + 1}-01-01T00:00:00.000Z`);

  const appointments = await db.appointment.findMany({
    where: {
      userId: user.id,
      createdAt: { gte: start, lt: end },
    },
    include: {
      invoice: { select: { id: true, amount: true, total: true, status: true, paidAt: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Stats
  const completed  = appointments.filter(a => a.status === "COMPLETED");
  const paid       = appointments.filter(a => a.invoice?.status === "PAID");
  const totalPaid  = paid.reduce((s, a) => s + (a.invoice?.total ?? a.invoice?.amount ?? 0), 0);
  const totalBilled = appointments
    .filter(a => a.invoice)
    .reduce((s, a) => s + (a.invoice?.total ?? a.invoice?.amount ?? 0), 0);

  // Service breakdown
  const breakdown: Record<string, { count: number; amount: number }> = {};
  for (const a of appointments) {
    const key = a.service || "Other";
    if (!breakdown[key]) breakdown[key] = { count: 0, amount: 0 };
    breakdown[key].count++;
    if (a.invoice?.status === "PAID") {
      breakdown[key].amount += a.invoice?.total ?? a.invoice?.amount ?? 0;
    }
  }

  const rows = Object.entries(breakdown).sort((a, b) => b[1].count - a[1].count);

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0 !important; background: white !important; }
        }
        * { font-family: Arial, Helvetica, sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f3f4f6; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#1B3FA8", padding: "12px 24px",
        display: "flex", alignItems: "center", gap: "12px",
      }}>
        <button onClick={() => typeof window !== "undefined" && window.history.back()}
          style={{ color: "white", background: "none", border: "1px solid rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>
          ← Back
        </button>
        <span style={{ color: "white", fontWeight: 600, fontSize: "14px" }}>
          Annual Report {yr}
        </span>
        <button onClick={() => typeof window !== "undefined" && window.print()}
          style={{ marginLeft: "auto", background: "#F97316", color: "white", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}>
          ⬇ Download PDF
        </button>
      </div>

      <div style={{ paddingTop: "60px", paddingBottom: "40px" }}>
        <div style={{ maxWidth: "800px", margin: "24px auto", background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", borderRadius: "4px", overflow: "hidden" }}>

          {/* Blue top bar */}
          <div style={{ height: "14px", background: "#1B3FA8" }} />

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", padding: "28px 40px 20px", borderBottom: "1px solid #e5e7eb", gap: "24px" }}>
            <div style={{ flexShrink: 0, width: "110px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo dada house.png" alt="DADA HOUSE" style={{ width: "100%", height: "auto" }} />
            </div>
            <div style={{ flex: 1, fontSize: "12px", color: "#374151", lineHeight: "1.65" }}>
              <div style={{ fontWeight: "bold", fontSize: "15px", color: "#111827", marginBottom: "4px" }}>DADA HOUSE LLC</div>
              <div><strong>TX:</strong> 7001 South Texas 6 STE 246, Houston, TX 77083</div>
              <div><strong>NC:</strong> 106 Thompson Street, Jacksonville, NC 28540</div>
              <div>☎ (346) 649-9353 · customerservice@mydadahouse.com</div>
              <div style={{ color: "#1B3FA8" }}>www.dada-house.com</div>
            </div>
            <div style={{ textAlign: "right", fontSize: "12px", minWidth: "180px" }}>
              <div style={{ fontSize: "22px", fontWeight: "bold", color: "#111827", letterSpacing: "2px" }}>ANNUAL</div>
              <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1B3FA8", letterSpacing: "2px", marginBottom: "8px" }}>REPORT</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#F7921A" }}>{yr}</div>
              <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Generated {fmtDate(new Date())}</div>
            </div>
          </div>

          {/* Client info */}
          <div style={{ padding: "18px 40px", background: "#f8faff", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>PREPARED FOR</div>
            <div style={{ fontWeight: "700", fontSize: "16px", color: "#111827" }}>{user.name ?? "—"}</div>
            <div style={{ color: "#374151", fontSize: "13px", marginTop: "2px" }}>{user.email}</div>
          </div>

          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0", borderBottom: "1px solid #e5e7eb" }}>
            {[
              { label: "Total Services", value: appointments.length, color: "#1B3FA8" },
              { label: "Completed", value: completed.length, color: "#16a34a" },
              { label: "Total Billed", value: fmtCur(totalBilled), color: "#F7921A" },
              { label: "Total Paid", value: fmtCur(totalPaid), color: "#16a34a" },
            ].map((s, i) => (
              <div key={i} style={{
                padding: "20px 16px", textAlign: "center",
                borderRight: i < 3 ? "1px solid #e5e7eb" : "none",
              }}>
                <div style={{ fontSize: "22px", fontWeight: "700", color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Service breakdown */}
          {rows.length > 0 && (
            <div style={{ padding: "24px 40px", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#111827", marginBottom: "14px" }}>Service Breakdown</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#1B3FA8", color: "white" }}>
                    <th style={{ padding: "9px 14px", textAlign: "left", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px" }}>SERVICE</th>
                    <th style={{ padding: "9px 14px", textAlign: "center", fontSize: "11px", fontWeight: "700" }}>JOBS</th>
                    <th style={{ padding: "9px 14px", textAlign: "right", fontSize: "11px", fontWeight: "700" }}>AMOUNT PAID</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([service, data], i) => (
                    <tr key={service} style={{ background: i % 2 === 0 ? "white" : "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "10px 14px", fontSize: "13px", color: "#111827", fontWeight: "500" }}>{service}</td>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontSize: "13px", color: "#111827" }}>{data.count}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontSize: "13px", color: data.amount > 0 ? "#16a34a" : "#9ca3af", fontWeight: "600" }}>
                        {data.amount > 0 ? fmtCur(data.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Full appointment history */}
          <div style={{ padding: "24px 40px" }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#111827", marginBottom: "14px" }}>Service History</div>
            {appointments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px", color: "#9ca3af", fontSize: "13px" }}>
                No services found for {yr}.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.5px", textTransform: "uppercase" }}>DATE</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.5px", textTransform: "uppercase" }}>SERVICE</th>
                    <th style={{ padding: "9px 10px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.5px", textTransform: "uppercase" }}>LOCATION</th>
                    <th style={{ padding: "9px 10px", textAlign: "center", fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.5px", textTransform: "uppercase" }}>STATUS</th>
                    <th style={{ padding: "9px 10px", textAlign: "right", fontSize: "11px", fontWeight: "700", color: "#6b7280", letterSpacing: "0.5px", textTransform: "uppercase" }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a, i) => {
                    const inv = a.invoice;
                    const amount = inv ? (inv.total ?? inv.amount) : null;
                    const isPaid = inv?.status === "PAID";
                    const statusColors: Record<string, string> = {
                      COMPLETED: "#16a34a", CANCELLED: "#dc2626", IN_PROGRESS: "#2563eb",
                      CONFIRMED: "#7c3aed", PENDING: "#d97706",
                    };
                    return (
                      <tr key={a.id} style={{ background: i % 2 === 0 ? "white" : "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "10px 10px", fontSize: "12px", color: "#6b7280", whiteSpace: "nowrap" }}>
                          {a.preferredDate ? fmtDate(a.preferredDate) : fmtDate(a.createdAt)}
                        </td>
                        <td style={{ padding: "10px 10px", fontSize: "12px", color: "#111827" }}>
                          <div style={{ fontWeight: "500" }}>{a.service}</div>
                          {a.subservice && <div style={{ color: "#6b7280", fontSize: "11px" }}>{a.subservice}</div>}
                        </td>
                        <td style={{ padding: "10px 10px", fontSize: "12px", color: "#6b7280" }}>
                          {a.city || a.address || "—"}
                        </td>
                        <td style={{ padding: "10px 10px", textAlign: "center" }}>
                          <span style={{
                            fontSize: "11px", fontWeight: "600", padding: "2px 8px", borderRadius: "999px",
                            background: `${statusColors[a.status] ?? "#6b7280"}18`,
                            color: statusColors[a.status] ?? "#6b7280",
                          }}>
                            {a.status.replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ padding: "10px 10px", textAlign: "right", fontSize: "12px", fontWeight: "600" }}>
                          {amount != null ? (
                            <span style={{ color: isPaid ? "#16a34a" : "#F7921A" }}>
                              {fmtCur(amount)}{isPaid ? " ✓" : ""}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr style={{ background: "#1B3FA8" }}>
                    <td colSpan={3} style={{ padding: "10px 10px" }} />
                    <td style={{ padding: "10px 10px", textAlign: "center", fontSize: "11px", fontWeight: "700", color: "white", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      TOTAL PAID
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right", fontSize: "14px", fontWeight: "700", color: "white" }}>
                      {fmtCur(totalPaid)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Footer */}
          <div style={{ margin: "0 40px", borderTop: "1px solid #e5e7eb", padding: "20px 0 32px" }}>
            <p style={{ fontSize: "12px", color: "#374151", marginBottom: "4px" }}>Thank you for trusting DADA HOUSE with your home services in {yr}.</p>
            <p style={{ fontSize: "12px", color: "#374151" }}>
              Questions? Contact us at (346) 649-9353 or customerservice@mydadahouse.com
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
