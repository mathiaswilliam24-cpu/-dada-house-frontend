import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { PrintToolbar } from "@/components/print/print-toolbar";

export const dynamic = "force-dynamic";

export default async function PrintContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const contract = await db.maintenanceContract.findUnique({
    where: { token },
    include: { customer: true, planType: true },
  });
  if (!contract) notFound();

  const { customer, planType } = contract;
  const contractNum = `MC${contract.id.slice(-6).toUpperCase()}`;
  const fmtDate = (d: Date | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <>
      <style>{`
        @page { size: letter; margin: 10mm; }
        @media print { .no-print { display: none !important; } body { margin: 0 !important; background: white !important; } }
        * { font-family: Arial, Helvetica, sans-serif; box-sizing: border-box; }
        body { background: #f3f4f6; margin: 0; }
        @media screen and (max-width: 640px) {
          .dh-doc-section { padding-left: 16px !important; padding-right: 16px !important; }
        }
        .dh-contract-section h2 { color: #1B3FA8; font-size: 15px; margin: 20px 0 8px; }
        .dh-contract-section ul { padding-left: 20px; margin: 0 0 10px; }
        .dh-contract-section li { margin-bottom: 6px; }
        .dh-contract-section p { margin: 0 0 10px; line-height: 1.6; }
        .dh-checklist { width: 100%; border-collapse: collapse; font-size: 12px; }
        .dh-checklist th { text-align: left; background: #f3f4f6; padding: 6px; }
        .dh-checklist td { padding: 4px 6px; border-bottom: 1px solid #f3f4f6; }
      `}</style>

      <PrintToolbar invoiceNum={contractNum} label="Contract" />

      <div style={{ paddingTop: "60px", paddingBottom: "40px" }}>
        <div style={{ maxWidth: "800px", margin: "24px auto", background: "white", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", borderRadius: "4px" }}>
          <div style={{ height: "14px", background: "#1B3FA8" }} />

          <div className="dh-doc-section" style={{ padding: "28px 40px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo dada house.png" alt="DADA HOUSE" style={{ width: "110px", height: "auto" }} />
                <div style={{ fontSize: "12px", color: "#374151", marginTop: "8px", lineHeight: "1.6" }}>
                  <div><strong>TX:</strong> 7001 South Texas 6 STE 246, Houston, TX 77083</div>
                  <div><strong>NC:</strong> 106 Thompson Street, Jacksonville, NC 28540</div>
                  <div>☎ (844) 928-0875</div>
                </div>
              </div>
              <div style={{ textAlign: "right" as const, fontSize: "12px" }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#111827", letterSpacing: "2px" }}>MAINTENANCE CONTRACT</div>
                <div style={{ fontWeight: "700", fontSize: "14px", color: "#1B3FA8", marginTop: "6px" }}>{contractNum}</div>
                <div style={{ color: "#6b7280", marginTop: "6px" }}>Status: <strong style={{ color: "#111827" }}>{contract.status}</strong></div>
              </div>
            </div>
          </div>

          <div className="dh-doc-section" style={{ padding: "18px 40px", borderBottom: "1px solid #e5e7eb", fontSize: "13px" }}>
            <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "6px" }}>{planType.name} Maintenance Plan</div>
            <div style={{ color: "#374151" }}>{customer.firstName} {customer.lastName ?? ""} · {customer.phone}{customer.email ? ` · ${customer.email}` : ""}</div>
            {customer.address && <div style={{ color: "#374151" }}>{customer.address}, {customer.city}, {customer.state} {customer.zipCode}</div>}
            {contract.systemMakeModel && <div style={{ color: "#374151", marginTop: "6px" }}>System: {contract.systemMakeModel} {contract.systemAge ? `(Age: ${contract.systemAge})` : ""}</div>}
            {contract.systemTypes.length > 0 && (
              <div style={{ color: "#374151", marginTop: "6px" }}>{contract.numberOfSystems} system{contract.numberOfSystems === 1 ? "" : "s"} · {contract.systemTypes.join(" + ")}</div>
            )}
            <div style={{ marginTop: "10px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div><span style={{ color: "#6b7280" }}>Monthly:</span> <strong>{formatCurrency(planType.monthlyPrice * (contract.numberOfSystems || 1))}</strong></div>
              <div><span style={{ color: "#6b7280" }}>Annual:</span> <strong>{formatCurrency(planType.annualPrice * (contract.numberOfSystems || 1))}</strong></div>
              {contract.billingInterval && <div><span style={{ color: "#6b7280" }}>Billing:</span> <strong>{contract.billingInterval} {contract.autoRenew ? "(auto-renews)" : "(one-time)"}</strong></div>}
            </div>
          </div>

          <div className="dh-doc-section" style={{ padding: "0 40px" }} dangerouslySetInnerHTML={{ __html: planType.contractHtml }} />

          <div className="dh-doc-section" style={{ padding: "20px 40px", borderTop: "1px solid #e5e7eb", display: "flex", gap: "40px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px" }}>CUSTOMER SIGNATURE</div>
              {contract.customerSignatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={contract.customerSignatureUrl} alt="Customer signature" style={{ height: "60px" }} />
              ) : <div style={{ color: "#9ca3af", fontSize: "13px" }}>Not yet signed</div>}
              <div style={{ fontSize: "12px", color: "#374151", marginTop: "4px" }}>{customer.firstName} {customer.lastName ?? ""} · {fmtDate(contract.signedAt)}</div>
            </div>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px" }}>DADA HOUSE REPRESENTATIVE</div>
              <div style={{ fontSize: "13px", color: "#111827", marginTop: "20px" }}>{contract.repName ?? "DADA HOUSE"}</div>
            </div>
          </div>

          <div className="dh-doc-section" style={{ padding: "20px 40px 28px", borderTop: "1px solid #e5e7eb" }}>
            <p style={{ fontSize: "12px", color: "#374151", margin: 0 }}>Questions about your plan? Call (844) 928-0875 or visit www.dada-house.com.</p>
          </div>
        </div>
      </div>
    </>
  );
}
