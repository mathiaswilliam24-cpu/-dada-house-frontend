import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { voiceAuthError, toolArgs, digits10, alertOffice, vapiTool } from "@/lib/voice-agent";
import { createDraft, DRAFT_DAYS } from "@/lib/enrollment-draft";
import { calcPropertyAnnual, calcPropertyMonthly } from "@/lib/enrollment-pricing";
import { findPromotion, applyPromo } from "@/lib/promotions";
import { sendOutboundSms, DoNotContactError } from "@/lib/messaging";
import { sendTrackedEmail } from "@/lib/customer-email";

export const dynamic = "force-dynamic";

const schema = z.object({
  firstName: z.string().trim().min(1).max(60), lastName: z.string().trim().min(1).max(60),
  phone: z.string().trim().min(10).max(20), email: z.string().trim().email().max(120),
  address: z.string().trim().min(3).max(150), apt: z.string().trim().max(30).optional(),
  city: z.string().trim().min(1).max(80), state: z.string().trim().length(2), zipCode: z.string().trim().regex(/^\d{5}$/),
  systems: z.coerce.number().int().min(1).max(20), billing: z.enum(["annual", "monthly"]).default("annual"),
  language: z.enum(["en", "fr", "es"]).default("en"),
  promoCode: z.string().trim().max(40).optional().nullable(), systemTypes: z.string().trim().max(200).optional().nullable(),
  billingAddress: z.string().trim().max(150).optional().nullable(), billingCity: z.string().trim().max(80).optional().nullable(),
  billingState: z.string().trim().max(2).optional().nullable(), billingZip: z.string().trim().max(10).optional().nullable(),
  vapiCallId: z.string().max(100).optional().nullable(),
  /** Several homes on one account: each { address, apt?, city, state, zipCode, systems, nickname? } */
  homes: z.array(z.object({
    nickname: z.string().trim().max(40).optional().nullable(), address: z.string().trim().min(3).max(150), apt: z.string().trim().max(30).optional().nullable(),
    city: z.string().trim().min(1).max(80), state: z.string().trim().length(2), zipCode: z.string().trim().regex(/^\d{5}$/), systems: z.coerce.number().int().min(1).max(20),
  })).max(20).optional().nullable(),
});

const MSG = {
  en: { sms: (n: string, t: string, l: string) => `DADA HOUSE: Hi ${n}, here is your secure link to review your HVAC Maintenance Plan registration (${t}), make any changes and pay: ${l} — valid ${DRAFT_DAYS} days. Your plan becomes active once payment is confirmed.`,
        subj: "Complete your DADA HOUSE HVAC Maintenance Plan", hello: (n: string) => `Hi ${n},`, body: (t: string) => `Thank you for choosing the DADA HOUSE HVAC Maintenance Plan (${t}). Use the secure link below to review your information, make any changes, accept the agreement and pay. Your plan becomes active once your payment is confirmed.`, btn: "Review and pay securely" },
  fr: { sms: (n: string, t: string, l: string) => `DADA HOUSE : Bonjour ${n}, voici votre lien sécurisé pour vérifier votre inscription au plan d'entretien HVAC (${t}), la modifier et payer : ${l} — valable ${DRAFT_DAYS} jours. Votre plan sera actif dès que le paiement sera confirmé.`,
        subj: "Finalisez votre plan d'entretien HVAC DADA HOUSE", hello: (n: string) => `Bonjour ${n},`, body: (t: string) => `Merci d'avoir choisi le plan d'entretien HVAC DADA HOUSE (${t}). Utilisez le lien sécurisé ci-dessous pour vérifier vos informations, les modifier, accepter le contrat et payer. Votre plan sera actif dès que le paiement sera confirmé.`, btn: "Vérifier et payer en toute sécurité" },
  es: { sms: (n: string, t: string, l: string) => `DADA HOUSE: Hola ${n}, este es su enlace seguro para revisar su inscripción al Plan de Mantenimiento HVAC (${t}), hacer cambios y pagar: ${l} — válido ${DRAFT_DAYS} días. Su plan se activa cuando se confirme el pago.`,
        subj: "Complete su Plan de Mantenimiento HVAC de DADA HOUSE", hello: (n: string) => `Hola ${n},`, body: (t: string) => `Gracias por elegir el Plan de Mantenimiento HVAC de DADA HOUSE (${t}). Use el enlace seguro para revisar su información, hacer cambios, aceptar el contrato y pagar. Su plan se activa cuando se confirme el pago.`, btn: "Revisar y pagar de forma segura" },
};

/**
 * AI receptionist tool — register a caller for the maintenance plan and send the secure link.
 * POST { firstName, lastName, phone, email, address, apt?, city, state, zipCode, systems, billing, language, promoCode?, systemTypes?, billing*?, vapiCallId }
 * Creates a PENDING registration (pre-filled form, not a paid plan), texts and emails the link,
 * and reports exactly which deliveries succeeded. Activation happens only after Stripe confirms
 * payment. Idempotent per Vapi call.
 */
