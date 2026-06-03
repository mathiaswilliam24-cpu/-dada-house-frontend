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

        {/* Page title */}
        <div style={{ padding: "16px 20px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: "#F97316", fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>BOOK A SERVICE</span>
          <span style={{ color: "white", fontSize: 24, fontWeight: 900 }}>Choose Your Service</span>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", padding: "0 20px 16px", gap: 6 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#F97316" }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>

        {/* Plumbing card - selected */}
        <div style={{ margin: "0 16px 12px", background: "rgba(249,115,22,0.12)", border: "2px solid #F97316", borderRadius: 16, padding: "16px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 50, height: 50, background: "#3b82f622", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔧</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Plumbing</span>
            <span style={{ color: "#64748b", fontSize: 12 }}>Leaks, pipes, water heaters</span>
          </div>
          <div style={{ width: 24, height: 24, background: "#F97316", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 14, fontWeight: 700 }}>✓</div>
        </div>

        {/* AC card */}
        <div style={{ margin: "0 16px 12px", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 50, height: 50, background: "#06b6d422", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>❄️</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Air Conditioning</span>
            <span style={{ color: "#64748b", fontSize: 12 }}>AC repair &amp; installation</span>
          </div>
        </div>

        {/* Heating card */}
        <div style={{ margin: "0 16px 12px", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 50, height: 50, background: "#f59e0b22", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔥</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Heating</span>
            <span style={{ color: "#64748b", fontSize: 12 }}>Furnace &amp; heat pump</span>
          </div>
        </div>

        {/* Remodeling card */}
        <div style={{ margin: "0 16px 12px", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 50, height: 50, background: "#8b5cf622", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏗️</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Remodeling</span>
            <span style={{ color: "#64748b", fontSize: 12 }}>Kitchen &amp; bathroom reno</span>
          </div>
        </div>

        {/* Next button */}
        <div style={{ marginTop: "auto", padding: "0 16px 32px" }}>
          <div style={{ background: "#F97316", color: "white", borderRadius: 14, padding: "16px 0", textAlign: "center", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
            Next — Contact Info
          </div>
        </div>
      </div>
    ),
    { width: 390, height: 844 }
  );
}
