import type { Metadata } from "next";
import ServiceHero from "@/components/services/service-hero";
import ServiceFeatures from "@/components/services/service-features";
import ServiceCta from "@/components/services/service-cta";

export const metadata: Metadata = {
  title: "Heating Services Houston — Furnace Repair & Heat Pump",
  description:
    "Expert heating repair and installation in Houston TX. Furnace repair, heat pump service, duct cleaning. Emergency heating repair available 24/7.",
};

const heatingIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
  </svg>
);

const features = [
  {
    title: "Furnace Repair",
    description: "Fast diagnosis and repair of all furnace problems — ignition issues, blower motor failures, heat exchanger cracks, and more.",
  },
  {
    title: "Heating System Installation",
    description: "Professional installation of gas furnaces, electric heating systems, and ductless heat pumps for all home sizes.",
  },
  {
    title: "Heat Pump Services",
    description: "Installation, repair, and maintenance of heat pump systems. Efficient heating and cooling in one unit.",
  },
  {
    title: "Duct Cleaning & Sealing",
    description: "Improve air quality and efficiency with professional duct inspection, cleaning, and leak sealing.",
  },
  {
    title: "Preventive Maintenance",
    description: "Annual heating system tune-ups to extend equipment life, improve efficiency, and prevent costly breakdowns.",
  },
  {
    title: "Emergency Heating Repair",
    description: "Heating failed on a cold night? Our technicians are on call 24/7 for emergency heating repairs in Houston.",
  },
];

export default function HeatingPage() {
  return (
    <>
      <ServiceHero
        title="Heating Services"
        description="Reliable furnace repair, heat pump installation, and full HVAC maintenance in Houston. We keep your home warm with 24/7 emergency service."
        icon={heatingIcon}
        badge="Licensed HVAC Contractors"
      />
      <ServiceFeatures features={features} sectionTitle="Our Heating Services" />
      <ServiceCta serviceName="Heating" />
    </>
  );
}
