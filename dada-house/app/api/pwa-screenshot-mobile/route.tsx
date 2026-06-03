import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 390,
          height: 844,
          background: "#0A1628",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Status bar */}
        <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 20px", justifyContent: "space-between" }}>
          <span style={{ color: "white", fontSize: 13, fontWeight: 600 }}>9:41</span>
          <span style={{ color: "white", fontSize: 11 }}>●●●</span>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", padding: "12px 20px", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "#F97316", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "white" }}>D</div>
          <span style={{ color: "white", fontSize: 19, fontWeight: 800 }}>DADA <span style={{ color: "#F97316" }}>HOUSE</span></span>
        </div>

        {/* Hero */}
        <div style={{ padding: "20px 20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ color: "#F97316", fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>AVAILABLE 24/7</span>
          <span style={{ color: "white", fontSize: 30, fontWeight: 900, lineHeight: 1.1 }}><span style={{ color: "#F97316" }}>Premier</span><br />Home Services<br />Nationwide</span>
          <span style={{ color: "#93c5fd", fontSize: 13 }}>Plumbing · AC · Heating · Remodeling</span>
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 10, padding: "0 20px 20px" }}>
          <div style={{ flex: 1, background: "#F97316", color: "white", borderRadius: 12, padding: "12px 0", textAlign: "center", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>Book Service</div>
          <div style={{ flex: 1, border: "1.5px solid rgba(255,255,255,0.2)", color: "white", borderRadius: 12, padding: "12px 0", textAlign: "center", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>Call Now</div>
        </div>

        {/* Service list */}
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: "🔧", name: "Plumbing", desc: "Leak repair & pipe work", color: "#3b82f6" },
            { icon: "❄️", name: "Air Conditioning", desc: "AC repair & installation", color: "#06b6d4" },
            { icon: "🔥", name: "Heating", desc: "Furnace & heat pump", color: "#f59e0b" },
            { icon: "🏗️", name: "Remodeling", desc: "Kitchen & bathroom reno", color: "#8b5cf6" },
          ].map((s) => (
            <div key={s.name} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, background: `${s.color}22`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{s.icon}</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>{s.name}</span>
                <span style={{ color: "#64748b", fontSize: 12 }}>{s.desc}</span>
              </div>
              <span style={{ color: "#F97316", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>

        {/* Bottom nav */}
        <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", padding: "12px 0 24px" }}>
          {["🏠 Home", "📅 Book", "👤 Portal", "⚙️ More"].map((item) => (
            <div key={item} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 20 }}>{item.split(" ")[0]}</span>
              <span style={{ color: "#64748b", fontSize: 10 }}>{item.split(" ")[1]}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 390, height: 844 }
  );
}
