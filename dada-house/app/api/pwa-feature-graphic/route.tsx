import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1024,
          height: 500,
          background: "linear-gradient(135deg, #0A1628 0%, #0F2040 50%, #0A1628 100%)",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background pattern */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          display: "flex",
          opacity: 0.04,
        }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{
              width: 128,
              height: 500,
              borderRight: "1px solid white",
            }} />
          ))}
        </div>

        {/* Left — Text */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 56,
              height: 56,
              background: "#F97316",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 900,
              color: "white",
            }}>D</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "white", fontSize: 28, fontWeight: 900, lineHeight: 1 }}>DADA</span>
              <span style={{ color: "#F97316", fontSize: 28, fontWeight: 900, lineHeight: 1 }}>HOUSE</span>
            </div>
          </div>

          {/* Headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ color: "#F97316", fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>HOUSTON, TX • AVAILABLE 24/7</span>
            <span style={{ color: "white", fontSize: 48, fontWeight: 900, lineHeight: 1.1 }}>
              Premier<br />Home Services
            </span>
            <span style={{ color: "#93c5fd", fontSize: 18 }}>Plumbing · AC · Heating · Remodeling</span>
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", gap: 12 }}>
            {["Licensed", "Insured", "24/7 Support"].map((badge) => (
              <div key={badge} style={{
                background: "rgba(249,115,22,0.15)",
                border: "1px solid rgba(249,115,22,0.4)",
                borderRadius: 20,
                padding: "6px 16px",
                color: "#F97316",
                fontSize: 13,
                fontWeight: 600,
              }}>{badge}</div>
            ))}
          </div>
        </div>

        {/* Right — Service cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, zIndex: 1 }}>
          {[
            { icon: "🔧", name: "Plumbing", color: "#3b82f6" },
            { icon: "❄️", name: "Air Conditioning", color: "#06b6d4" },
            { icon: "🔥", name: "Heating", color: "#f59e0b" },
            { icon: "🏗️", name: "Remodeling", color: "#8b5cf6" },
          ].map((s) => (
            <div key={s.name} style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              width: 280,
            }}>
              <span style={{ fontSize: 28 }}>{s.icon}</span>
              <span style={{ color: "white", fontWeight: 700, fontSize: 18 }}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1024, height: 500 }
  );
}