export const POST = vapiTool(async (req: NextRequest) => {
  const denied = voiceAuthError(req); if (denied) return denied;
  const parsed = schema.safeParse(await toolArgs(req));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "missing_or_invalid", fields: parsed.error.issues.map((i) => i.path.join(".")), message: "Some information is missing or invalid — confirm these fields with the caller and try again." }, { status: 400 });
  const d = parsed.data;

  const existing = await db.customer.findFirst({ where: { phone: { contains: digits10(d.phone) } }, select: { id: true, maintenanceContracts: { where: { status: { in: ["ACTIVE", "PAID", "PAST_DUE"] } }, select: { id: true } } } });
  if (existing?.maintenanceContracts.length) {
    return NextResponse.json({ ok: false, error: "already_member", message: "This phone number already has an active maintenance plan. Use the customer lookup tool; to add systems or another address, offer a transfer to the office." });
  }

  const promo = d.promoCode ? await findPromotion(d.promoCode).catch(() => null) : null;
  // One account, one or more homes — the first home is the service address given above.
  const homes = d.homes?.length ? d.homes.map((h) => ({ ...h, state: h.state.toUpperCase() }))
    : [{ nickname: null, address: d.address, apt: d.apt ?? null, city: d.city, state: d.state.toUpperCase(), zipCode: d.zipCode, systems: d.systems }];
  const per = homes.map((h) => (d.billing === "annual" ? calcPropertyAnnual(h.systems) : calcPropertyMonthly(h.systems)));
  const amount = Math.round(per.reduce((x, y) => x + y, 0) * 100) / 100;
  const sysTotal = homes.reduce((x, h) => x + h.systems, 0);
  const totalText = `${d.billing === "annual" ? `$${amount}/year` : `$${amount.toFixed(2)}/month`}, ${homes.length > 1 ? `${homes.length} homes, ` : ""}${sysTotal} system${sysTotal > 1 ? "s" : ""}`;

  const { token, reused } = await createDraft({
    firstName: d.firstName, lastName: d.lastName, phone: d.phone, email: d.email,
    address: d.address, apt: d.apt, city: d.city, state: d.state.toUpperCase(), zipCode: d.zipCode,
    systems: homes[0].systems, billing: d.billing, language: d.language, homes,
    promoCode: promo ? promo.code : null, systemTypes: d.systemTypes ?? null,
    billingAddress: d.billingAddress ? { address: d.billingAddress, city: d.billingCity ?? "", state: d.billingState ?? "", zip: d.billingZip ?? "" } : null,
    vapiCallId: d.vapiCallId ?? null,
  });
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");
  const link = `${base}/hvac-maintenance-plan/enroll?d=${token}`;
  const m = MSG[d.language];

  let sms: "sent" | "failed" | "opted_out" = "failed", email: "sent" | "failed" = "failed";
  try { await sendOutboundSms(d.phone, m.sms(d.firstName, totalText, link)); sms = "sent"; }
  catch (e) { sms = e instanceof DoNotContactError ? "opted_out" : "failed"; if (!(e instanceof DoNotContactError)) console.error("enroll sms", e); }
  try {
    const r = await sendTrackedEmail({
      to: d.email, subject: m.subj, customerId: existing?.id ?? null,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#111"><h2 style="color:#1B3FA8">DADA HOUSE</h2><p>${m.hello(d.firstName)}</p><p>${m.body(totalText)}</p><p><a href="${link}" style="display:inline-block;background:#F7921A;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${m.btn}</a></p><p style="color:#666;font-size:12px">${link}</p></div>`,
      text: `${m.hello(d.firstName)}\n\n${m.body(totalText)}\n\n${link}`,
    });
    email = r.error ? "failed" : "sent";
  } catch (e) { console.error("enroll email", e); }

  await alertOffice({ title: "Maintenance plan registration (AI receptionist) — payment pending", url: "/admin/maintenance-plans", tag: `enroll-${token.slice(0, 8)}`,
    text: `${d.firstName} ${d.lastName} — ${d.phone}\n${homes.map((h) => `${h.address}${h.apt ? ` ${h.apt}` : ""}, ${h.city} ${h.state} ${h.zipCode} (${h.systems} system${h.systems > 1 ? "s" : ""})`).join("\n")}\n${totalText}${promo ? ` · promo ${promo.code}` : ""}\nLink sent: SMS ${sms}, email ${email}. Payment: PENDING.` }).catch(console.error);

  const delivered = sms === "sent" || email === "sent";
  return NextResponse.json({
    ok: delivered, registration: "PENDING_PAYMENT", reusedForThisCall: reused,
    quote: { amount, text: totalText, perHome: homes.map((h, i) => ({ home: `${h.address}, ${h.city}`, systems: h.systems, amount: per[i] })), promoCode: promo?.code ?? null, promoApplied: !!promo, firstPaymentAfterPromo: promo ? applyPromo(amount, promo) : null, promoRequestedButInvalid: !!d.promoCode && !promo },
    delivery: { sms, email },
    message: delivered
      ? `Secure link sent by ${[sms === "sent" ? "text" : null, email === "sent" ? "email" : null].filter(Boolean).join(" and ")}. Tell the caller the plan becomes active once payment is completed and confirmed.${d.promoCode && !promo ? " The promo code they gave is not valid — do not promise that discount." : ""}`
      : "The link could not be delivered by text or email. Do not say it was sent; confirm the phone/email or offer a callback.",
  });
});
