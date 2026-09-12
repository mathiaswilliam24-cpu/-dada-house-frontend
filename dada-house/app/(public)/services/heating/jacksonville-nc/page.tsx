import type { Metadata } from "next";
import ServiceHero from "@/components/services/service-hero";
import ServiceFeatures from "@/components/services/service-features";
import ServiceFaq from "@/components/services/service-faq";
import ServiceAreaLinks from "@/components/services/area-links";
import ServiceCta from "@/components/services/service-cta";
import { SERVICE_CATALOG } from "@/components/services/catalog";

const service = SERVICE_CATALOG.heating;

export const metadata: Metadata = {
  title: "Heating Services Jacksonville NC — Furnace Repair",
  description:
    "Expert heating repair and installation in Jacksonville, NC. Furnace repair, heat pump service, duct cleaning. Emergency heating repair available 24/7.",
  alternates: { canonical: "/services/heating/jacksonville-nc" },
};

const faqs = [
  {
    question: "Do Jacksonville, NC homes need heating service in winter?",
    answer:
      "Yes — while winters are mild, Jacksonville still sees cold snaps that put real demand on furnaces and heat pumps. We recommend a fall tune-up before the season starts.",
  },
  {
    question: "Do you repair heat pumps in Jacksonville, NC?",
    answer:
      "Yes, heat pumps are common in coastal North Carolina and our technicians service and repair them alongside traditional gas and electric furnaces.",
  },
  {
    question: "Is emergency heating repair available near Camp Lejeune?",
    answer:
      "Yes — our team responds to emergency heating calls throughout the Jacksonville, NC area, including homes near Camp Lejeune.",
  },
];

export default function HeatingJacksonvilleNcPage() {
  return (
    <>
      <ServiceHero
        title="Heating Services in Jacksonville, NC"
        description="Reliable furnace repair, heat pump installation, and full HVAC maintenance for Jacksonville, North Carolina homes — with 24/7 emergency service."
        icon={service.icon}
        badge={service.badge}
      />
      <ServiceFeatures features={service.features} sectionTitle="Our Heating Services in Jacksonville" />
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-black text-[#1B3FA8] mb-4">Serving Jacksonville, NC</h2>
          <p className="text-slate-500 leading-relaxed">
            Jacksonville&apos;s coastal North Carolina winters are mild but still bring cold snaps that
            catch homeowners off guard. Our local technicians service furnaces and heat pumps for
            homes and military families throughout the Jacksonville and Camp Lejeune area.
          </p>
        </div>
      </section>
      <ServiceFaq faqs={faqs} />
      <ServiceAreaLinks serviceSlug="heating" current="jacksonville-nc" />
      <ServiceCta serviceName="Heating" />
    </>
  );
}
