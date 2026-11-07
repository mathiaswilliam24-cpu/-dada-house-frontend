import Link from "next/link";
import { CheckCircle, Shield, Star, Zap, ArrowRight, BadgePercent, Thermometer } from "lucide-react";

const highlights = [
  { icon: Thermometer,  label: "2 Tune-Ups / Year",    sub: "Spring AC + Fall Heating" },
  { icon: Zap,          label: "$49 Service Call Fee", sub: "vs. $99 standard rate" },
  { icon: Star,         label: "Priority Scheduling",  sub: "Skip the wait list" },
  { icon: BadgePercent, label: "10% Off All Repairs",  sub: "Parts & labor included" },
];

export default function MaintenancePlanBanner() {
  return (
    <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0A1628 0%, #0D1D5E 50%, #102050 100%)" }}>
      {/* subtle grid texture */}
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0 L0 0 0 40' fill='none' stroke='%23ffffff' stroke-width='0.5'/%3E%3C/svg%3E")`,
        backgroundSize: "40px 40px",
      }} />
      {/* orange glow */}
      <div className="absolute top-0 right-0 w-96 h-96 blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #F7921A, transparent 70%)", transform: "translate(25%,-25%)" }} />

      <div className="relative max-w-7xl mx-auto px-5 md:px-10 py-14 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

          {/* Left — copy */}
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-5"
              style={{ background: "rgba(247,146,26,0.15)", border: "1px solid rgba(247,146,26,0.4)", color: "#F7921A" }}>
              ★ HVAC Maintenance Plan
            </span>

            <h2 className="text-3xl md:text-5xl font-black text-white leading-[1.05] mb-4">
              Annual HVAC<br />
              <span className="text-[#F7921A]">Maintenance Plan</span> — $199<span className="text-2xl md:text-3xl text-slate-400 font-semibold">/year</span>
            </h2>

            <p className="text-slate-300 text-lg mb-6 max-w-md leading-relaxed">
              Two professional HVAC tune-ups per year — spring AC checkup and fall heating tune-up — plus priority service and repair discounts all year long.
            </p>

            {/* Military badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl mb-8"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <span className="text-2xl">🇺🇸</span>
              <div>
                <p className="text-white font-bold text-sm">Military Discount</p>
                <p className="text-slate-400 text-xs">Active duty &amp; veterans receive an extra 10% off all repairs</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/services/maintenance-plan"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-[#F7921A] hover:bg-[#e07f10] text-white font-bold text-base rounded-xl transition-colors shadow-lg shadow-orange-900/30"
              >
                Subscribe — $199/Year
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/services/maintenance-plan#checklist"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 font-bold text-base rounded-xl transition-colors text-white"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                See What&apos;s Included
              </Link>
            </div>
          </div>

          {/* Right — benefit cards */}
          <div className="grid grid-cols-2 gap-4">
            {highlights.map(({ icon: Icon, label, sub }) => (
              <div key={label}
                className="flex flex-col gap-3 p-5 rounded-2xl transition-colors"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(247,146,26,0.15)", border: "1px solid rgba(247,146,26,0.3)" }}>
                  <Icon size={20} className="text-[#F7921A]" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-10 pt-8 border-t flex flex-wrap gap-6 items-center justify-between"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-slate-400 text-sm">
            Covers <span className="text-white font-semibold">Air Conditioning · Heating · Air Duct Cleaning</span> — TX &amp; NC
          </p>
          <p className="text-slate-500 text-xs">No contract required · Cancel anytime · Renews annually</p>
        </div>
      </div>
    </section>
  );
}
