import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone, AlertTriangle } from "lucide-react";
import CTASection from "@/components/home/cta-section";

export const metadata: Metadata = {
  title: "Home Services Houston — Plumbing, AC, Heating, Remodeling",
  description:
    "DADA HOUSE offers professional plumbing, air conditioning, heating, and remodeling services in Houston TX. Available 24/7.",
};

const services = [
  {
    slug: "plumbing",
    label: "Plumbing",
    emoji: "🔧",
    description:
      "From emergency leak repairs to full pipe installations. Our plumbers are licensed and ready 24/7.",
    features: [
      "Leak Repair",
      "Faucet Repair",
      "Drain Cleaning",
      "Pipe Installation",
      "Water Heater",
      "Toilet Repair",
    ],
  },
  {
    slug: "air-conditioning",
    label: "Air Conditioning",
    emoji: "❄️",
    description:
      "Keep your home cool year-round with expert AC installation, repair, and maintenance services.",
    features: [
      "AC Repair",
      "AC Installation",
      "Refrigerant Recharge",
      "Thermostat Install",
      "Seasonal Tune-Up",
      "Emergency Repair",
    ],
  },
  {
    slug: "heating",
    label: "Heating",
    emoji: "🔥",
    description:
      "Stay warm with our furnace repair, heat pump service, and full HVAC maintenance programs.",
    features: [
      "Furnace Repair",
      "Heating Installation",
      "Heat Pump Services",
      "Duct Cleaning",
      "Maintenance Plans",
      "Emergency Repair",
    ],
  },
  {
    slug: "remodeling",
    label: "Remodeling",
    emoji: "🏠",
    description:
      "Transform your home with professional remodeling — kitchens, bathrooms, flooring, and more.",
    features: [
      "Bathroom Remodeling",
      "Kitchen Remodeling",
      "Flooring",
      "Painting",
      "Drywall",
      "Roofing",
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
            Our Home Services
          </h1>
          <p className="text-blue-200 text-xl max-w-2xl mx-auto mb-8">
            Professional home services across Houston — available 24 hours a
            day, 7 days a week.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="tel:+19106858042"
              className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-semibold transition-colors"
            >
              <Phone size={14} />
              +1 (910) 685-8042
            </a>
            <span className="text-white/20">|</span>
            <a
              href="tel:+18326294398"
              className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-semibold transition-colors"
            >
              <AlertTriangle size={14} />
              Emergency: 832-629-4398
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
                    href={`/services/${service.slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B3FA8] hover:bg-[#0D1D5E] text-white text-sm font-bold rounded-xl transition-colors"
                  >
                    View {service.label} Services
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
