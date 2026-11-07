import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle, Phone, Calendar, BadgePercent, Shield, Zap, Star,
  Thermometer, FileText, Bell, History, Clock, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import CTASection from "@/components/home/cta-section";
import { calcPropertyAnnual, calcPropertyMonthly } from "@/lib/enrollment-pricing";

export const metadata: Metadata = {
  title: "HVAC Maintenance Plan — DADA HOUSE | Texas & North Carolina",
  description:
    "Protect your HVAC system year-round. Two tune-ups per year, priority scheduling, $69 service calls, and 10% off repairs. Starting at $199/year. Texas & North Carolina. Enroll online in minutes.",
  alternates: { canonical: "/hvac-maintenance-plan" },
};

const planFeatures = [
  {
    icon: Thermometer,
    title: "Two Professional Tune-Ups / Year",
    desc: "One spring cooling tune-up + one fall heating tune-up — 16 inspection points each, performed by a licensed HVAC technician.",
  },
  {
    icon: Star,
    title: "Priority Scheduling",
    desc: "Plan members are booked before the general public. No waiting weeks during the peak season.",
  },
  {
    icon: Zap,
    title: "$69 Diagnostic Service Call",
    desc: "If something breaks down between tune-ups, your service call fee is $69 — reduced from the standard $99.",
  },
  {
    icon: BadgePercent,
    title: "10% Off All HVAC Repairs",
    desc: "Every repair — parts and labor — is discounted 10% for plan members for the entire membership year.",
  },
  {
    icon: Bell,
    title: "Seasonal Maintenance Reminders",
    desc: "We'll reach out before each seasonal tune-up window so you never miss a scheduled maintenance visit.",
  },
  {
    icon: FileText,
    title: "Digital Maintenance Reports",
    desc: "After every visit, you receive a detailed digital report with photos, readings, and technician notes.",
  },
  {
    icon: History,
    title: "Service History Online",
    desc: "Access your complete maintenance history, reports, and invoices from your customer dashboard anytime.",
  },
  {
    icon: Clock,
    title: "Appointment Notifications",
    desc: "SMS and email reminders 48 hours and 24 hours before every appointment, plus technician-assigned alerts.",
  },
];

// Per-property pricing: each address starts at $199/yr for 1st system
const tiers = [
  { systems: 1, annual: calcPropertyAnnual(1), monthly: calcPropertyMonthly(1) },
  { systems: 2, annual: calcPropertyAnnual(2), monthly: calcPropertyMonthly(2) },
  { systems: 3, annual: calcPropertyAnnual(3), monthly: calcPropertyMonthly(3) },
  { systems: 4, annual: calcPropertyAnnual(4), monthly: calcPropertyMonthly(4) },
  { systems: 5, annual: calcPropertyAnnual(5), monthly: calcPropertyMonthly(5) },
];

const faqs = [
  {
    q: "What is included in the spring cooling tune-up?",
    a: "16 inspection points: coil cleaning (evaporator + condenser), refrigerant check, capacitor & contactor test, drain line flush, electrical connections, blower, filter replacement, and a full written report.",
  },
  {
    q: "What is included in the fall heating tune-up?",
    a: "16 inspection points: heat exchanger visual inspection, CO safety test, burner cleaning, ignitor & flame sensor, flue check, electrical connections, limit/safety controls, filter replacement, and a full written report.",
  },
  {
    q: "Does the plan cover repairs?",
    a: "The plan price covers the two tune-up visits only. If a repair is needed, you receive a 10% member discount on all parts and labor. Parts, refrigerant, and repairs are billed separately.",
  },
  {
    q: "What counts as one HVAC system?",
    a: "One system = one air handler or furnace paired with its outdoor condenser or heat pump. A home with two separate AC systems (upstairs + downstairs) has two systems.",
  },
  {
    q: "Can I cancel?",
    a: "Annual plans can be cancelled anytime — no commitment. Monthly plans have a 12-month minimum commitment; after 12 months you can cancel anytime by calling (844) 928-0875. If no visits have occurred on an annual plan, a full refund applies within 5 business days.",
  },
  {
    q: "What service areas are covered?",
    a: "We currently serve Texas and North Carolina. Contact us at (844) 928-0875 to confirm your specific city.",
  },
];

