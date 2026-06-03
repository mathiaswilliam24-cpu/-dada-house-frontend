import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1024,
          height: 500,
          background: "linear-gradient(135deg, #0A1628 0%, #0F2040 60%, #0A1628 100%)",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 80px",
        }}
      >
        {/* Left — Branding */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 64,
              height: 64,
              background: "#F97316",
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 900,
              color: "white",
            }}>D</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "white", fontSize: 32, fontWeight: 900, lineHeight: 1 }}>DADA</span>
              <span style={{ color: "#F97316", fontSize: 32, fontWeight: 900, lineHeight: 1 }}>HOUSE</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ color: "#F97316", fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>AVAILABLE 24/7 NATIONWIDE</span>
            <span style={{ color: "white", fontSize: 52, fontWeight: 900, lineHeight: 1.1 }}>
              Premier<br />Home Services
            </span>
            <span style={{ color: "#93c5fd", fontSize: 20 }}>Plumbing · AC · Heating · Remodeling</span>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ background: "rgba(249,115,22,0.2)", border: "1px solid #F97316", borderRadius: 20, padding: "8px 18px", color: "#F97316", fontSize: 14, fontWeight: 600 }}>Professional</div>
            <div style={{ background: "rgba(249,115,22,0.2)", border: "1px solid #F97316", borderRadius: 20, padding: "8px 18px", color: "#F97316", fontSize: 14, fontWeight: 600 }}>Vetted</div>
            <div style={{ background: "rgba(249,115,22,0.2)", border: "1px solid #F97316", borderRadius: 20, padding: "8px 18px", color: "#F97316", fontSize: 14, fontWeight: 600 }}>24/7 Support</div>
          </div>
        </div>

        {/* Right — Services */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: "18px 28px", display: "flex", alignItems: "center", gap: 16, width: 300 }}>
            <span style={{ fontSize: 32 }}>🔧</span>
            <span style={{ color: "white", fontWeight: 700, fontSize: 20 }}>Plumbing</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: "18px 28px", display: "flex", alignItems: "center", gap: 16, width: 300 }}>
            <span style={{ fontSize: 32 }}>❄️</span>
            <span style={{ color: "white", fontWeight: 700, fontSize: 20 }}>Air Conditioning</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: "18px 28px", display: "flex", alignItems: "center", gap: 16, width: 300 }}>
            <span style={{ fontSize: 32 }}>🔥</span>
            <span style={{ color: "white", fontWeight: 700, fontSize: 20 }}>Heating</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 18, padding: "18px 28px", display: "flex", alignItems: "center", gap: 16, width: 300 }}>
            <span style={{ fontSize: 32 }}>🏗️</span>
            <span style={{ color: "white", fontWeight: 700, fontSize: 20 }}>Remodeling</span>
          </div>
        </div>
      </div>
    ),
    { width: 1024, height: 500 }
  );
}
