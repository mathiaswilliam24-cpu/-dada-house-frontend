import type { Metadata } from "next";
import ServiceHero from "@/components/services/service-hero";
import ServiceFeatures from "@/components/services/service-features";
import ServiceFaq from "@/components/services/service-faq";
import ServiceAreaLinks from "@/components/services/area-links";
import ServiceCta from "@/components/services/service-cta";
import { SERVICE_CATALOG } from "@/components/services/catalog";

const service = SERVICE_CATALOG["air-conditioning"];

export const metadata: Metadata = {
  title: "AC Repair & Installation Jacksonville NC — HVAC Service",
  description:
    "Expert air conditioning repair and installation in Jacksonville, NC. AC service, refrigerant recharge, thermostat installation. Emergency HVAC available 24/7.",
  alternates: { canonical: "/services/air-conditioning/jacksonville-nc" },
};

const faqs = [
  {
    question: "How often should I service my AC in Jacksonville, NC?",
    answer:
      "Coastal North Carolina's long, humid summers put heavy demand on AC systems — we recommend a seasonal tune-up each spring to catch issues before peak heat.",
  },
  {
    question: "Do you install AC systems for new homes in Jacksonville?",
    answer:
      "Yes, we handle full central AC installations, ductless mini-splits, and window units for both new construction and replacements in the Jacksonville, NC area.",
  },
  {
    question: "Do you offer emergency AC repair near Camp Lejeune?",
    answer:
      "Yes — our technicians respond to emergency AC calls throughout Jacksonville, NC, including homes near Camp Lejeune, day or night.",
  },
];

export default function AirConditioningJacksonvilleNcPage() {
  return (
    <>
      <ServiceHero
        title="Air Conditioning Services in Jacksonville, NC"
        description="Expert AC repair, installation, and maintenance for Jacksonville, North Carolina homes — with 24/7 emergency response for the coastal Carolina summers."
        icon={service.icon}
        badge={service.badge}
      />
      <ServiceFeatures features={service.features} sectionTitle="Our AC Services in Jacksonville" />
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-black text-[#1B3FA8] mb-4">Serving Jacksonville, NC</h2>
          <p className="text-slate-500 leading-relaxed">
            Jacksonville&apos;s coastal, humid subtropical climate means AC systems run hard for most of
            the year. Our local technicians are experienced with the salt-air and humidity conditions
            that wear on HVAC equipment near the coast, and we serve homeowners and military families
            throughout the Camp Lejeune area.
          </p>
        </div>
      </section>
      <ServiceFaq faqs={faqs} />
      <ServiceAreaLinks serviceSlug="air-conditioning" current="jacksonville-nc" />
      <ServiceCta serviceName="Air Conditioning" />
    </>
  );
}
