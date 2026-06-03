import {
  Zap,
  Award,
  DollarSign,
  Shield,
  Clock,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Fast Response",
    description:
      "We dispatch technicians quickly. In most cases, we can reach you within the hour — day or night.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/20",
  },
  {
    icon: Award,
    title: "Professional Technicians",
    description:
      "Our team is fully background-checked and vetted. We bring expertise and professionalism to every job.",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
  },
  {
    icon: DollarSign,
    title: "Affordable Pricing",
    description:
      "Transparent, upfront pricing with no hidden fees. We offer competitive rates and free estimates.",
    color: "text-green-400",
    bg: "bg-green-400/10 border-green-400/20",
  },
  {
    icon: Shield,
    title: "Quality Service",
    description:
      "Every job is done right the first time, backed by our satisfaction guarantee and warranty.",
    color: "text-purple-400",
    bg: "bg-purple-400/10 border-purple-400/20",
  },
  {
    icon: Clock,
    title: "Available 24/7",
    description:
      "Home emergencies don't keep office hours. Our team is on call around the clock, every day.",
    color: "text-[#F7921A]",
    bg: "bg-[#F7921A]/10 border-[#F7921A]/20",
  },
];

export default function WhyChooseUs() {
  return (
    <section className="section-navy py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-4">
            Why DADA HOUSE
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Houston&apos;s Most Trusted Home Service Team
          </h2>
          <p className="text-blue-200/70 max-w-xl mx-auto">
            We&apos;ve built our reputation on reliability, quality work, and
            treating every customer like family.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="service-card bg-[#0D1D5E] border border-[#1A3490] hover:border-[#F7921A]/30 rounded-2xl p-6 flex flex-col items-center text-center group"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div
                className={`w-14 h-14 ${feature.bg} border rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <feature.icon size={24} className={feature.color} />
              </div>
              <h3 className="text-white font-bold text-base mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
