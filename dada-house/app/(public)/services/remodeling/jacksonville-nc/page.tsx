import type { Metadata } from "next";
import ServiceHero from "@/components/services/service-hero";
import ServiceFeatures from "@/components/services/service-features";
import ServiceFaq from "@/components/services/service-faq";
import ServiceAreaLinks from "@/components/services/area-links";
import ServiceCta from "@/components/services/service-cta";
import { SERVICE_CATALOG } from "@/components/services/catalog";

const service = SERVICE_CATALOG.remodeling;

export const metadata: Metadata = {
  title: "Home Remodeling Jacksonville NC — Kitchen & Bathroom",
  description:
    "Expert home remodeling in Jacksonville, NC. Kitchen remodeling, bathroom renovation, flooring, painting, drywall, roofing. Free estimates available.",
  alternates: { canonical: "/services/remodeling/jacksonville-nc" },
};

const faqs = [
  {
    question: "Do you handle storm damage repairs in Jacksonville, NC?",
    answer:
      "Yes — coastal North Carolina sees hurricane and storm activity, and we handle drywall, flooring, and roofing repairs related to weather damage.",
  },
  {
    question: "Do you remodel homes near Camp Lejeune?",
    answer:
      "Yes, we work with homeowners and military families throughout Jacksonville, NC, including the Camp Lejeune area, on kitchen and bathroom remodels.",
  },
  {
    question: "Do you offer free estimates for remodeling projects?",
    answer:
      "Yes, free estimates are available for remodeling projects in Jacksonville, NC — book online or call to schedule a visit.",
  },
];

export default function RemodelingJacksonvilleNcPage() {
  return (
    <>
      <ServiceHero
        title="Home Remodeling in Jacksonville, NC"
        description="Professional remodeling for Jacksonville, North Carolina homes — kitchens, bathrooms, flooring, and storm-damage repairs. Free estimates on all projects."
        icon={service.icon}
        badge={service.badge}
      />
      <ServiceFeatures features={service.features} sectionTitle="Our Remodeling Services in Jacksonville" />
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-black text-[#1B3FA8] mb-4">Serving Jacksonville, NC</h2>
          <p className="text-slate-500 leading-relaxed">
            From hurricane-season storm repairs to full kitchen and bathroom renovations, our
            Jacksonville-area contractors understand the coastal North Carolina housing stock and
            serve homeowners and military families throughout the Camp Lejeune area.
          </p>
        </div>
      </section>
      <ServiceFaq faqs={faqs} />
      <ServiceAreaLinks serviceSlug="remodeling" current="jacksonville-nc" />
      <ServiceCta serviceName="Remodeling" />
    </>
  );
}
