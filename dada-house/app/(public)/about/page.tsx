import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, Phone, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "About DADA HOUSE — Premier Home Services Houston",
  description:
    "Learn about DADA HOUSE — Houston's premier home services company. Licensed, insured, and available 24/7 for plumbing, AC, heating, and remodeling.",
};

const values = [
  {
    title: "Always Available",
    description: "We operate 24 hours a day, 7 days a week. Home emergencies don't wait for business hours, and neither do we.",
  },
  {
    title: "Licensed & Insured",
    description: "Every technician is fully licensed and insured. You can trust us to handle your home with care and professionalism.",
  },
  {
    title: "Transparent Pricing",
    description: "We provide upfront quotes with no hidden fees. You'll know exactly what you're paying before any work begins.",
  },
  {
    title: "Quality Workmanship",
    description: "We stand behind every job with our satisfaction guarantee. If it's not right, we make it right.",
  },
  {
    title: "Fast Response",
    description: "We dispatch technicians quickly — often within the hour. Your time and comfort are our top priority.",
  },
  {
    title: "Community Focused",
    description: "As a Houston-based company, we're invested in our community. We treat every customer like a neighbor.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero-gradient py-20 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-5">
              About Us
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-5">
              Houston&apos;s Trusted Home Service Partner
            </h1>
            <p className="text-blue-200 text-xl leading-relaxed mb-8">
              DADA HOUSE was founded with a simple mission: to provide
              Houston homeowners with fast, reliable, and affordable home
              services they can trust — any time, any day.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/booking"
                className="flex items-center gap-2 px-6 py-3 bg-[#F7921A] hover:bg-[#E07F10] text-white font-bold rounded-xl transition-all"
              >
                <Calendar size={16} />
                Book Service
              </Link>
              <a
                href="tel:+19106858042"
                className="flex items-center gap-2 px-6 py-3 border border-[#1A3490] hover:border-[#F7921A] text-blue-200 hover:text-white rounded-xl transition-colors font-semibold"
              >
                <Phone size={16} />
                Call Us
              </a>
            </div>
          </div>
        </div>
        <div className="wave-divider">
          <svg viewBox="0 0 1440 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,25 C360,50 1080,0 1440,25 L1440,50 L0,50 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-4">
                Our Mission
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#1B3FA8] mb-5">
                Your Home Is Our Priority
              </h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-6">
                We understand that home problems don&apos;t happen at convenient
                times. A burst pipe at midnight, an AC failing on a Houston
                summer day — these are real emergencies that need real solutions.
              </p>
              <p className="text-slate-500 text-lg leading-relaxed mb-8">
                That&apos;s why DADA HOUSE operates around the clock, 365 days a
                year. Our certified technicians are always ready to respond —
                bringing professional-grade solutions directly to your door.
              </p>
              <div className="space-y-3">
                {["24/7 Emergency Service", "Licensed & Insured Technicians", "Satisfaction Guaranteed", "Free Estimates Available"].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle size={18} className="text-[#F7921A]" />
                    <span className="text-[#1B3FA8] font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1B3FA8] border border-[#1A3490] rounded-3xl p-10">
              <div className="grid grid-cols-2 gap-8">
                {[
                  { value: "500+", label: "Projects Completed" },
                  { value: "15+", label: "Years Experience" },
                  { value: "24/7", label: "Always Available" },
                  { value: "100%", label: "Satisfaction Rate" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <div className="text-4xl font-black text-[#F7921A] mb-2">
                      {stat.value}
                    </div>
                    <div className="text-slate-400 text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 section-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              Our Core Values
            </h2>
            <p className="text-blue-200/70 max-w-xl mx-auto">
              These principles guide everything we do at DADA HOUSE.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-[#0D1D5E] border border-[#1A3490] hover:border-[#F7921A]/30 rounded-2xl p-6 service-card"
              >
                <h3 className="text-white font-bold text-lg mb-3">
                  {value.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
