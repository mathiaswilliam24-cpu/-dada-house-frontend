import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, ArrowRight, Phone, Calendar, BadgePercent, Shield, Zap, Star, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import CTASection from "@/components/home/cta-section";

export const metadata: Metadata = {
  title: "HVAC Maintenance Plan — $199/Year | DADA HOUSE",
  description:
    "DADA HOUSE HVAC Maintenance Plan: 2 professional tune-ups per year (AC + Heating), $69 diagnostic fee, priority scheduling, 10% off all repairs. Texas & North Carolina. Call (844) 928-0875.",
  alternates: { canonical: "/services/maintenance-plan" },
};

// ── Exact checklist of every task performed ───────────────────────────
const acChecklist = [
  { task: "Inspect & clean evaporator coil", detail: "Remove dust and debris buildup that reduces cooling efficiency" },
  { task: "Inspect & clean condenser coil", detail: "Clear outdoor unit fins and coil of dirt and obstructions" },
  { task: "Check refrigerant levels", detail: "Measure charge; note leaks — recharge billed separately if needed" },
  { task: "Flush condensate drain line", detail: "Clear blockages to prevent water damage and mold growth" },
  { task: "Inspect & tighten electrical connections", detail: "Loose connections cause failures and are a fire hazard" },
  { task: "Test capacitors & contactors", detail: "Measure microfarad rating; flag components nearing failure" },
  { task: "Calibrate thermostat", detail: "Verify accuracy; check staging and scheduling" },
  { task: "Inspect & clean blower motor and wheel", detail: "Dirty blower reduces airflow and spikes energy bills" },
  { task: "Check / replace air filter", detail: "Standard 1" filter included; media filter replacement billed separately" },
  { task: "Measure supply & return air temperatures", detail: "Verify ΔT is within 14–22 °F of specification" },
  { task: "Lubricate all moving parts", detail: "Bearings, motor shafts — reduces wear and noise" },
  { task: "Measure voltage & amperage on all motors", detail: "Confirm readings are within manufacturer tolerance" },
  { task: "Inspect ductwork connections at air handler", detail: "Seal obvious leaks with mastic or foil tape" },
  { task: "Test all safety switches & cutoffs", detail: "High-pressure, low-pressure, float switch — verify proper shutdown" },
  { task: "Inspect disconnect box & wiring", detail: "Check for corrosion, overheating signs, and proper breaker sizing" },
  { task: "Document system findings & performance report", detail: "Written summary left with homeowner after every visit" },
];

const heatingChecklist = [
  { task: "Inspect heat exchanger for cracks", detail: "Cracked exchanger causes CO leaks — safety-critical check" },
  { task: "Clean & adjust burners", detail: "Ensure even flame pattern and complete combustion" },
  { task: "Check gas pressure & connections", detail: "Verify manifold pressure; soap-test all fittings for leaks" },
  { task: "Inspect & clean igniter and flame sensor", detail: "Failed sensor is the #1 cause of no-heat calls" },
  { task: "Inspect flue / venting system", detail: "Check for blockages, corrosion, proper pitch and termination" },
  { task: "Inspect & clean blower motor and belt", detail: "Adjust belt tension; lubricate bearings" },
  { task: "Calibrate thermostat & test heating stages", detail: "Verify accurate temp sensing and proper stage sequencing" },
  { task: "Test limit switches & safety controls", detail: "Verify high-temperature limit and pressure switches operate" },
  { task: "Check / replace air filter", detail: "Standard 1" filter included; media filter billed separately" },
  { task: "Measure carbon monoxide (CO) levels", detail: "Test flue gases and living area — document readings" },
  { task: "Test all safety shutoffs & rollout switches", detail: "Confirm system shuts down safely under fault conditions" },
  { task: "Measure voltage & amperage on motors", detail: "Confirm readings within manufacturer tolerance" },
  { task: "Inspect heat pump reversing valve (if applicable)", detail: "Check switchover operation and refrigerant charge" },
  { task: "Inspect ductwork connections at furnace", detail: "Seal obvious leaks; check return air path" },
  { task: "Inspect vent drain (high-efficiency only)", detail: "Clear condensate trap on 90%+ AFUE systems" },
  { task: "Document findings & leave performance report", detail: "Written summary with any recommended repairs" },
];

const planBenefits = [
  { icon: Calendar, title: "2 Tune-Ups Per Year", body: "One spring AC visit + one fall heating visit — scheduled at a time that works for you." },
  { icon: Zap,      title: "$69 Diagnostic Fee", body: "Service call diagnostic reduced from the standard $139 — saves you $70 every time we come out." },
  { icon: Star,     title: "Priority Scheduling", body: "Plan members are booked before non-members. No waiting weeks during peak season." },
  { icon: BadgePercent, title: "10% Off All Repairs", body: "Every repair — parts and labor — is discounted 10% for the life of your plan." },
  { icon: Shield,   title: "Safety Documentation", body: "Written performance report left after every visit: temperatures, amperage, CO levels, and noted concerns." },
];

const faqs = [
  { q: "When do you schedule the two visits?", a: "Typically spring (March–May) for AC and fall (September–November) for heating. We'll reach out 2–3 weeks in advance to book a time." },
  { q: "What is NOT included in the plan?", a: "Refrigerant recharges, replacement parts, media filter upgrades, and repairs beyond the tune-up scope are billed separately. We'll always give you a quote before any additional work." },
  { q: "Do I have to be home?", a: "Yes — a responsible adult 18+ must be present. We'll give you a 2-hour arrival window and call 30 minutes before we arrive." },
  { q: "Does the plan cover multiple systems?", a: "The $199 plan covers one HVAC system (one furnace + one AC). Multi-system homes can add additional systems at $99/year each." },
  { q: "What if I need a repair between tune-ups?", a: "Call (844) 928-0875 anytime. Plan members get priority dispatch and 10% off any repair we perform." },
  { q: "How do I cancel?", a: "Call or email anytime. Plans are prorated — if no visits have occurred you'll receive a full refund within 5 business days." },
];

export default function MaintenancePlanPage() {
  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0A1628 0%, #0D1D5E 55%, #102050 100%)" }}>
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0 L0 0 0 40' fill='none' stroke='%23ffffff' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px",
        }} />
        <div className="absolute top-0 right-0 w-96 h-96 blur-3xl opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, #F7921A, transparent 70%)", transform: "translate(25%,-25%)" }} />

        <div className="relative max-w-5xl mx-auto px-5 md:px-10 py-16 md:py-24 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-5"
            style={{ background: "rgba(247,146,26,0.15)", border: "1px solid rgba(247,146,26,0.4)", color: "#F7921A" }}>
            ★ Most Popular Plan
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4">
            HVAC Maintenance Plan
          </h1>
          <p className="text-slate-300 text-xl max-w-2xl mx-auto mb-3">
            Two complete professional tune-ups per year — one for your AC, one for your heating system — plus priority service and repair discounts.
          </p>
          <div className="flex items-baseline justify-center gap-2 mb-8">
            <span className="text-6xl font-black text-[#F7921A]">$199</span>
            <span className="text-2xl text-slate-400 font-semibold">/year</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/booking?service=HVAC+Maintenance+Plan" className={cn(buttonVariants({ size: "lg" }), "gap-2 font-bold text-base shadow-lg shadow-orange-900/30")}>
              <Calendar size={18} />
              Subscribe Now — $199/Year
            </Link>
            <a href="tel:+18449280875"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Phone size={18} />
              Call (844) 928-0875
            </a>
          </div>
          <p className="text-slate-500 text-sm mt-4">No contract · Cancel anytime · Covers TX &amp; NC</p>
        </div>
      </section>

      {/* ── PLAN BENEFITS ── */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <h2 className="text-3xl font-black text-[#0A1628] text-center mb-10">Everything Included in Your Plan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {planBenefits.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-5 flex flex-col gap-3">
                <div className="w-11 h-11 bg-[#F7921A]/10 border border-[#F7921A]/30 rounded-xl flex items-center justify-center">
                  <Icon size={20} className="text-[#F7921A]" />
                </div>
                <p className="text-[#0A1628] font-bold text-sm">{title}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MILITARY DISCOUNT ── */}
      <div className="bg-[#0A1628] py-6">
        <div className="max-w-4xl mx-auto px-5 md:px-10 flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
          <span className="text-4xl">🇺🇸</span>
          <div>
            <p className="text-white font-black text-lg">Military Discount — 10% Off All Repairs</p>
            <p className="text-slate-400 text-sm">We honor active duty, veterans, and military families with an additional 10% off every repair service.</p>
          </div>
        </div>
      </div>

      {/* ── CHECKLIST ── */}
      <section id="checklist" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto px-5 md:px-10">
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-4">
              Full Scope of Work
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[#0A1628] mb-3">
              Exactly What We Do on Every Visit
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              No shortcuts. Every item on this list is performed and documented on every tune-up visit.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* AC Tune-Up */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 flex items-center gap-3" style={{ background: "linear-gradient(90deg, #0D1D5E, #1B3FA8)" }}>
                <span className="text-2xl">❄️</span>
                <div>
                  <p className="text-white font-black text-lg">Spring AC Tune-Up</p>
                  <p className="text-blue-200 text-xs">Scheduled March – May · {acChecklist.length} inspection points</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {acChecklist.map(({ task, detail }) => (
                  <div key={task} className="px-6 py-3 flex items-start gap-3 group hover:bg-slate-50 transition-colors">
                    <CheckCircle size={16} className="text-[#F7921A] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[#0A1628] text-sm font-semibold">{task}</p>
                      <p className="text-slate-400 text-xs leading-snug mt-0.5">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Heating Tune-Up */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 flex items-center gap-3" style={{ background: "linear-gradient(90deg, #7c1d0a, #c2410c)" }}>
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="text-white font-black text-lg">Fall Heating Tune-Up</p>
                  <p className="text-orange-200 text-xs">Scheduled September – November · {heatingChecklist.length} inspection points</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {heatingChecklist.map(({ task, detail }) => (
                  <div key={task} className="px-6 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                    <CheckCircle size={16} className="text-[#F7921A] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[#0A1628] text-sm font-semibold">{task}</p>
                      <p className="text-slate-400 text-xs leading-snug mt-0.5">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Note on exclusions */}
          <div className="mt-8 flex items-start gap-3 p-5 rounded-xl"
            style={{ background: "rgba(247,146,26,0.08)", border: "1px solid rgba(247,146,26,0.25)" }}>
            <AlertTriangle size={18} className="text-[#F7921A] shrink-0 mt-0.5" />
            <p className="text-slate-600 text-sm leading-relaxed">
              <strong className="text-[#0A1628]">Not included in the plan price:</strong> Refrigerant recharges, replacement parts, media/HEPA filter upgrades, and any repair work outside the tune-up scope. We provide a written quote for any additional work and never proceed without your approval.
            </p>
          </div>
        </div>
      </section>

      {/* ── PRICING CARD ── */}
      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-5 md:px-10 text-center">
          <div className="border-2 border-[#F7921A] rounded-3xl p-8 shadow-xl shadow-orange-900/10">
            <p className="text-[#F7921A] text-xs font-bold uppercase tracking-widest mb-2">Annual Plan</p>
            <div className="flex items-baseline justify-center gap-2 mb-4">
              <span className="text-6xl font-black text-[#0A1628]">$199</span>
              <span className="text-xl text-slate-400">/year</span>
            </div>
            <ul className="space-y-2.5 mb-8 text-left max-w-xs mx-auto">
              {["2 professional tune-ups (AC + Heating)", "Priority scheduling year-round", "$69 diagnostic fee (save $70/visit)", "10% off all parts & labor", "Written performance report each visit", "Military 10% discount on repairs"].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-slate-700">
                  <CheckCircle size={16} className="text-[#F7921A] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/booking?service=HVAC+Maintenance+Plan"
              className={cn(buttonVariants({ size: "lg" }), "w-full gap-2 font-bold text-base")}>
              <Calendar size={18} />
              Subscribe Now — $199/Year
            </Link>
            <p className="text-slate-400 text-xs mt-4">No contract · Cancel anytime · Renews annually</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-5 md:px-10">
          <h2 className="text-2xl font-black text-[#0A1628] text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <div key={q} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-[#0A1628] font-bold text-sm mb-2">{q}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <p className="text-slate-500 text-sm mb-4">Still have questions?</p>
            <a href="tel:+18449280875"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B3FA8] hover:bg-[#0D1D5E] text-white font-bold rounded-xl transition-colors">
              <Phone size={16} />
              Call (844) 928-0875
            </a>
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