export default function HvacMaintenancePlanPage() {
  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0A1628 0%, #0D1D5E 55%, #102050 100%)" }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0 L0 0 0 40' fill='none' stroke='%23ffffff' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px",
        }} />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, #F7921A, transparent 70%)", transform: "translate(30%,-30%)" }} />

        <div className="relative max-w-6xl mx-auto px-5 md:px-10 py-16 md:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Badge */}
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-6"
                style={{ background: "rgba(247,146,26,0.15)", border: "1px solid rgba(247,146,26,0.4)", color: "#F7921A" }}>
                ★ HVAC Maintenance Plan
              </span>

              <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.05] mb-5">
                Protect Your Comfort.<br />
                <span className="text-[#F7921A]">Prevent Costly<br />Breakdowns.</span>
              </h1>

              <p className="text-slate-300 text-xl mb-8 leading-relaxed max-w-lg">
                Two professional HVAC tune-ups per year, priority scheduling, and repair discounts — starting at just $199/year or $21/month.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <Link href="/hvac-maintenance-plan/enroll"
                  className={cn(buttonVariants({ size: "lg" }), "gap-2 font-bold text-base shadow-xl shadow-orange-900/30")}>
                  <Calendar size={18} />
                  Enroll Now — Starting at $199/Year
                </Link>
                <a href="#benefits"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-base text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                  See Plan Benefits
                  <ArrowRight size={16} />
                </a>
              </div>

              {/* Trust strip */}
              <div className="flex flex-wrap gap-4 text-slate-400 text-sm">
                {["No contract required", "Cancel anytime", "Licensed technicians", "TX & NC"].map(t => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-green-400" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Price cards */}
            <div className="space-y-4">
              <div className="rounded-2xl p-6 border-2 border-[#F7921A]" style={{ background: "rgba(247,146,26,0.08)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-black text-lg">Annual Plan</span>
                  <span className="px-3 py-1 bg-[#F7921A] text-white text-xs font-bold rounded-full uppercase">Best Value</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-black text-[#F7921A]">$199</span>
                  <span className="text-slate-400 text-lg">/year</span>
                </div>
                <p className="text-slate-400 text-sm">for 1 system · $159/yr each additional</p>
              </div>
              <div className="rounded-2xl p-6 border border-slate-700" style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-black text-lg">Monthly Plan</span>
                  <span className="px-3 py-1 bg-slate-700 text-slate-300 text-xs font-bold rounded-full uppercase">Flexible</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-black text-slate-200">$21</span>
                  <span className="text-slate-400 text-lg">/month</span>
                </div>
                <p className="text-slate-400 text-sm">for 1 system · additional rate configurable</p>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="text-2xl">🇺🇸</span>
                <div>
                  <p className="text-white font-bold text-sm">Military Discount — Extra 10% Off</p>
                  <p className="text-slate-400 text-xs">Active duty &amp; veterans honored on every job</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLAN BENEFITS ── */}
      <section id="benefits" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-4">
              Plan Includes
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[#0A1628] mb-3">What You Get</h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Every plan member receives these benefits for the full membership year.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {planFeatures.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-5 flex flex-col gap-3 hover:border-[#F7921A]/30 transition-colors">
                <div className="w-12 h-12 bg-[#F7921A]/10 border border-[#F7921A]/30 rounded-xl flex items-center justify-center">
                  <Icon size={22} className="text-[#F7921A]" />
                </div>
                <p className="text-[#0A1628] font-bold text-sm leading-tight">{title}</p>
                <p className="text-slate-500 text-xs leading-relaxed flex-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TABLE ── */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-5 md:px-10">
          <h2 className="text-3xl font-black text-[#0A1628] text-center mb-3">Transparent Pricing</h2>
          <p className="text-slate-500 text-center text-sm mb-8">Per property — each address is billed independently.</p>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-6">
            <div className="grid grid-cols-3 bg-[#0A1628] text-white text-sm font-bold">
              <div className="px-5 py-4">Systems at Address</div>
              <div className="px-5 py-4">Annual<span className="text-[#F7921A]">*</span></div>
              <div className="px-5 py-4">Monthly<span className="text-amber-400">†</span></div>
            </div>
            {tiers.map(({ systems, annual, monthly }, i) => (
              <div key={systems} className={`grid grid-cols-3 text-sm ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                <div className="px-5 py-4 font-semibold text-[#0A1628]">
                  {systems} System{systems > 1 ? "s" : ""}
                </div>
                <div className="px-5 py-4 font-black text-[#F7921A]">
                  ${annual.toFixed(0)}<span className="text-slate-400 font-normal">/yr</span>
                </div>
                <div className="px-5 py-4 text-slate-600">
                  ${monthly.toFixed(2)}<span className="text-slate-400">/mo</span>
                </div>
              </div>
            ))}
            <div className="px-5 py-4 bg-[#F8FAFC] text-xs text-slate-500 border-t border-slate-200 space-y-1">
              <p><span className="text-[#F7921A] font-bold">*</span> Annual plan: cancel anytime, no commitment.</p>
              <p><span className="text-amber-500 font-bold">†</span> Monthly plan: 12-month minimum commitment. After 12 months, continues month-to-month.</p>
              <p>Extra systems beyond 5 at same address: +$159/yr or +$16.78/mo each. Max 20 systems online.</p>
            </div>
          </div>

          {/* Multi-property callout */}
          <div className="bg-[#0A1628] rounded-2xl p-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-black text-lg mb-1">Landlord or Property Manager?</p>
                <p className="text-slate-300 text-sm">
                  One account · one billing · multiple addresses. Manage each property and schedule tune-ups separately from your dashboard. Each address billed at $199/yr independently.
                </p>
              </div>
              <Link href="/hvac-maintenance-plan/enroll"
                className="shrink-0 flex items-center gap-2 px-5 py-3 bg-[#F7921A] hover:bg-[#e07f10] text-white font-bold text-sm rounded-xl transition-colors whitespace-nowrap">
                Enroll All Properties
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT WE CHECK ── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-10">
          <h2 className="text-3xl font-black text-[#0A1628] text-center mb-3">16-Point Tune-Up Checklist</h2>
          <p className="text-slate-500 text-center mb-10 max-w-xl mx-auto">
            Performed and documented every visit.
            <Link href="/services/maintenance-plan#checklist" className="text-[#1B3FA8] font-semibold ml-1 hover:underline">
              See full checklist →
            </Link>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                label: "❄️ Spring Cooling Tune-Up", items: [
                  "Evaporator & condenser coil cleaning", "Refrigerant level check", "Capacitor & contactor test",
                  "Condensate drain flush", "Electrical connections", "Filter replacement", "Temperature differential",
                  "Blower & fan operation",
                ],
              },
              {
                label: "🔥 Fall Heating Tune-Up", items: [
                  "Heat exchanger visual inspection", "Carbon monoxide safety test", "Burner cleaning",
                  "Ignitor & flame sensor service", "Flue & venting check", "Safety controls test",
                  "Filter replacement", "Temperature rise measurement",
                ],
              },
            ].map(({ label, items }) => (
              <div key={label} className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-5">
                <p className="font-black text-[#0A1628] mb-4 text-base">{label}</p>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle size={14} className="text-[#F7921A] shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-5 md:px-10">
          <h2 className="text-3xl font-black text-[#0A1628] text-center mb-10">Common Questions</h2>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <div key={q} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-[#0A1628] font-bold text-sm mb-2">{q}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="py-16 bg-[#0A1628]">
        <div className="max-w-3xl mx-auto px-5 md:px-10 text-center">
          <h2 className="text-3xl font-black text-white mb-4">Ready to Protect Your HVAC System?</h2>
          <p className="text-slate-400 text-lg mb-8">
            Enroll online in under 5 minutes. No contract, cancel anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/hvac-maintenance-plan/enroll"
              className={cn(buttonVariants({ size: "lg" }), "gap-2 font-bold text-base shadow-xl shadow-orange-900/40")}>
              <Calendar size={18} />
              Enroll Now — $199/Year
            </Link>
            <a href="tel:+18449280875"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white text-base"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Phone size={18} />
              Call (844) 928-0875
            </a>
          </div>
          <p className="text-slate-600 text-sm mt-5">Texas &amp; North Carolina · Licensed HVAC Technicians · Background-Checked</p>
        </div>
      </section>

      {/* Mobile floating CTA */}
      <div className="fixed bottom-5 inset-x-4 z-40 md:hidden">
        <Link href="/hvac-maintenance-plan/enroll"
          className="flex items-center justify-center gap-2 w-full py-4 bg-[#F7921A] hover:bg-[#e07f10] text-white font-black text-base rounded-2xl shadow-2xl shadow-orange-900/50 transition-colors">
          <Calendar size={18} />
          Enroll Now — $199/Year
        </Link>
      </div>

      <CTASection />
    </>
  );
}
