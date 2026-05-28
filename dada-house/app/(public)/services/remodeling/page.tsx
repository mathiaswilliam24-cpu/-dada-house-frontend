import type { Metadata } from "next";
import ServiceHero from "@/components/services/service-hero";
import ServiceFeatures from "@/components/services/service-features";
import ServiceCta from "@/components/services/service-cta";

export const metadata: Metadata = {
  title: "Home Remodeling Houston — Kitchen, Bathroom & More",
  description:
    "Expert home remodeling in Houston TX. Kitchen remodeling, bathroom renovation, flooring, painting, drywall, roofing. Free estimates available.",
};

const remodelingIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);

const features = [
  {
    title: "Bathroom Remodeling",
    description: "Complete bathroom renovations — tile, fixtures, vanities, showers, and full layout redesigns. Modern finishes and premium materials.",
  },
  {
    title: "Kitchen Remodeling",
    description: "Transform your kitchen with new cabinets, countertops, backsplash, islands, and appliance installations. Custom designs available.",
  },
  {
    title: "Flooring Installation",
    description: "Hardwood, laminate, tile, vinyl, and carpet installation. We handle prep, removal, and installation of all flooring types.",
  },
  {
    title: "Interior Painting",
    description: "Professional interior painting with premium paints. Smooth finishes, clean lines, and careful surface preparation every time.",
  },
  {
    title: "Drywall Repair & Installation",
    description: "New drywall installation, crack repair, water damage restoration, and smooth finishing for any room.",
  },
  {
    title: "Roofing",
    description: "Roof inspection, repair, and full replacement. Shingles, flat roofs, and gutters. Weather-damage emergency service available.",
  },
];

export default function RemodelingPage() {
  return (
    <>
      <ServiceHero
        title="Home Remodeling"
        description="Transform your Houston home with professional remodeling services. Kitchens, bathrooms, flooring, painting — free estimates on all projects."
        icon={remodelingIcon}
        badge="Licensed General Contractors"
      />
      <ServiceFeatures features={features} sectionTitle="Our Remodeling Services" />
      <ServiceCta serviceName="Remodeling" />
    </>
  );
}
