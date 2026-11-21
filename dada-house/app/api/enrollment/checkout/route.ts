import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import {
  calcAnnualTotal,
  calcMonthlyTotal,
  toCents,
  generateMembershipNumber,
} from "@/lib/enrollment-pricing";
// Pricing is per-property: calcAnnualTotal/calcMonthlyTotal accept {systemCount}[]
import { normalizePhone, findOrCreateCustomerByPhone } from "@/lib/customers";

// ── Validation ────────────────────────────────────────────────────────────────

const propertySchema = z.object({
  id: z.string(),
  nickname: z.string().optional().default(""),
  address: z.string().min(3),
  apt: z.string().optional().default(""),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  zipCode: z.string().min(5),
  propertyType: z.string().optional().default("Residential"),
  systemCount: z.number().min(1).max(20),
  accessInstructions: z.string().optional().default(""),
  gateCode: z.string().optional().default(""),
  tenantName: z.string().optional().default(""),
  tenantPhone: z.string().optional().default(""),
  tenantEmail: z.string().optional().default(""),
});

const hvacSystemSchema = z.object({
  id: z.string(),
  propertyId: z.string(),
  nickname: z.string().optional().default(""),
  coolingType: z.string().optional().default(""),
  heatingType: z.string().optional().default(""),
  brand: z.string().optional().default(""),
  model: z.string().optional().default(""),
  serialNumber: z.string().optional().default(""),
  age: z.string().optional().default(""),
  indoorLocation: z.string().optional().default(""),
  outdoorLocation: z.string().optional().default(""),
  condition: z.string().optional().default(""),
  unknownDetails: z.boolean().default(false),
});

const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  billingAddress: z.string().min(3),
  billingCity: z.string().min(1),
  billingState: z.string().min(2).max(2),
  billingZip: z.string().min(5),
  preferredContact: z.string().optional().default("email"),
  preferredLanguage: z.string().optional().default("en"),
  marketingSmsConsent: z.boolean().default(false),
  marketingEmailConsent: z.boolean().default(false),
  privacyAccepted: z.literal(true, { error: "Privacy policy must be accepted" }),
  agreementAccepted: z.literal(true, { error: "Maintenance plan agreement must be accepted" }),
  customerType: z.string().optional().default("Homeowner"),
});

const scheduleSchema = z.object({
  propertyId: z.string(),
  preferredDate: z.string().optional().default(""),
  preferredTime: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  tenantAccess: z.boolean().default(false),
});

const enrollmentSchema = z.object({
  billingInterval: z.enum(["annual", "monthly"]),
  totalSystems: z.number().min(1).max(20),
  properties: z.array(propertySchema).min(1),
  hvacSystems: z.array(hvacSystemSchema).min(1),
  contact: contactSchema,
  schedules: z.array(scheduleSchema),
});

