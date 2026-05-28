import type { Metadata } from "next";
import ServiceHero from "@/components/services/service-hero";
import ServiceFeatures from "@/components/services/service-features";
import ServiceCta from "@/components/services/service-cta";

export const metadata: Metadata = {
  title: "AC Repair & Installation Houston — 24/7 HVAC Service",
  description:
    "Expert air conditioning repair and installation in Houston TX. AC service, refrigerant recharge, thermostat installation. Emergency HVAC available 24/7.",
};

const acIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const features = [
  {
    title: "AC Repair",
    description: "Fast diagnosis and repair of all AC problems — compressor issues, refrigerant leaks, electrical faults, and more.",
  },
  {
    title: "AC Installation",
    description: "Professional installation of central AC systems, ductless mini-splits, and window units for homes and businesses.",
  },
  {
    title: "Refrigerant Recharge",
    description: "Safe and certified refrigerant recharge for all AC systems. We handle R-22, R-410A, and newer refrigerants.",
  },
  {
    title: "Thermostat Installation",
    description: "Smart thermostat installation and programming. Optimize your comfort and reduce energy bills.",
  },
  {
    title: "Seasonal Tune-Up",
    description: "Full AC system inspection, cleaning, and tune-up to prepare your unit for summer. Avoid costly breakdowns.",
  },
  {
    title: "Emergency AC Repair",
    description: "AC broken in the Houston heat? We offer 24/7 emergency service with fast dispatch times.",
  },
];

export default function AirConditioningPage() {
  return (
    <>
      <ServiceHero
        title="Air Conditioning Services"
        description="Expert AC repair, installation, and maintenance in Houston. We keep your home cool and comfortable year-round — with 24/7 emergency response."
        icon={acIcon}
        badge="Certified HVAC Technicians"
      />
      <ServiceFeatures features={features} sectionTitle="Our AC Services" />
      <ServiceCta serviceName="Air Conditioning" />
    </>
  );
}
