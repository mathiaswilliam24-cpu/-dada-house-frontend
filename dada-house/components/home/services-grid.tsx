import Link from "next/link";
import { ArrowRight } from "lucide-react";

const services = [
  {
    slug: "plumbing",
    label: "Plumbing",
    description:
      "Leak repairs, faucet repair, drain cleaning, pipe installation, water heaters, and toilet repair.",
    subservices: [
      "Leak Repair",
      "Faucet Repair",
      "Drain Cleaning",
      "Pipe Installation",
      "Water Heater",
      "Toilet Repair",
    ],
    color: "from-blue-900/30 to-blue-950/10",
    border: "border-blue-800/30 hover:border-blue-500/50",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    slug: "air-conditioning",
    label: "Air Conditioning",
    description:
      "AC repair, installation, refrigerant recharge, thermostat, seasonal tune-up, and emergency repair.",
    subservices: [
      "AC Repair",
      "AC Installation",
      "Refrigerant Recharge",
      "Thermostat Install",
      "Seasonal Tune-Up",
      "Emergency Repair",
    ],
    color: "from-cyan-900/30 to-cyan-950/10",
    border: "border-cyan-800/30 hover:border-cyan-500/50",
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
      "Furnace repair, heating installation, heat pump services, duct cleaning, and 24/7 emergency heating repair.",
    subservices: [
      "Furnace Repair",
      "Heating Installation",
      "Heat Pump Services",
      "Duct Cleaning",
      "Maintenance Plans",
      "Emergency Repair",
    ],
    color: "from-orange-900/30 to-red-950/10",
    border: "border-orange-800/30 hover:border-orange-500/50",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    ),
  },
  {
    slug: "remodeling",
    label: "Remodeling",
    description:
      "Bathroom and kitchen remodeling, flooring, painting, drywall, and roofing with free estimates.",
    subservices: [
      "Bathroom Remodeling",
      "Kitchen Remodeling",
      "Flooring",
      "Painting",
      "Drywall",
      "Roofing",
    ],
    color: "from-purple-900/30 to-purple-950/10",
    border: "border-purple-800/30 hover:border-purple-500/50",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
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
            Our Expertise
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1B3FA8] mb-4">
            Home Services We Specialize In
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            From emergency repairs to complete home renovations — our licensed
            technicians are ready to help 24/7.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, i) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className={`service-card relative bg-[#1B3FA8] bg-gradient-to-br ${service.color} border ${service.border} rounded-2xl p-6 flex flex-col group transition-all`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Icon */}
              <div className="w-14 h-14 bg-[#F7921A]/10 border border-[#F7921A]/20 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#F7921A]/20 transition-colors text-[#F7921A]">
                {service.icon}
              </div>

              {/* Title */}
              <h3 className="text-white font-bold text-lg mb-2">
                {service.label}
              </h3>

              {/* Description */}
              <p className="text-slate-400 text-sm leading-relaxed mb-5 flex-1">
                {service.description}
              </p>

              {/* Subservices */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {service.subservices.slice(0, 3).map((sub) => (
                  <span
                    key={sub}
                    className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400"
                  >
                    {sub}
                  </span>
                ))}
                {service.subservices.length > 3 && (
                  <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400">
                    +{service.subservices.length - 3} more
                  </span>
                )}
              </div>

              {/* Learn more */}
              <div className="flex items-center gap-2 text-[#F7921A] text-sm font-semibold group-hover:gap-3 transition-all">
                Learn More
                <ArrowRight size={15} />
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-6 py-3 border border-[#1A3490] hover:border-[#F7921A] text-[#1B3FA8] hover:text-[#F7921A] text-sm font-semibold rounded-xl transition-all"
          >
            View All Services
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
