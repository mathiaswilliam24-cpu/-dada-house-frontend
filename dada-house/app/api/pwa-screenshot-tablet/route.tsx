import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: 1280, height: 720, background: "#0A1628", display: "flex" }}>

        {/* Sidebar */}
        <div style={{ width: 260, background: "rgba(255,255,255,0.04)", borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", padding: "24px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px 24px" }}>
            <div style={{ width: 40, height: 40, background: "#F97316", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: "white" }}>D</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "white", fontSize: 16, fontWeight: 900, lineHeight: 1 }}>DADA</span>
              <span style={{ color: "#F97316", fontSize: 16, fontWeight: 900, lineHeight: 1 }}>HOUSE</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 12px" }}>
            {[
              { icon: "🏠", label: "Home" },
              { icon: "📅", label: "Book Service", active: true },
              { icon: "👤", label: "My Portal" },
              { icon: "🔧", label: "Plumbing" },
              { icon: "❄️", label: "Air Conditioning" },
              { icon: "🔥", label: "Heating" },
              { icon: "🏗️", label: "Remodeling" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: item.active ? "rgba(249,115,22,0.15)" : "transparent", border: item.active ? "1px solid rgba(249,115,22,0.3)" : "1px solid transparent" }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ color: item.active ? "#F97316" : "#94a3b8", fontSize: 14, fontWeight: item.active ? 700 : 400 }}>{item.label}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "auto", padding: "0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#F97316", borderRadius: 10, padding: "12px" }}>
              <span style={{ color: "white", fontSize: 13, fontWeight: 700 }}>📞 Emergency: 832-629-4398</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "28px 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 24 }}>
            <span style={{ color: "#F97316", fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>AVAILABLE 24/7</span>
            <span style={{ color: "white", fontSize: 32, fontWeight: 900 }}>Premier Home Services</span>
            <span style={{ color: "#93c5fd", fontSize: 14 }}>Book a service in minutes — licensed and insured technicians</span>
          </div>

          <div style={{ display: "flex", gap: 16, flex: 1 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { icon: "🔧", name: "Plumbing", desc: "Leak repair, pipe work, water heaters", color: "#3b82f6" },
                { icon: "❄️", name: "Air Conditioning", desc: "AC repair and installation", color: "#06b6d4" },
              ].map((s) => (
                <div key={s.name} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 48, height: 48, background: `${s.color}22`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{s.icon}</div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{s.name}</span>
                      <span style={{ color: "#64748b", fontSize: 12 }}>{s.desc}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#F97316", borderRadius: 10, padding: "10px 0" }}>
                    <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>Book Now</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { icon: "🔥", name: "Heating", desc: "Furnace and heat pump services", color: "#f59e0b" },
                { icon: "🏗️", name: "Remodeling", desc: "Kitchen and bathroom renovation", color: "#8b5cf6" },
              ].map((s) => (
                <div key={s.name} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 48, height: 48, background: `${s.color}22`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{s.icon}</div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{s.name}</span>
                      <span style={{ color: "#64748b", fontSize: 12 }}>{s.desc}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#F97316", borderRadius: 10, padding: "10px 0" }}>
                    <span style={{ color: "white", fontSize: 14, fontWeight: 700 }}>Book Now</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    ),
    { width: 1280, height: 720 }
  );
}
