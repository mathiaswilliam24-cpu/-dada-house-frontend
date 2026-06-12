import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: 390, height: 844, background: "#0A1628", display: "flex", flexDirection: "column" }}>

        <div style={{ height: 44, display: "flex", alignItems: "center", padding: "0 20px", justifyContent: "space-between" }}>
          <span style={{ color: "white", fontSize: 13, fontWeight: 600 }}>9:41</span>
          <span style={{ color: "white", fontSize: 11 }}>●●●</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", padding: "12px 20px", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "#F97316", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "white" }}>D</div>
          <span style={{ color: "white", fontSize: 19, fontWeight: 800 }}>DADA HOUSE</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", padding: "16px 20px 12px", gap: 4 }}>
          <span style={{ color: "#F97316", fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>BOOK A SERVICE</span>
          <span style={{ color: "white", fontSize: 24, fontWeight: 900 }}>Choose Your Service</span>
        </div>

        <div style={{ display: "flex", padding: "0 20px 16px", gap: 6 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#F97316", display: "flex" }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", display: "flex" }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", display: "flex" }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", display: "flex" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "0 16px 12px", background: "rgba(249,115,22,0.12)", border: "2px solid #F97316", borderRadius: 16, padding: "16px" }}>
          <div style={{ width: 50, height: 50, background: "#3b82f622", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔧</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Plumbing</span>
            <span style={{ color: "#64748b", fontSize: 12 }}>Leaks, pipes, water heaters</span>
          </div>
          <div style={{ width: 24, height: 24, background: "#F97316", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 14, fontWeight: 700 }}>✓</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "0 16px 12px", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px" }}>
          <div style={{ width: 50, height: 50, background: "#06b6d422", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>❄️</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Air Conditioning</span>
            <span style={{ color: "#64748b", fontSize: 12 }}>AC repair and installation</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "0 16px 12px", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px" }}>
          <div style={{ width: 50, height: 50, background: "#f59e0b22", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🔥</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Heating</span>
            <span style={{ color: "#64748b", fontSize: 12 }}>Furnace and heat pump</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "0 16px 12px", background: "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px" }}>
          <div style={{ width: 50, height: 50, background: "#8b5cf622", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🏗️</div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Remodeling</span>
            <span style={{ color: "#64748b", fontSize: 12 }}>Kitchen and bathroom reno</span>
          </div>
        </div>

        <div style={{ marginTop: "auto", padding: "0 16px 32px", display: "flex" }}>
          <div style={{ flex: 1, background: "#F97316", color: "white", borderRadius: 14, padding: "16px 0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>
            Next — Contact Info
          </div>
        </div>

      </div>
    ),
    { width: 390, height: 844 }
  );
}