// ── Handler ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = enrollmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid enrollment data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { billingInterval, totalSystems, properties, hvacSystems, contact, schedules } = parsed.data;

    // ── Server-side price calculation (per-property model) ────────────────
    // $199/property base + $159 per additional system at SAME address
    // Multi-address: each property pays its own base (3 props × 1 sys = 3 × $199)
    const isAnnual = billingInterval === "annual";
    const baseAmount = isAnnual ? calcAnnualTotal(properties) : calcMonthlyTotal(properties);

    // ── Get or create Customer record ──────────────────────────────────────
    const normalizedPhone = normalizePhone(contact.phone);
    const customer = await findOrCreateCustomerByPhone(normalizedPhone, {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      city: contact.billingCity,
      state: contact.billingState,
    });

    // ── Find the default maintenance plan type ─────────────────────────────
    const planType = await db.maintenancePlanType.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });

    if (!planType) {
      return NextResponse.json(
        { error: "No active maintenance plan configured. Please contact us at (844) 928-0875." },
        { status: 503 }
      );
    }

    // ── Prevent duplicate active subscriptions ─────────────────────────────
    const existing = await db.maintenanceContract.findFirst({
      where: {
        customerId: customer.id,
        status: { in: ["ACTIVE", "PAID"] },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already have an active maintenance plan. Please call (844) 928-0875 to manage your subscription." },
        { status: 409 }
      );
    }

    // ── Create contract record (PENDING payment) ───────────────────────────
    const membershipNumber = generateMembershipNumber();
    const token = `enroll_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const contract = await db.maintenanceContract.create({
      data: {
        customerId: customer.id,
        planTypeId: planType.id,
        token,
        status: "SENT",
        selfEnrolled: true,
        membershipNumber,
        numberOfSystems: totalSystems,
        billingInterval: isAnnual ? "annual" : "monthly",
        annualTotal: isAnnual ? baseAmount : null,
        monthlyTotal: isAnnual ? null : baseAmount,
        // Monthly plans carry a 12-month commitment; stored for cancellation checks
        commitmentEndDate: !isAnnual ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        billingAddress: {
          address: contact.billingAddress,
          city: contact.billingCity,
          state: contact.billingState,
          zip: contact.billingZip,
        },
        preferredContact: contact.preferredContact,
        preferredLanguage: contact.preferredLanguage,
        marketingSmsConsent: contact.marketingSmsConsent,
        marketingEmailConsent: contact.marketingEmailConsent,
        agreementVersion: "v1.0",
        agreementAcceptedAt: new Date(),
        firstAppointmentNotes: schedules
          .filter(s => s.preferredDate)
          .map(s => {
            const prop = properties.find(p => p.id === s.propertyId);
            return `${prop?.nickname || prop?.address || "Property"}: ${s.preferredDate}${s.preferredTime ? " " + s.preferredTime : ""}${s.notes ? " — " + s.notes : ""}`;
          })
          .join("; ") || null,
        // Property & system relations populated below
      },
    });

    // ── Create ContractProperty + ContractHvacSystem records ──────────────
    // Map client-side temp IDs → DB IDs for the system → property link
    const propIdMap = new Map<string, string>(); // clientId → dbId
    for (const prop of properties) {
      const dbProp = await db.contractProperty.create({
        data: {
          contractId: contract.id,
          nickname: prop.nickname || null,
          address: prop.address,
          apt: prop.apt || null,
          city: prop.city,
          state: prop.state,
          zipCode: prop.zipCode,
          propertyType: prop.propertyType,
          systemCount: prop.systemCount,
          accessInstructions: prop.accessInstructions || null,
          gateCode: prop.gateCode || null,
          tenantName: prop.tenantName || null,
          tenantPhone: prop.tenantPhone || null,
          tenantEmail: prop.tenantEmail || null,
        },
      });
      propIdMap.set(prop.id, dbProp.id);
    }

    for (const sys of hvacSystems) {
      await db.contractHvacSystem.create({
        data: {
          contractId: contract.id,
          propertyId: propIdMap.get(sys.propertyId) ?? null,
          nickname: sys.nickname || null,
          coolingType: sys.coolingType || null,
          heatingType: sys.heatingType || null,
          brand: sys.brand || null,
          model: sys.model || null,
          serialNumber: sys.serialNumber || null,
          age: sys.age || null,
          indoorLocation: sys.indoorLocation || null,
          outdoorLocation: sys.outdoorLocation || null,
          condition: sys.condition || null,
          unknownDetails: sys.unknownDetails,
        },
      });
    }

    // ── Create Stripe Checkout session ────────────────────────────────────
    const stripe = getStripe();
    const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "https://dada-house.com";

    const propCount = properties.length;
    const sysDesc = `${propCount} propert${propCount > 1 ? "ies" : "y"} · ${totalSystems} system${totalSystems !== 1 ? "s" : ""} · 2 tune-ups/yr · Priority scheduling · $69 service calls · 10% off repairs`;
    const monthlyCommitment = !isAnnual ? " · 12-month commitment" : "";

    const lineItems: Stripe.Checkout.SessionCreateParams["line_items"] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "DADA HOUSE HVAC Maintenance Plan",
            description: sysDesc + monthlyCommitment,
          },
          unit_amount: toCents(baseAmount),
          recurring: { interval: isAnnual ? "year" : "month" },
        },
        quantity: 1,
      },
    ];

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: contact.email,
      line_items: lineItems,
      success_url: `${origin}/hvac-maintenance-plan/confirmation?session_id={CHECKOUT_SESSION_ID}&contract=${contract.id}`,
      cancel_url: `${origin}/hvac-maintenance-plan/enroll?cancelled=1`,
      metadata: {
        contractId: contract.id,
        membershipNumber,
        totalSystems: String(totalSystems),
        billingInterval,
        customerId: customer.id,
      },
      subscription_data: {
        metadata: {
          contractId: contract.id,
          membershipNumber,
          customerId: customer.id,
        },
      },
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
    });

    // ── Save checkout session ID on contract ──────────────────────────────
    await db.maintenanceContract.update({
      where: { id: contract.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err: unknown) {
    console.error("Enrollment checkout error:", err);
    return NextResponse.json(
      { error: "An error occurred during enrollment. Please try again or call (844) 928-0875." },
      { status: 500 }
    );
  }
}
