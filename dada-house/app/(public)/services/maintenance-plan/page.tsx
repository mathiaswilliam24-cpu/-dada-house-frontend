import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, ArrowRight, Phone, Calendar, BadgePercent, Shield, Zap, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import CTASection from "@/components/home/cta-section";

export const metadata: Metadata = {
  title: "HVAC Maintenance Plan — $199/Year | DADA HOUSE",
  description:
    "DADA HOUSE HVAC Maintenance Plan: 2 professional tune-ups per year (spring AC + fall heating), $49 service call fee, priority scheduling, 10% off all repairs. Texas & North Carolina. Call (844) 928-0875.",
  alternates: { canonical: "/services/maintenance-plan" },
};

// ── Exact checklist of every task performed ───────────────────────────
const springChecklist = [
  { task: "Inspect & clean evaporator coil", detail: "Remove dust and debris buildup that reduces cooling efficiency and airflow" },
  { task: "Inspect & clean condenser coil", detail: "Outdoor unit fins cleared of dirt, grass, and debris for optimal heat transfer" },
  { task: "Check refrigerant level (Freon/R-410A)", detail: "Measure superheat and subcooling; note any potential leak points" },
  { task: "Inspect & lubricate fan motors and bearings", detail: "Blower motor, condenser fan motor — reduce friction and extend life" },
  { task: "Inspect & tighten all electrical connections", detail: "Capacitors, contactors, disconnect box — loose connections cause failures" },
  { task: "Test capacitors and contactors", detail: "Check microfarad ratings; replace worn capacitors before failure" },
  { task: "Inspect & clean condensate drain line", detail: "Flush with treatment to prevent algae buildup and water damage" },
  { task: "Measure supply and return air temperatures", detail: "Verify 15-20 degree temperature split across the coil for proper cooling" },
  { task: "Inspect & replace air filter", detail: "Standard 1-inch filter included; thicker media filters at additional cost" },
  { task: "Test thermostat calibration and operation", detail: "Verify accuracy; check cooling and fan settings" },
  { task: "Measure system amperage draws", detail: "Compare to nameplate ratings; flag any that exceed safe limits" },
  { task: "Inspect refrigerant lines and insulation", detail: "Check suction line insulation; look for signs of oil indicating a leak" },
  { task: "Inspect ductwork at accessible connections", detail: "Check for loose joints, leaks, and disconnected sections near unit" },
  { task: "Inspect and test safety switches", detail: "High-pressure and low-pressure cutouts; float switch on drain pan" },
  { task: "Clean blower wheel (if accessible)", detail: "Dirty blower wheels reduce airflow by 20-30% and strain the motor" },
  { task: "Document findings & leave written report", detail: "Full written summary with photos of any items found, left with the homeowner" },
];

const fallChecklist = [
  { task: "Inspect & clean heat exchanger (gas furnaces)", detail: "Look for cracks or rust that can allow carbon monoxide to enter the home" },
  { task: "Perform carbon monoxide safety test", detail: "Measure CO levels at registers; test CO detector function" },
  { task: "Inspect & clean burners", detail: "Remove buildup for clean combustion; check flame pattern and color" },
  { task: "Test ignitor and flame sensor", detail: "Measure ignitor resistance; clean flame sensor rod to prevent no-heat calls" },
  { task: "Inspect flue and venting", detail: "Check for blockages, corrosion, and proper draft — critical for safety" },
  { task: "Test pressure switches and limit controls", detail: "Verify safety cutouts function; replace weak switches before winter" },
  { task: "Inspect & lubricate blower motor and bearings", detail: "Extend motor life and reduce energy consumption" },
  { task: "Inspect & tighten all electrical connections", detail: "Control board, relay, blower capacitor — loose wiring causes intermittent faults" },
  { task: "Measure temperature rise across the heat exchanger", detail: "Verify within manufacturer specs (typically 35-65 degrees) for safe, efficient operation" },
  { task: "Inspect & replace air filter", detail: "Standard 1-inch filter included; thicker media filters at additional cost" },
  { task: "Test thermostat calibration and operation", detail: "Verify accuracy; check heating stages and emergency heat settings" },
  { task: "Inspect heat pump auxiliary and defrost settings", detail: "Heat pumps: verify AUX heat staging, defrost board, and reversing valve" },
  { task: "Measure gas pressure (gas furnaces)", detail: "Check manifold and static pressure against manufacturer specifications" },
  { task: "Inspect ductwork at accessible connections", detail: "Check for loose joints, leaks, and disconnected sections near the furnace" },
  { task: "Test all system safeties", detail: "Inducer pressure switch, limit switch, rollout switch — verify they trip correctly" },
  { task: "Document findings & leave written report", detail: "Full written summary with photos of any items found, left with the homeowner" },
];

