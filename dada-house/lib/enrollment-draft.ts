import crypto from "crypto";
import { db } from "@/lib/db";

/**
 * Pre-filled maintenance-plan registration created by phone (AI receptionist). The customer opens
 * /hvac-maintenance-plan/enroll?d=<token>, reviews/edits everything, accepts the agreement and pays
 * on Stripe Checkout. Nothing is active until Stripe confirms payment (webhook).
 * Stored in the Setting table (key "enroll.draft.<token>") — expires after DRAFT_DAYS.
 */
export const DRAFT_DAYS = 7;

export type EnrollmentDraft = {
  firstName: string; lastName: string; phone: string; email: string;
  address: string; apt?: string; city: string; state: string; zipCode: string;
  systems: number; billing: "annual" | "monthly"; language: "en" | "fr" | "es";
  promoCode?: string | null; systemTypes?: string | null;
  billingAddress?: { address: string; city: string; state: string; zip: string } | null;
  source: "voice_agent"; vapiCallId?: string | null; createdAt: string; expiresAt: string;
};

const key = (token: string) => `enroll.draft.${token}`;

export async function createDraft(d: Omit<EnrollmentDraft, "createdAt" | "expiresAt" | "source">) {
  if (d.vapiCallId) {
    const prev = await db.setting.findUnique({ where: { key: `enroll.vapi.${d.vapiCallId}` } });
    if (prev) {
      await saveDraft(prev.value, { ...d, source: "voice_agent", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + DRAFT_DAYS * 86400000).toISOString() });
      return { token: prev.value, reused: true };
    }
  }
  const token = crypto.randomBytes(18).toString("base64url");
  await saveDraft(token, { ...d, source: "voice_agent", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + DRAFT_DAYS * 86400000).toISOString() });
  if (d.vapiCallId) await db.setting.create({ data: { key: `enroll.vapi.${d.vapiCallId}`, value: token } }).catch(() => {});
  return { token, reused: false };
}

async function saveDraft(token: string, d: EnrollmentDraft) {
  const value = JSON.stringify(d);
  await db.setting.upsert({ where: { key: key(token) }, update: { value }, create: { key: key(token), value } });
}

export async function getDraft(token: string): Promise<EnrollmentDraft | null> {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const row = await db.setting.findUnique({ where: { key: key(token) } });
  if (!row) return null;
  try {
    const d = JSON.parse(row.value) as EnrollmentDraft;
    return new Date(d.expiresAt) > new Date() ? d : null;
  } catch { return null; }
}
