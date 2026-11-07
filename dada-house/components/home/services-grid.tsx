import Link from "next/link";
import { ArrowRight } from "lucide-react";

const services = [
  {
    slug: "air-conditioning",
    label: "Air Conditioning",
    description:
      "AC installation, repair, and tune-ups. Keep your home cool and energy-efficient all summer long.",
    subservices: [
      "AC Installation",
      "AC Repair",
      "AC Tune-Up",
      "Refrigerant Recharge",
      "Thermostat Install",
      "Ductless Mini-Split",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  {
    slug: "heating",
    label: "Heating",
    description:
      "Furnace and heat pump installation, repair, and seasonal tune-ups. Stay warm and efficient all winter.",
    subservices: [
      "Furnace Installation",
      "Furnace Repair",
      "Heat Pump Service",
      "Heating Tune-Up",
      "Thermostat Install",
      "Carbon Monoxide Test",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    ),
  },
  {
    slug: "air-duct-cleaning",
    label: "Air Duct Cleaning",
    description:
      "Professional duct cleaning removes dust, allergens, and mold to improve air quality and system efficiency.",
    subservices: [
      "Full Duct Cleaning",
      "Dryer Vent Cleaning",
      "Sanitization & Deodorizing",
      "Mold Inspection",
      "Air Quality Test",
      "Filter Replacement",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    slug: "hvac-maintenance-plan",
    label: "Maintenance Plan",
    description:
      "Annual HVAC maintenance plan — 2 tune-ups per year, priority scheduling, $69 service calls, and 10% off all repairs.",
    subservices: [
      "Spring AC Tune-Up",
      "Fall Heating Tune-Up",
      "Priority Scheduling",
      "10% Off Repairs",
      "$69 Service Call",
      "Military Discount",
    ],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
];

export default function ServicesGrid() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-4">
            What We Do
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#0A1628] mb-4">
            HVAC &amp; Air Quality Services
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-lg">
            Air conditioning, heating, and air duct cleaning — licensed HVAC professionals
            serving Texas &amp; North Carolina.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {services.map((service, i) => (
            <Link
              key={service.slug}
              href={`/${service.slug}`}
              className="group relative bg-white border border-slate-200 hover:border-[#F7921A]/50 rounded-2xl p-6 flex flex-col transition-all hover:shadow-xl hover:shadow-orange-900/10 hover:-translate-y-1"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Top accent bar */}
              <div className="absolute top-0 left-6 right-6 h-0.5 rounded-full bg-gradient-to-r from-[#F7921A] to-[#1B3FA8] opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Icon */}
              <div className="w-14 h-14 bg-[#F8FAFC] border border-slate-200 group-hover:bg-[#F7921A]/10 group-hover:border-[#F7921A]/30 rounded-xl flex items-center justify-center mb-5 transition-colors text-[#1B3FA8] group-hover:text-[#F7921A]">
                {service.icon}
              </div>

              {/* Title */}
              <h3 className="text-[#0A1628] font-bold text-lg mb-2 group-hover:text-[#1B3FA8] transition-colors">
                {service.label}
              </h3>

              {/* Description */}
              <p className="text-slate-500 text-sm leading-relaxed mb-5 flex-1">
                {service.description}
              </p>

              {/* Subservices */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {service.subservices.slice(0, 3).map((sub) => (
                  <span
                    key={sub}
                    className="px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-500 font-medium"
                  >
                    {sub}
                  </span>
                ))}
                {service.subservices.length > 3 && (
                  <span className="px-2 py-0.5 bg-[#F7921A]/10 rounded-full text-xs text-[#F7921A] font-semibold">
                    +{service.subservices.length - 3} more
                  </span>
                )}
              </div>

              {/* Learn more */}
              <div className="flex items-center gap-2 text-[#1B3FA8] group-hover:text-[#F7921A] text-sm font-bold transition-colors group-hover:gap-3">
                See Services
                <ArrowRight size={15} />
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#1B3FA8] hover:bg-[#0D1D5E] text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-blue-900/20"
          >
            Get a Free Estimate Today
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
