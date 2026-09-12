import type { Metadata } from "next";
import ServiceHero from "@/components/services/service-hero";
import ServiceFeatures from "@/components/services/service-features";
import ServiceFaq from "@/components/services/service-faq";
import ServiceAreaLinks from "@/components/services/area-links";
import ServiceCta from "@/components/services/service-cta";
import { SERVICE_CATALOG } from "@/components/services/catalog";

const service = SERVICE_CATALOG.plumbing;

export const metadata: Metadata = {
  title: "Plumbing Services Jacksonville NC — 24/7 Emergency Plumbers",
  description:
    "Expert plumbing repair and installation in Jacksonville, NC. Leak repair, drain cleaning, water heaters, pipe installation. Licensed & insured, available 24/7.",
  alternates: { canonical: "/services/plumbing/jacksonville-nc" },
};

const faqs = [
  {
    question: "Do you offer emergency plumbing in Jacksonville, NC?",
    answer:
      "Yes — our licensed plumbers are available 24/7 for emergency calls in Jacksonville and the surrounding area, including burst pipes and major leaks.",
  },
  {
    question: "Do you serve homes near Camp Lejeune?",
    answer:
      "Yes, we regularly serve military families and homeowners in and around the Camp Lejeune area of Jacksonville, NC.",
  },
  {
    question: "How fast can a plumber get to my Jacksonville home?",
    answer:
      "Response times depend on current demand, but our Jacksonville-area technicians prioritize emergency calls and work to get to you as quickly as possible.",
  },
];

export default function PlumbingJacksonvilleNcPage() {
  return (
    <>
      <ServiceHero
        title="Plumbing Services in Jacksonville, NC"
        description="Licensed plumbers serving Jacksonville, North Carolina — from emergency leak repairs to complete pipe installations, day or night."
        icon={service.icon}
        badge={service.badge}
      />
      <ServiceFeatures features={service.features} sectionTitle="Our Plumbing Services in Jacksonville" />
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-black text-[#1B3FA8] mb-4">Serving Jacksonville, NC</h2>
          <p className="text-slate-500 leading-relaxed">
            Coastal North Carolina&apos;s humid climate and hurricane season put extra strain on plumbing
            systems — from hard-water buildup to storm-related water damage. Our Jacksonville-area
            technicians know the local housing stock and are equipped to handle both everyday repairs
            and emergency calls for homeowners and military families near Camp Lejeune.
          </p>
        </div>
      </section>
      <ServiceFaq faqs={faqs} />
      <ServiceAreaLinks serviceSlug="plumbing" current="jacksonville-nc" />
      <ServiceCta serviceName="Plumbing" />
    </>
  );
}
