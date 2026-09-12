import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Phone, CheckCircle, MapPin } from "lucide-react";
import ServiceFaq from "@/components/services/service-faq";

export const metadata: Metadata = {
  title: "Jacksonville, NC Home Services",
  description:
    "Professional home services in Jacksonville, NC and the Camp Lejeune area. Plumbing, AC, heating, remodeling. Licensed & insured, available 24/7.",
  keywords: [
    "home services Jacksonville NC",
    "plumbing Jacksonville NC",
    "AC repair Jacksonville NC",
    "HVAC Jacksonville NC",
    "remodeling Jacksonville NC",
    "plumber Jacksonville NC",
    "emergency plumber Jacksonville NC",
    "Camp Lejeune home services",
    "DADA HOUSE Jacksonville",
  ],
  alternates: { canonical: "/locations/north-carolina" },
  openGraph: {
    title: "DADA HOUSE Jacksonville, NC — Expert Home Services",
    description: "Plumbing, AC, heating & remodeling in Jacksonville, NC. Available 24/7.",
    url: "https://dada-house.com/locations/north-carolina",
  },
};

const SERVICES = [
  { name: "Plumbing", desc: "Leaks, pipes, water heaters, drain cleaning", href: "/services/plumbing/jacksonville-nc" },
  { name: "Air Conditioning", desc: "AC repair, installation & maintenance", href: "/services/air-conditioning/jacksonville-nc" },
  { name: "Heating", desc: "Furnace, heat pump & HVAC systems", href: "/services/heating/jacksonville-nc" },
  { name: "Remodeling", desc: "Kitchen, bathroom & home renovation", href: "/services/remodeling/jacksonville-nc" },
];

const faqs = [
  {
    question: "Does DADA HOUSE serve Jacksonville, NC?",
    answer:
      "Yes — DADA HOUSE provides plumbing, air conditioning, heating, and remodeling services throughout Jacksonville, NC, including the Camp Lejeune area.",
  },
  {
    question: "Do you offer 24/7 emergency service in Jacksonville?",
    answer:
      "Yes, our technicians are available around the clock for emergency plumbing, AC, and heating calls in Jacksonville, NC.",
  },
  {
    question: "Do you work with military families near Camp Lejeune?",
    answer:
      "Yes, we regularly serve homeowners and military families in and around Camp Lejeune.",
  },
];

export default function NorthCarolinaPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "DADA HOUSE",
    url: "https://dada-house.com/locations/north-carolina",
    telephone: "+18449280875",
    email: "customerservice@dada-house.com",
    areaServed: { "@type": "City", name: "Jacksonville, NC" },
    description: "Professional plumbing, AC, heating and remodeling services in Jacksonville, NC.",
    serviceType: ["Plumbing", "Air Conditioning Repair", "Heating Repair", "Home Remodeling"],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    priceRange: "$$",
    sameAs: ["https://dada-house.com"],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0A1628] to-[#1B3FA8] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <MapPin className="w-4 h-4 text-[#F7921A]" />
            Now serving Jacksonville, NC
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
            Expert Home Services<br />
            <span className="text-[#F7921A]">in Jacksonville, NC</span>
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            DADA HOUSE brings professional plumbing, air conditioning, heating, and remodeling
            services to Jacksonville, NC and the Camp Lejeune area. Available 24/7 for emergencies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/booking" className={buttonVariants({ variant: "default" }) + " bg-[#F7921A] hover:bg-[#F7921A]/90 text-white px-8 py-3 text-base font-bold"}>
              Book a Service
            </Link>
            <a href="tel:+18449280875" className="flex items-center justify-center gap-2 px-8 py-3 border-2 border-white/30 text-white rounded-lg font-bold hover:bg-white/10 transition-colors">
              <Phone className="w-4 h-4" />
              (844) 928-0875
            </a>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Our Services in Jacksonville, NC</h2>
          <p className="text-gray-500 text-center mb-10">Professional service, licensed technicians, satisfaction guaranteed</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((s) => (
              <Link
                key={s.name}
                href={s.href}
                className="block border border-gray-200 rounded-2xl p-6 hover:border-[#F7921A] hover:shadow-md transition-all"
              >
                <h3 className="font-bold text-gray-900 text-lg mb-2">{s.name}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why DADA HOUSE */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-10">Why Jacksonville Homeowners Choose DADA HOUSE</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { title: "Available 24/7", desc: "Emergency service day and night, weekends and holidays included" },
              { title: "Licensed & Insured", desc: "All technicians are background-checked, licensed and fully insured" },
              { title: "Upfront Pricing", desc: "No hidden fees. You know the price before we start the work" },
            ].map((item) => (
              <div key={item.title}>
                <div className="w-12 h-12 bg-[#1B3FA8]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-6 h-6 text-[#1B3FA8]" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ServiceFaq faqs={faqs} />

      {/* CTA */}
      <section className="py-16 px-4 bg-[#1B3FA8]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to book your service in Jacksonville, NC?</h2>
          <p className="text-white/75 mb-8">Same-day service available. Call us or book online in 2 minutes.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/booking" className="px-8 py-3.5 bg-[#F7921A] text-white font-bold rounded-xl hover:bg-[#F7921A]/90 transition-colors text-base">
              Book Online — Free Estimate
            </Link>
            <a href="tel:+18449280875" className="px-8 py-3.5 border-2 border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-base">
              <Phone className="w-4 h-4" />
              Call (844) 928-0875
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
