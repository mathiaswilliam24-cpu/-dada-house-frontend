import type { Metadata } from "next";
import ServiceHero from "@/components/services/service-hero";
import ServiceFeatures from "@/components/services/service-features";
import ServiceCta from "@/components/services/service-cta";

export const metadata: Metadata = {
  title: "Plumbing Services Houston — 24/7 Emergency Plumbers",
  description:
    "Expert plumbing repair and installation in Houston TX. Leak repair, drain cleaning, water heaters, pipe installation. Licensed & insured. Available 24/7.",
};

const plumbingIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
  </svg>
);

const features = [
  {
    title: "Leak Repair",
    description: "Fast detection and repair of water leaks — from tiny drips to burst pipes. We minimize damage and restore your system quickly.",
  },
  {
    title: "Faucet Repair & Replacement",
    description: "Fix dripping, low-pressure, or broken faucets in kitchens and bathrooms. We carry all major brands.",
  },
  {
    title: "Drain Cleaning",
    description: "Professional drain cleaning using advanced hydro-jetting technology. Clear clogs in sinks, toilets, showers, and main lines.",
  },
  {
    title: "Pipe Installation & Repair",
    description: "Full copper, PVC, and PEX pipe installation and repair for residential and light commercial properties.",
  },
  {
    title: "Water Heater Service",
    description: "Installation, repair, and maintenance of tank and tankless water heaters. Emergency replacements available.",
  },
  {
    title: "Toilet Repair & Replacement",
    description: "Fix running toilets, leaks, clogs, and full toilet replacements. Fast turnaround on all repairs.",
  },
];

export default function PlumbingPage() {
  return (
    <>
      <ServiceHero
        title="Plumbing Services"
        description="From emergency leak repairs to complete pipe installations, our licensed Houston plumbers deliver fast, reliable solutions around the clock."
        icon={plumbingIcon}
        badge="Licensed & Insured Plumbers"
      />
      <ServiceFeatures features={features} sectionTitle="Our Plumbing Services" />
      <ServiceCta serviceName="Plumbing" />
    </>
  );
}
