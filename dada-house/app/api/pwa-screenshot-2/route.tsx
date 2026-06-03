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
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: s === 1 ? "#F97316" : "rgba(255,255,255,0.15)",
            }} />
          ))}
        </div>

        {/* Service cards grid */}
        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { icon: "🔧", name: "Plumbing", desc: "Leaks, pipes, water heaters", color: "#3b82f6", selected: true },
            { icon: "❄️", name: "Air Conditioning", desc: "AC repair & installation", color: "#06b6d4", selected: false },
            { icon: "🔥", name: "Heating", desc: "Furnace & heat pump", color: "#f59e0b", selected: false },
            { icon: "🏗️", name: "Remodeling", desc: "Kitchen & bathroom reno", color: "#8b5cf6", selected: false },
          ].map((s) => (
            <div key={s.name} style={{
              background: s.selected ? "rgba(249,115,22,0.12)" : "rgba(255,255,255,0.05)",
              border: `2px solid ${s.selected ? "#F97316" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 16,
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}>
              <div style={{
                width: 50,
                height: 50,
                background: `${s.color}22`,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}>{s.icon}</div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{s.name}</span>
                <span style={{ color: "#64748b", fontSize: 12 }}>{s.desc}</span>
              </div>
              {s.selected && (
                <div style={{
                  width: 24,
                  height: 24,
                  background: "#F97316",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 700,
                }}>✓</div>
              )}
            </div>
          ))}
        </div>

        {/* Next button */}
        <div style={{ marginTop: "auto", padding: "0 16px 32px" }}>
          <div style={{
            background: "#F97316",
            color: "white",
            borderRadius: 14,
            padding: "16px 0",
            textAlign: "center",
            fontSize: 16,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>Next — Contact Info</div>
        </div>
      </div>
    ),
    { width: 390, height: 844 }
  );
}
