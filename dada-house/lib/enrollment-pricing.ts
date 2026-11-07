// Server-side pricing engine — never trust browser-submitted prices
// Pricing is PER PROPERTY: each address pays its own base + additional systems at same address.
// Multi-address landlords pay the base for EACH property (not shared).
// e.g. 3 properties × 1 system = 3 × $199 = $597/yr

export const PRICING = {
  annual: {
    base: 199,          // first system at an address
    additional: 159,    // each additional system at SAME address
  },
  monthly: {
    base: 21,           // first system at an address (12-month commitment)
    additional: 16.78,  // each additional system at same address
  },
} as const;

// Cost for one property with N systems (annual)
export function calcPropertyAnnual(systemCount: number): number {
  if (systemCount < 1) return PRICING.annual.base;
  return PRICING.annual.base + Math.max(0, systemCount - 1) * PRICING.annual.additional;
}

// Cost for one property with N systems (monthly)
export function calcPropertyMonthly(systemCount: number, additionalRate = PRICING.monthly.additional): number {
  if (systemCount < 1) return PRICING.monthly.base;
  return PRICING.monthly.base + Math.max(0, systemCount - 1) * additionalRate;
}

// Total across ALL properties (each billed independently)
export function calcAnnualTotal(properties: { systemCount: number }[]): number {
  if (!properties.length) return PRICING.annual.base;
  return properties.reduce((sum, p) => sum + calcPropertyAnnual(p.systemCount), 0);
}

export function calcMonthlyTotal(properties: { systemCount: number }[], additionalRate = PRICING.monthly.additional): number {
  if (!properties.length) return PRICING.monthly.base;
  return properties.reduce((sum, p) => sum + calcPropertyMonthly(p.systemCount, additionalRate), 0);
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function generateMembershipNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `DH-${year}-${random}`;
}
