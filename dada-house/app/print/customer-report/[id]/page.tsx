import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PrintToolbar } from "@/components/print/print-toolbar";

export const dynamic = "force-dynamic";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtD = (s: string | Date) =>
  new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function CustomerReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, phone: true, createdAt: true,
      properties: { orderBy: { createdAt: "asc" } },
      appointments: {
        orderBy: { createdAt: "asc" },
        include: {
          invoice: { select: { id: true, amount: true, status: true, paidAt: true, dueDate: true } },
          technician: { select: { id: true, name: true } },
        },
      },
      reviews: { orderBy: { createdAt: "asc" } },
      servicePlans: {
        include: { plan: { select: { name: true, price: true, interval: true } } },
      },
    },
  });

  if (!user) notFound();

  // Group appointments by year
  type Appt = typeof user.appointments[number];
  const byYear = new Map<number, Appt[]>();
  for (const appt of user.appointments) {
    const yr = new Date(appt.createdAt).getFullYear();
    if (!byYear.has(yr)) byYear.set(yr, []);
    byYear.get(yr)!.push(appt);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  const totalSpent = user.appointments
    .filter(a => a.invoice?.status === "PAID")
    .reduce((s, a) => s + (a.invoice?.amount ?? 0), 0);

  const totalBilled = user.appointments
    .filter(a => a.invoice)
    .reduce((s, a) => s + (a.invoice?.amount ?? 0), 0);

  const completed = user.appointments.filter(a => a.status === "COMPLETED").length;
  const reportYear = new Date().getFullYear();

  return (
    <>
      <style>{`
        @page { margin: 20mm 18mm; size: A4; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
        .no-print { }
        @media print { .no-print { display: none !important; } body { padding-top: 0 !important; } }
        .page-body { padding-top: 60px; }
        table { border-collapse: collapse; width: 100%; }
        th { background: #1B3FA8; color: white; padding: 7px 10px; text-align: left; font-size: 11px; }
        td { padding: 6px 10px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
        tr:nth-child(even) td { background: #f8f9ff; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 600; }
        .paid { background: #dcfce7; color: #15803d; }
        .sent { background: #dbeafe; color: #1d4ed8; }
        .draft { background: #f3f4f6; color: #4b5563; }
        .completed { background: #dcfce7; color: #15803d; }
        .confirmed { background: #dbeafe; color: #1d4ed8; }
        .pending { background: #fef9c3; color: #854d0e; }
        .cancelled { background: #fee2e2; color: #b91c1c; }
        .year-section { margin-bottom: 28px; }
        .year-header { background: #1B3FA8; color: white; padding: 8px 14px; border-radius: 8px 8px 0 0; font-size: 14px; font-weight: bold; }
        .section-title { font-size: 13px; font-weight: bold; color: #1B3FA8; margin: 18px 0 8px; border-bottom: 2px solid #1B3FA8; padding-bottom: 4px; }
        .stat-grid { display: flex; gap: 16px; margin: 12px 0; flex-wrap: wrap; }
        .stat-card { background: #f8f9ff; border: 1px solid #e0e7ff; border-radius: 8px; padding: 10px 16px; min-width: 110px; }
        .stat-value { font-size: 18px; font-weight: bold; color: #1B3FA8; }
        .stat-label { font-size: 10px; color: #6b7280; margin-top: 2px; }
      `}</style>

      {/* Toolbar — hidden when printing */}
      <PrintToolbar invoiceNum={`Customer Report — ${user.name ?? user.email}`} />

      <div className="page-body" style={{ maxWidth: 800, margin: "0 auto", padding: "0 12px 40px" }}>

        {/* Blue top bar */}
        <div style={{ background: "#1B3FA8", padding: "18px 24px", marginBottom: 24, borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: "bold", color: "white" }}>DADA HOUSE LLC</div>
              <div style={{ fontSize: 11, color: "#c7d2fe", marginTop: 4 }}>
                7001 SOUTH TEXAS 6 STE 246 · Houston, Texas 77083<br />
                (346) 649-9353 · customerservice@mydadahouse.com
              </div>
            </div>
            <div style={{ textAlign: "right", color: "white" }}>
              <div style={{ fontSize: 18, fontWeight: "bold" }}>ANNUAL CLIENT REPORT</div>
              <div style={{ fontSize: 12, color: "#c7d2fe", marginTop: 4 }}>Generated: {fmtD(new Date())}</div>
            </div>
          </div>
        </div>

        {/* Client info */}
        <div style={{ background: "#f8f9ff", border: "1px solid #e0e7ff", borderRadius: 8, padding: "14px 20px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 32 }}>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>CLIENT</div>
              <div style={{ fontSize: 16, fontWeight: "bold" }}>{user.name ?? "(No name)"}</div>
              <div style={{ fontSize: 11, color: "#374151", marginTop: 4 }}>{user.email}</div>
              {user.phone && <div style={{ fontSize: 11, color: "#374151" }}>{user.phone}</div>}
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>CLIENT SINCE</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtD(user.createdAt)}</div>
            </div>
            {user.properties.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>MAIN PROPERTY</div>
                <div style={{ fontSize: 12 }}>{user.properties[0].address}</div>
                <div style={{ fontSize: 11, color: "#374151" }}>{user.properties[0].city}, TX {user.properties[0].zipCode}</div>
              </div>
            )}
          </div>
        </div>

        {/* Overall stats */}
        <div className="section-title">Overall Summary</div>
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{user.appointments.length}</div>
            <div className="stat-label">Total Appointments</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{completed}</div>
            <div className="stat-label">Completed Jobs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "#15803d" }}>{fmt(totalSpent)}</div>
            <div className="stat-label">Total Paid</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: "#d97706" }}>{fmt(totalBilled - totalSpent)}</div>
            <div className="stat-label">Outstanding Balance</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{user.reviews.length}</div>
            <div className="stat-label">Reviews Submitted</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{user.properties.length}</div>
            <div className="stat-label">Properties</div>
          </div>
        </div>

        {/* Service breakdown */}
        {(() => {
          const svcMap = new Map<string, { count: number; spent: number }>();
          for (const appt of user.appointments) {
            const cur = svcMap.get(appt.service) ?? { count: 0, spent: 0 };
            cur.count++;
            if (appt.invoice?.status === "PAID") cur.spent += appt.invoice.amount;
            svcMap.set(appt.service, cur);
          }
          const entries = Array.from(svcMap.entries()).sort((a, b) => b[1].spent - a[1].spent);
          if (entries.length === 0) return null;
          return (
            <>
              <div className="section-title">Services Breakdown</div>
              <table>
                <thead>
                  <tr><th>Service</th><th>Appointments</th><th>Amount Paid</th></tr>
                </thead>
                <tbody>
                  {entries.map(([svc, data]) => (
                    <tr key={svc}>
                      <td style={{ fontWeight: 500 }}>{svc}</td>
                      <td>{data.count}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(data.spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          );
        })()}

        {/* Year-by-year history */}
        <div className="section-title" style={{ marginTop: 24 }}>Work History by Year</div>
        {years.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 12 }}>No appointments recorded yet.</p>
        ) : years.map(yr => {
          const appts = byYear.get(yr)!;
          const yrPaid = appts.filter(a => a.invoice?.status === "PAID").reduce((s, a) => s + (a.invoice?.amount ?? 0), 0);
          const yrBilled = appts.filter(a => a.invoice).reduce((s, a) => s + (a.invoice?.amount ?? 0), 0);
          const yrCompleted = appts.filter(a => a.status === "COMPLETED").length;
          return (
            <div key={yr} className="year-section">
              <div className="year-header">
                {yr} — {appts.length} appointment{appts.length !== 1 ? "s" : ""} &nbsp;·&nbsp; {yrCompleted} completed &nbsp;·&nbsp; {fmt(yrPaid)} paid
                {yrBilled > yrPaid && <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.8 }}>(billed {fmt(yrBilled)})</span>}
              </div>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Service</th>
                    <th>Technician</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Invoice</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {appts.map((appt, i) => (
                    <tr key={appt.id}>
                      <td style={{ color: "#6b7280", fontFamily: "monospace", fontSize: 10 }}>{appt.appointmentNumber}</td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{appt.service}</span>
                        {appt.subservice && <span style={{ color: "#6b7280", marginLeft: 4 }}>· {appt.subservice}</span>}
                        {appt.description && <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{appt.description.slice(0, 80)}{appt.description.length > 80 ? "…" : ""}</div>}
                      </td>
                      <td style={{ color: "#374151" }}>{appt.technician?.name ?? "—"}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {appt.preferredDate ? fmtD(appt.preferredDate) : fmtD(appt.createdAt)}
                      </td>
                      <td>
                        <span className={`badge ${appt.status.toLowerCase().replace("_", "-")}`}>
                          {appt.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        {appt.invoice ? (
                          <span className={`badge ${appt.invoice.status.toLowerCase()}`}>{appt.invoice.status}</span>
                        ) : <span style={{ color: "#9ca3af" }}>—</span>}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {appt.invoice ? fmt(appt.invoice.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Reviews section */}
        {user.reviews.length > 0 && (
          <>
            <div className="section-title">Client Reviews</div>
            <table>
              <thead>
                <tr><th>Rating</th><th>Service</th><th>Review</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {user.reviews.map(rev => (
                  <tr key={rev.id}>
                    <td>{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</td>
                    <td>{rev.service}</td>
                    <td style={{ maxWidth: 220 }}>{rev.content.slice(0, 120)}{rev.content.length > 120 ? "…" : ""}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtD(rev.createdAt)}</td>
                    <td>
                      <span className={`badge ${rev.approved ? "paid" : "draft"}`}>
                        {rev.approved ? "Published" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 40, borderTop: "1px solid #e5e7eb", paddingTop: 16, textAlign: "center", fontSize: 10, color: "#9ca3af" }}>
          This report was generated by DADA HOUSE LLC for internal use only. All services provided under the DADA HOUSE brand.
          <br />
          www.mydadahouse.com · (910) 685-8042 · customerservice@mydadahouse.com
        </div>
      </div>
    </>
  );
}
