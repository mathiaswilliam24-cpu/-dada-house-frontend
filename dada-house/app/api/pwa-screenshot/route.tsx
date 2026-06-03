import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1280,
          height: 720,
          background: "#0A1628",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 40px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: "#F97316",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                color: "white",
                fontWeight: 900,
              }}
            >
              D
            </div>
            <span style={{ color: "white", fontSize: 22, fontWeight: 800 }}>
              DADA{" "}
              <span style={{ color: "#F97316" }}>HOUSE</span>
            </span>
          </div>
          <span style={{ color: "#93c5fd", fontSize: 14 }}>
            Houston's Premier Home Services
          </span>
        </div>

        {/* Hero content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "0 60px",
            gap: 60,
          }}
        >
          {/* Left */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                fontSize: 14,
                color: "#F97316",
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Available 24/7
            </div>
            <div
              style={{
                fontSize: 52,
                fontWeight: 900,
                color: "white",
                lineHeight: 1.1,
              }}
            >
              Houston&apos;s
              <br />
              <span style={{ color: "#F97316" }}>Premier</span>
              <br />
              Home Services
            </div>
            <div style={{ color: "#93c5fd", fontSize: 18, lineHeight: 1.5 }}>
              Plumbing · AC · Heating · Remodeling
            </div>

            {/* CTA buttons */}
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <div
                style={{
                  background: "#F97316",
                  color: "white",
                  padding: "14px 28px",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Book Service
              </div>
              <div
                style={{
                  border: "2px solid rgba(255,255,255,0.2)",
                  color: "white",
                  padding: "14px 28px",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                Call Now
              </div>
            </div>
          </div>

          {/* Right — service cards */}
          <div
            style={{
              width: 420,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {[
              { icon: "🔧", name: "Plumbing", desc: "Leak repair, pipe installation" },
              { icon: "❄️", name: "Air Conditioning", desc: "AC repair, installation & maintenance" },
              { icon: "🔥", name: "Heating", desc: "Furnace & heat pump services" },
              { icon: "🏗️", name: "Remodeling", desc: "Kitchen, bathroom & full renovation" },
            ].map((s) => (
              <div
                key={s.name}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 14,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <span style={{ fontSize: 28 }}>{s.icon}</span>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>{s.name}</span>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{s.desc}</span>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    background: "#F97316",
                    color: "white",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 6,
                  }}
                >
                  Book →
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats bar */}
        <div
          style={{
            display: "flex",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "16px 60px",
            gap: 0,
          }}
        >
          {[
            { num: "500+", label: "Jobs Completed" },
            { num: "24/7", label: "Emergency Service" },
            { num: "5★", label: "Rated in Houston" },
            { num: "10+", label: "Years Experience" },
          ].map((s, i) => (
            <div
              key={s.num}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ color: "#F97316", fontSize: 22, fontWeight: 900 }}>{s.num}</span>
              <span style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { width: 1280, height: 720 }
  );
}