const planBenefits = [
  { icon: Calendar,     title: "2 Tune-Ups Per Year",    body: "One spring AC tune-up + one fall heating tune-up — scheduled at your convenience." },
  { icon: Zap,          title: "$49 Service Call Fee",   body: "Diagnostic service call reduced from $99 — saves you $50 every time we come out." },
  { icon: Star,         title: "Priority Scheduling",    body: "Plan members are booked before non-members. No waiting weeks in the busy season." },
  { icon: BadgePercent, title: "10% Off All Repairs",    body: "Every job — parts and labor — is discounted 10% for plan members year-round." },
  { icon: Shield,       title: "Written Report Each Visit", body: "Full written summary with photos of any items found, left with you after every visit." },
];

const faqs = [
  { q: "What is included in the spring AC tune-up?", a: "We perform 16 inspection and service points including coil cleaning, refrigerant check, electrical connections, capacitor test, drain line flush, filter replacement, and a full written report." },
  { q: "What is included in the fall heating tune-up?", a: "We perform 16 inspection and service points including heat exchanger inspection, carbon monoxide safety test, burner cleaning, ignitor and flame sensor service, flue check, and a full written report." },
  { q: "What is NOT included in the plan price?", a: "Parts for repairs, refrigerant (if a recharge is needed), and any work beyond the standard tune-up scope are billed separately. We always give you a quote before any additional work." },
  { q: "Do I have to be home?", a: "Yes — a responsible adult 18+ must be present. We give you a 2-hour arrival window and call 30 minutes before we arrive." },
  { q: "What if my system breaks down between visits?", a: "Call (844) 928-0875 anytime. Plan members get priority dispatch and a $49 service call fee instead of the standard $99." },
  { q: "How do I cancel?", a: "Call or email anytime. Plans are prorated — if no visits have occurred you will receive a full refund within 5 business days." },
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
            ★ HVAC Maintenance Plan
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4">
            Annual HVAC Maintenance Plan
          </h1>
          <p className="text-slate-300 text-xl max-w-2xl mx-auto mb-3">
            Two complete HVAC tune-ups per year — spring AC and fall heating — to keep your system running efficiently and prevent costly breakdowns.
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
            <p className="text-white font-black text-lg">Military Discount — 10% Off All Work</p>
            <p className="text-slate-400 text-sm">We honor active duty, veterans, and military families with an additional 10% off every job.</p>
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
            {/* Spring AC Visit */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 flex items-center gap-3" style={{ background: "linear-gradient(90deg, #0369a1, #0284c7)" }}>
                <span className="text-2xl">❄️</span>
                <div>
                  <p className="text-white font-black text-lg">Spring AC Tune-Up</p>
                  <p className="text-sky-200 text-xs">Scheduled March – May · {springChecklist.length} inspection points</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {springChecklist.map(({ task, detail }) => (
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

            {/* Fall Heating Visit */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 flex items-center gap-3" style={{ background: "linear-gradient(90deg, #b45309, #d97706)" }}>
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="text-white font-black text-lg">Fall Heating Tune-Up</p>
                  <p className="text-orange-200 text-xs">Scheduled September – November · {fallChecklist.length} inspection points</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {fallChecklist.map(({ task, detail }) => (
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
        </div>
      </section>

      {/* ── PRICING CARD ── */}
      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-5 md:px-10 text-center">
          <div className="border-2 border-[#F7921A] rounded-3xl p-8 shadow-xl shadow-orange-900/10">
            <p className="text-[#F7921A] text-xs font-bold uppercase tracking-widest mb-2">Annual HVAC Plan</p>
            <div className="flex items-baseline justify-center gap-2 mb-4">
              <span className="text-6xl font-black text-[#0A1628]">$199</span>
              <span className="text-xl text-slate-400">/year</span>
            </div>
            <ul className="space-y-2.5 mb-8 text-left max-w-xs mx-auto">
              {["Spring AC tune-up (16 inspection points)", "Fall heating tune-up (16 inspection points)", "Priority scheduling year-round", "$49 service call fee (save $50/visit)", "10% off all parts & labor", "Military 10% discount on all work"].map(item => (
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
