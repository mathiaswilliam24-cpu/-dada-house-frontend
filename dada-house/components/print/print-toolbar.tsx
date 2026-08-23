"use client";
export function PrintToolbar({ invoiceNum }: { invoiceNum: string }) {
  return (
    <div
      className="no-print"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "#1B3FA8", padding: "12px 24px",
        display: "flex", alignItems: "center", gap: "12px",
      }}
    >
      <button
        onClick={() => window.history.back()}
        style={{ color: "white", background: "none", border: "1px solid rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}
      >
        ← Back
      </button>
      <span style={{ color: "white", fontWeight: 600, fontSize: "14px" }}>
        Invoice Preview — {invoiceNum}
      </span>
      <button
        onClick={() => window.print()}
        style={{ marginLeft: "auto", background: "#F97316", color: "white", border: "none", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "14px" }}
      >
        ⬇ Download PDF
      </button>
    </div>
  );
}
