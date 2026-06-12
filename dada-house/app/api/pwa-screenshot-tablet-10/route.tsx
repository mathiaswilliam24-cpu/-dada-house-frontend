import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: 1920, height: 1080, background: "#0A1628", display: "flex" }}>

        {/* Sidebar */}
        <div style={{ width: 320, background: "rgba(255,255,255,0.04)", borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", padding: "32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 24px 32px" }}>
            <div style={{ width: 52, height: 52, background: "#F97316", borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "white" }}>D</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "white", fontSize: 22, fontWeight: 900, lineHeight: 1 }}>DADA</span>
              <span style={{ color: "#F97316", fontSize: 22, fontWeight: 900, lineHeight: 1 }}>HOUSE</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 16px" }}>
            {[
              { icon: "🏠", label: "Home" },
              { icon: "📅", label: "Book Service", active: true },
              { icon: "👤", label: "My Portal" },
              { icon: "🔧", label: "Plumbing" },
              { icon: "❄️", label: "Air Conditioning" },
              { icon: "🔥", label: "Heating" },
              { icon: "🏗️", label: "Remodeling" },
              { icon: "⭐", label: "Reviews" },
              { icon: "📞", label: "Contact" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: 12, background: item.active ? "rgba(249,115,22,0.15)" : "transparent", border: item.active ? "1px solid rgba(249,115,22,0.3)" : "1px solid transparent" }}>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <span style={{ color: item.active ? "#F97316" : "#94a3b8", fontSize: 16, fontWeight: item.active ? 700 : 400 }}>{item.label}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#F97316", borderRadius: 12, padding: "14px" }}>
              <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>📞 Emergency: 832-629-4398</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span style={{ color: "white", fontSize: 14, fontWeight: 600 }}>📞 Service: 346-649-9353</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "40px 48px" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 36 }}>
            <span style={{ color: "#F97316", fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>AVAILABLE 24/7 NATIONWIDE</span>
            <span style={{ color: "white", fontSize: 44, fontWeight: 900 }}>Premier Home Services</span>
            <span style={{ color: "#93c5fd", fontSize: 18 }}>Book licensed and insured technicians in minutes</span>
          </div>

          <div style={{ display: "flex", gap: 20, flex: 1 }}>
            {[
              { icon: "🔧", name: "Plumbing", desc: "Leak repair, pipe work, water heaters", color: "#3b82f6", stat: "2h avg response" },
              { icon: "❄️", name: "Air Conditioning", desc: "AC repair and installation", color: "#06b6d4", stat: "Same day service" },
              { icon: "🔥", name: "Heating", desc: "Furnace and heat pump services", color: "#f59e0b", stat: "24/7 emergency" },
              { icon: "🏗️", name: "Remodeling", desc: "Kitchen and bathroom renovation", color: "#8b5cf6", stat: "Free estimate" },
            ].map((s) => (
              <div key={s.name} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 64, height: 64, background: `${s.color}22`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>{s.icon}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ color: "white", fontWeight: 700, fontSize: 20 }}>{s.name}</span>
                    <span style={{ color: "#64748b", fontSize: 14 }}>{s.desc}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 0" }}>
                  <span style={{ color: "#93c5fd", fontSize: 13, fontWeight: 600 }}>{s.stat}</span>
                </div>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", background: "#F97316", borderRadius: 14, padding: "16px 0" }}>
                  <span style={{ color: "white", fontSize: 16, fontWeight: 700 }}>Book Now</span>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    ),
    { width: 1920, height: 1080 }
  );
}
