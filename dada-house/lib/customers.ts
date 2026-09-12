import { db } from "@/lib/db";
import type { Customer } from "@/lib/generated/prisma/client";

/**
 * E.164-ish normalization: strips everything but digits, assumes US numbers
 * when 10 digits are given (mirrors the assumption already used in
 * dada-house-voice-agent's sms.service.js normalizePhone helper).
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+")) return raw;
  return `+${digits}`;
}

/**
 * Finds a registered CLIENT account (User) whose phone number — stored raw,
 * unnormalized, at registration/admin-creation time — matches the given
 * normalized phone. User.phone has no index, but CLIENT-role row counts are
 * small enough that a full scan + in-memory normalize is fine, and this only
 * runs on the (rare) new-customer-creation path, not on every lookup.
 */
async function findMatchingClientUser(normalizedPhone: string) {
  const candidates = await db.user.findMany({
    where: { role: "CLIENT", phone: { not: null } },
    select: {
      id: true, phone: true, email: true,
      properties: { take: 1, orderBy: { createdAt: "desc" }, select: { address: true, city: true, state: true, zipCode: true } },
    },
  });
  return candidates.find((u) => u.phone && normalizePhone(u.phone) === normalizedPhone) ?? null;
}

/**
 * Looks up a Customer by phone, creating a bare-bones record on first
 * contact (e.g. the first time a number calls in). `firstName` defaults to
 * the raw number so the record is always presentable in the UI until an
 * agent fills in the real name. On creation, also links a matching
 * registered CLIENT account (by phone) and backfills email/address from it —
 * closes the gap where a customer added via /admin/customers has no
 * call-center record, or vice versa, and contact info silently goes missing.
 */
export async function findOrCreateCustomerByPhone(
  rawPhone: string,
  defaults?: Partial<Pick<Customer, "firstName" | "lastName" | "email">>
): Promise<Customer> {
  const phone = normalizePhone(rawPhone);

  const existing = await db.customer.findUnique({ where: { phone } });
  if (existing) {
    // Link + backfill even for a customer that already existed (e.g. created by
    // an earlier call, before this person was ever added as a User) — link
    // detection must work regardless of which record was created first.
    if (!existing.userId) {
      const matchingUser = await findMatchingClientUser(phone).catch(() => null);
      if (matchingUser) {
        return db.customer.update({
          where: { id: existing.id },
          data: {
            userId: matchingUser.id,
            email: existing.email || matchingUser.email,
            address: existing.address || matchingUser.properties[0]?.address,
            city: existing.city || matchingUser.properties[0]?.city,
            zipCode: existing.zipCode || matchingUser.properties[0]?.zipCode,
          },
        });
      }
    }
    return existing;
  }

  const matchingUser = await findMatchingClientUser(phone).catch(() => null);
  const property = matchingUser?.properties[0];

  return db.customer.create({
    data: {
      phone,
      firstName: defaults?.firstName || phone,
      lastName: defaults?.lastName,
      email: defaults?.email || matchingUser?.email,
      userId: matchingUser?.id,
      address: property?.address,
      city: property?.city,
      state: property?.state,
      zipCode: property?.zipCode,
    },
  });
}

export async function searchCustomers(query: string, limit = 50) {
  const q = query.trim();
  if (!q) {
    return db.customer.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  }

  const digits = q.replace(/\D/g, "");

  return db.customer.findMany({
    where: {
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        ...(digits ? [{ phone: { contains: digits } }, { secondaryPhone: { contains: digits } }] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
}
