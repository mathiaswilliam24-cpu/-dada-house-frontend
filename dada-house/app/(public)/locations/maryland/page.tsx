import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Phone, CheckCircle, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "DADA HOUSE Maryland — Home Services MD | Plumbing, AC, Heating, Remodeling",
  description:
    "Professional home services across Maryland. DADA HOUSE serves Baltimore, Rockville, Silver Spring, Gaithersburg, Bethesda, Annapolis and all MD cities. Plumbing, AC, heating, remodeling. Available 24/7.",
  keywords: [
    "home services Maryland",
    "plumbing Maryland",
    "AC repair Maryland",
    "HVAC Maryland",
    "remodeling Maryland",
    "plumber Baltimore MD",
    "AC repair Rockville MD",
    "HVAC Silver Spring MD",
    "home repair Gaithersburg MD",
    "plumbing Bethesda MD",
    "home services MD",
    "emergency plumber MD",
    "DADA HOUSE Maryland",
    "DADA HOUSE MD",
    "home services Annapolis MD",
    "plumber Frederick MD",
    "HVAC Columbia MD",
    "home repair Bowie MD",
    "plumber Germantown MD",
  ],
  openGraph: {
    title: "DADA HOUSE Maryland — Expert Home Services",
    description: "Plumbing, AC, heating & remodeling across all of Maryland. Available 24/7.",
    url: "https://dada-house.com/locations/maryland",
  },
};

const MD_CITIES = [
  "Baltimore", "Rockville", "Silver Spring", "Gaithersburg", "Bethesda",
  "Annapolis", "Frederick", "Columbia", "Bowie", "Hagerstown",
  "Germantown", "Ellicott City", "Towson", "Laurel", "Dundalk",
  "Waldorf", "College Park", "Greenbelt", "Hyattsville", "Salisbury",
];

const SERVICES = [
  { name: "Plumbing", desc: "Leaks, pipes, water heaters, drain cleaning" },
  { name: "Air Conditioning", desc: "AC repair, installation & maintenance" },
  { name: "Heating", desc: "Furnace, heat pump & HVAC systems" },
  { name: "Remodeling", desc: "Kitchen, bathroom & home renovation" },
];

export default function MarylandPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "name": "DADA HOUSE",
    "url": "https://dada-house.com",
    "telephone": "+18326696747",
    "email": "service@dada-house.com",
    "areaServed": {
      "@type": "State",
      "name": "Maryland",
      "containedInPlace": { "@type": "Country", "name": "United States" },
    },
    "description": "Professional plumbing, AC, heating and remodeling services across Maryland.",
    "serviceType": ["Plumbing", "Air Conditioning Repair", "Heating Repair", "Home Remodeling"],
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
      "opens": "00:00",
      "closes": "23:59",
    },
    "priceRange": "$$",
    "sameAs": ["https://dada-house.com"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0A1628] to-[#1B3FA8] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <MapPin className="w-4 h-4 text-[#F7921A]" />
            Now serving all of Maryland
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
            Expert Home Services<br />
            <span className="text-[#F7921A]">Across Maryland</span>
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            DADA HOUSE brings professional plumbing, air conditioning, heating, and remodeling
            services to every city in Maryland. Available 24/7 for emergencies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/booking" className={buttonVariants({ variant: "default" }) + " bg-[#F7921A] hover:bg-[#F7921A]/90 text-white px-8 py-3 text-base font-bold"}>
              Book a Service
            </Link>
            <a href="tel:+18326696747" className="flex items-center justify-center gap-2 px-8 py-3 border-2 border-white/30 text-white rounded-lg font-bold hover:bg-white/10 transition-colors">
              <Phone className="w-4 h-4" />
              (832) 669-6747
            </a>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Our Services in MD</h2>
          <p className="text-gray-500 text-center mb-10">Professional service, licensed technicians, satisfaction guaranteed</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map(s => (
              <div key={s.name} className="border border-gray-200 rounded-2xl p-6 hover:border-[#F7921A] hover:shadow-md transition-all">
                <h3 className="font-bold text-gray-900 text-lg mb-2">{s.name}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cities */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Cities We Serve in Maryland</h2>
          <p className="text-gray-500 text-center mb-10">
            From Baltimore to the DC suburbs — we come to you anywhere in MD
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {MD_CITIES.map(city => (
              <div key={city} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                <span className="text-sm font-medium text-gray-800">{city}, MD</span>
              </div>
            ))}
            <div className="flex items-center gap-2 bg-[#F7921A]/10 border border-[#F7921A]/30 rounded-xl px-4 py-3">
              <MapPin className="w-4 h-4 text-[#F7921A] shrink-0" />
              <span className="text-sm font-medium text-[#F7921A]">+ all MD cities</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why DADA HOUSE */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-10">Why Maryland Homeowners Choose DADA HOUSE</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { title: "Available 24/7", desc: "Emergency service day and night, weekends and holidays included" },
              { title: "Licensed & Insured", desc: "All technicians are background-checked, licensed and fully insured" },
              { title: "Upfront Pricing", desc: "No hidden fees. You know the price before we start the work" },
            ].map(item => (
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

      {/* CTA */}
      <section className="py-16 px-4 bg-[#1B3FA8]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to book your service in MD?</h2>
          <p className="text-white/75 mb-8">Same-day service available. Call us or book online in 2 minutes.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/booking" className="px-8 py-3.5 bg-[#F7921A] text-white font-bold rounded-xl hover:bg-[#F7921A]/90 transition-colors text-base">
              Book Online — Free Estimate
            </Link>
            <a href="tel:+18326696747" className="px-8 py-3.5 border-2 border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-base">
              <Phone className="w-4 h-4" />
              Call (832) 669-6747
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
