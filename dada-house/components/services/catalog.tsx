// Shared service data (icon + feature list) used by the location-specific service pages
// (e.g. app/(public)/services/plumbing/jacksonville-nc/page.tsx). The original Houston pages
// keep their own inline copies — this only exists so the new location pages don't duplicate it.
export interface ServiceCatalogEntry {
  name: string;
  badge: string;
  icon: React.ReactNode;
  features: { title: string; description: string }[];
}

export const SERVICE_CATALOG: Record<
  "plumbing" | "air-conditioning" | "heating" | "remodeling",
  ServiceCatalogEntry
> = {
  plumbing: {
    name: "Plumbing",
    badge: "Licensed & Insured Plumbers",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
        />
      </svg>
    ),
    features: [
      { title: "Leak Repair", description: "Fast detection and repair of water leaks — from tiny drips to burst pipes. We minimize damage and restore your system quickly." },
      { title: "Faucet Repair & Replacement", description: "Fix dripping, low-pressure, or broken faucets in kitchens and bathrooms. We carry all major brands." },
      { title: "Drain Cleaning", description: "Professional drain cleaning using advanced hydro-jetting technology. Clear clogs in sinks, toilets, showers, and main lines." },
      { title: "Pipe Installation & Repair", description: "Full copper, PVC, and PEX pipe installation and repair for residential and light commercial properties." },
      { title: "Water Heater Service", description: "Installation, repair, and maintenance of tank and tankless water heaters. Emergency replacements available." },
      { title: "Toilet Repair & Replacement", description: "Fix running toilets, leaks, clogs, and full toilet replacements. Fast turnaround on all repairs." },
    ],
  },
  "air-conditioning": {
    name: "Air Conditioning",
    badge: "Certified HVAC Technicians",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
        />
      </svg>
    ),
    features: [
      { title: "AC Repair", description: "Fast diagnosis and repair of all AC problems — compressor issues, refrigerant leaks, electrical faults, and more." },
      { title: "AC Installation", description: "Professional installation of central AC systems, ductless mini-splits, and window units for homes and businesses." },
      { title: "Refrigerant Recharge", description: "Safe and certified refrigerant recharge for all AC systems. We handle R-22, R-410A, and newer refrigerants." },
      { title: "Thermostat Installation", description: "Smart thermostat installation and programming. Optimize your comfort and reduce energy bills." },
      { title: "Seasonal Tune-Up", description: "Full AC system inspection, cleaning, and tune-up to prepare your unit for summer. Avoid costly breakdowns." },
      { title: "Emergency AC Repair", description: "AC broken in the heat? We offer 24/7 emergency service with fast dispatch times." },
    ],
  },
  heating: {
    name: "Heating",
    badge: "Licensed HVAC Contractors",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"
        />
      </svg>
    ),
    features: [
      { title: "Furnace Repair", description: "Fast diagnosis and repair of all furnace problems — ignition issues, blower motor failures, heat exchanger cracks, and more." },
      { title: "Heating System Installation", description: "Professional installation of gas furnaces, electric heating systems, and ductless heat pumps for all home sizes." },
      { title: "Heat Pump Services", description: "Installation, repair, and maintenance of heat pump systems. Efficient heating and cooling in one unit." },
      { title: "Duct Cleaning & Sealing", description: "Improve air quality and efficiency with professional duct inspection, cleaning, and leak sealing." },
      { title: "Preventive Maintenance", description: "Annual heating system tune-ups to extend equipment life, improve efficiency, and prevent costly breakdowns." },
      { title: "Emergency Heating Repair", description: "Heating failed on a cold night? Our technicians are on call 24/7 for emergency heating repairs." },
    ],
  },
  remodeling: {
    name: "Remodeling",
    badge: "Licensed General Contractors",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
        />
      </svg>
    ),
    features: [
      { title: "Bathroom Remodeling", description: "Complete bathroom renovations — tile, fixtures, vanities, showers, and full layout redesigns. Modern finishes and premium materials." },
      { title: "Kitchen Remodeling", description: "Transform your kitchen with new cabinets, countertops, backsplash, islands, and appliance installations. Custom designs available." },
      { title: "Flooring Installation", description: "Hardwood, laminate, tile, vinyl, and carpet installation. We handle prep, removal, and installation of all flooring types." },
      { title: "Interior Painting", description: "Professional interior painting with premium paints. Smooth finishes, clean lines, and careful surface preparation every time." },
      { title: "Drywall Repair & Installation", description: "New drywall installation, crack repair, water damage restoration, and smooth finishing for any room." },
      { title: "Roofing", description: "Roof inspection, repair, and full replacement. Shingles, flat roofs, and gutters. Weather-damage emergency service available." },
    ],
  },
};
