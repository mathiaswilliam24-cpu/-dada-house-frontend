import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

/**
 * Maintenance plan contract helpers shared by the signing page, the printable contract,
 * the signed-contract PDF and the email sent after signature.
 */

type SystemLike = { propertyId: string | null; nickname: string | null; coolingType: string | null; heatingType: string | null; brand: string | null; model: string | null; age: string | null };
type PropertyLike = { id: string; nickname: string | null; address: string; apt: string | null; city: string; state: string; zipCode: string; systemCount: number };

export type ContractFacts = {
  numberOfSystems: number;
  systemTypes: string[];
  systemMakeModel: string | null;
  properties: PropertyLike[];
  hvacSystems: SystemLike[];
};

export const propertyLine = (p: PropertyLike) => `${p.address}${p.apt ? `, ${p.apt}` : ""}, ${p.city}, ${p.state} ${p.zipCode}`;

function systemLabel(s: SystemLike): string {
  const kind = [s.coolingType, s.heatingType].filter(Boolean).join(" + ");
  const make = [s.brand, s.model].filter(Boolean).join(" ");
  return [s.nickname, kind, make, s.age ? `age ${s.age}` : null].filter(Boolean).join(" · ") || "HVAC system";
}

/** "106 Main St, Jacksonville, NC 28540 — 1 system (Central AC + Gas Furnace)" for each covered address. */
export function describeSystems(c: ContractFacts): string {
  if (c.properties.length) {
    return c.properties.map((p) => {
      const systems = c.hvacSystems.filter((s) => s.propertyId === p.id).map(systemLabel);
      return `${propertyLine(p)} — ${p.systemCount} system${p.systemCount === 1 ? "" : "s"}${systems.length ? ` (${systems.join("; ")})` : ""}`;
    }).join(" | ");
  }
  return [c.systemTypes.join(" + "), c.systemMakeModel].filter(Boolean).join(" · ") || "As listed in this agreement";
}

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);

/** Fills the blanks of the plan's contract template ("Number of systems covered: ____", …) with this customer's facts. */
export function fillContractHtml(html: string, c: ContractFacts): string {
  return html
    .replace(/(Number of systems covered:\s*)_{3,}/i, `$1<strong>${c.numberOfSystems}</strong>`)
    .replace(/(Description of Systems\/Areas Served:\s*)_{3,}/i, `$1<strong>${esc(describeSystems(c))}</strong>`);
}

export type PaymentReceipt = {
  amountPaid: number | null;     // dollars
  subtotal: number | null;
  total: number | null;
  invoiceNumber: string | null;
  paidAt: Date | null;
  receiptUrl: string | null;     // Stripe hosted invoice / receipt page
  invoicePdfUrl: string | null;
  periodLabel: string;           // "Annual" | "Monthly"
};

/** The first payment, read from Stripe (never guessed). Falls back to what the contract recorded at activation. */
export async function getPaymentReceipt(c: {
  stripeSubscriptionId: string | null; billingInterval: string | null; paidAt: Date | null;
}): Promise<PaymentReceipt> {
  const base: PaymentReceipt = {
    amountPaid: null, subtotal: null, total: null, invoiceNumber: null, paidAt: c.paidAt, receiptUrl: null, invoicePdfUrl: null,
    periodLabel: c.billingInterval === "monthly" ? "Monthly" : "Annual",
  };
  if (!c.stripeSubscriptionId) return base;
  try {
    const sub = await getStripe().subscriptions.retrieve(c.stripeSubscriptionId, { expand: ["latest_invoice"] });
    const inv = sub.latest_invoice as Stripe.Invoice | null;
    if (!inv || typeof inv === "string") return base;
    const paidTs = inv.status_transitions?.paid_at;
    return {
      ...base,
      amountPaid: inv.amount_paid / 100,
      subtotal: inv.subtotal / 100,
      total: inv.total / 100,
      invoiceNumber: inv.number ?? null,
      paidAt: paidTs ? new Date(paidTs * 1000) : c.paidAt,
      receiptUrl: inv.hosted_invoice_url ?? null,
      invoicePdfUrl: inv.invoice_pdf ?? null,
    };
  } catch (err) {
    console.error("getPaymentReceipt", err);
    return base;
  }
}

export const fmtUsd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
export const fmtDate = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" }) : "—";

/** Statement the customer signs (stored with the signature as evidence). */
export const CONTRACT_SIGNATURE_STATEMENT =
  "I have read and agree to this DADA HOUSE HVAC Maintenance Plan agreement, including the automatic renewal and the recurring credit card payment authorization.";
