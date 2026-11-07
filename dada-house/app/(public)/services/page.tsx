import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone, AlertTriangle } from "lucide-react";
import CTASection from "@/components/home/cta-section";

export const metadata: Metadata = {
  title: "HVAC & Air Duct Cleaning Services — Texas & North Carolina | DADA HOUSE",
  description:
    "DADA HOUSE offers professional HVAC and air duct cleaning services in Texas & North Carolina. AC installation & repair, heating, duct cleaning, and maintenance plans. Same-day service. Call (844) 928-0875.",
};

const services = [
  {
    slug: "air-conditioning",
    label: "Air Conditioning",
    emoji: "❄️",
    description:
      "Expert AC installation, repair, and seasonal tune-ups. Keep your home cool and energy-efficient all summer long with our licensed HVAC technicians.",
    features: [
      "AC Installation",
      "AC Repair",
      "AC Tune-Up",
      "Refrigerant Recharge",
      "Thermostat Installation",
      "Ductless Mini-Split",
    ],
  },
  {
    slug: "heating",
    label: "Heating",
    emoji: "🔥",
    description:
      "Furnace and heat pump installation, repair, and seasonal tune-ups. Stay warm and efficient all winter with our heating experts.",
    features: [
      "Furnace Installation",
      "Furnace Repair",
      "Heat Pump Service",
      "Heating Tune-Up",
      "Thermostat Installation",
      "Carbon Monoxide Testing",
    ],
  },
  {
    slug: "air-duct-cleaning",
    label: "Air Duct Cleaning",
    emoji: "💨",
    description:
      "Professional duct cleaning removes dust, allergens, mold spores, and debris — improving your indoor air quality and HVAC efficiency.",
    features: [
      "Full Duct Cleaning",
      "Dryer Vent Cleaning",
      "Sanitization & Deodorizing",
      "Mold Inspection",
      "Air Quality Test",
      "Filter Replacement",
    ],
  },
  {
    slug: "services/maintenance-plan",
    label: "HVAC Maintenance Plan",
    emoji: "🛡️",
    description:
      "Annual maintenance plan — 2 professional tune-ups per year (spring AC + fall heating), priority scheduling, $49 service calls, and 10% off all repairs.",
    features: [
      "Spring AC Tune-Up",
      "Fall Heating Tune-Up",
      "Priority Scheduling",
      "10% Off All Repairs",
      "$49 Service Call Fee",
      "Military Discount",
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero-gradient py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-5">
            What We Do
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-5">
            HVAC &amp; Air Quality Services
          </h1>
          <p className="text-blue-200 text-xl max-w-2xl mx-auto mb-8">
            Licensed HVAC technicians across Texas &amp; North Carolina — same-day service, 24/7 emergency, background-checked professionals.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="tel:+18449280875"
              className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-semibold transition-colors"
            >
              <Phone size={14} />
              +1 (844) 928-0875
            </a>
            <span className="text-white/20">|</span>
            <a
              href="tel:+18449280875"
              className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-semibold transition-colors"
            >
              <AlertTriangle size={14} />
              Emergency: (844) 928-0875
            </a>
          </div>
        </div>
        <div className="wave-divider">
          <svg viewBox="0 0 1440 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,25 C360,50 1080,0 1440,25 L1440,50 L0,50 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* Services list */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {services.map((service, i) => (
              <div
                key={service.slug}
                className={`flex flex-col ${i % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"} gap-8 items-center bg-[#F8FAFC] border border-slate-200 hover:border-[#F7921A]/30 rounded-3xl p-8 transition-colors`}
              >
                <div className="flex-1">
                  <div className="text-4xl mb-4">{service.emoji}</div>
                  <h2 className="text-3xl font-black text-[#1B3FA8] mb-3">
                    {service.label}
                  </h2>
                  <p className="text-slate-500 text-lg mb-5 leading-relaxed">
                    {service.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {service.features.map((f) => (
                      <span
                        key={f}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-600 font-medium"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/${service.slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B3FA8] hover:bg-[#0D1D5E] text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    View {service.label}
                    <ArrowRight size={15} />
                  </Link>
                </div>

                <div className="w-full lg:w-80 h-64 bg-[#1B3FA8] border border-[#1A3490] rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-8xl">{service.emoji}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
