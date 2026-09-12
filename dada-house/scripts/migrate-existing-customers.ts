import * as dotenv from "dotenv";
dotenv.config();

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+")) return raw;
  return `+${digits}`;
}

function splitName(fullName: string | null | undefined): { firstName: string; lastName: string | null } {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return { firstName: "Unknown", lastName: null };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

async function main() {
  console.log("Migrating existing customers into the unified Customer table...\n");

  let customersCreated = 0;
  let customersUpdated = 0;
  let appointmentsLinked = 0;

  // 1. Registered CLIENT users with a phone number
  const users = await db.user.findMany({
    where: { role: "CLIENT", phone: { not: null } },
    select: { id: true, name: true, email: true, phone: true },
  });

  for (const user of users) {
    if (!user.phone) continue;
    const phone = normalizePhone(user.phone);
    const { firstName, lastName } = splitName(user.name);

    const existing = await db.customer.findUnique({ where: { phone } });
    const customer = existing
      ? await db.customer.update({ where: { phone }, data: { userId: user.id } })
      : await db.customer.create({ data: { firstName, lastName, phone, email: user.email, userId: user.id } });

    if (existing) customersUpdated++; else customersCreated++;

    const res = await db.appointment.updateMany({
      where: { userId: user.id, customerId: null },
      data: { customerId: customer.id },
    });
    appointmentsLinked += res.count;
  }

  console.log(`✓ Registered clients processed: ${users.length}`);

  // 2. Guest appointments (no account), deduped by phone
  const guestAppointments = await db.appointment.findMany({
    where: { userId: null, customerId: null, phone: { not: "" } },
    select: { id: true, name: true, phone: true, email: true, address: true, city: true, zipCode: true },
    orderBy: { createdAt: "asc" },
  });

  const resolvedByPhone = new Map<string, string>();

  for (const appt of guestAppointments) {
    if (!appt.phone) continue;
    const phone = normalizePhone(appt.phone);

    let customerId = resolvedByPhone.get(phone);
    if (!customerId) {
      const existing = await db.customer.findUnique({ where: { phone } });
      if (existing) {
        customerId = existing.id;
      } else {
        const { firstName, lastName } = splitName(appt.name);
        const customer = await db.customer.create({
          data: {
            firstName,
            lastName,
            phone,
            email: appt.email || null,
            address: appt.address || null,
            city: appt.city || undefined,
            zipCode: appt.zipCode || null,
          },
        });
        customerId = customer.id;
        customersCreated++;
      }
      resolvedByPhone.set(phone, customerId);
    }

    await db.appointment.update({ where: { id: appt.id }, data: { customerId } });
    appointmentsLinked++;
  }

  console.log(`✓ Guest appointments processed: ${guestAppointments.length}`);
  console.log(`\nDone. Customers created: ${customersCreated}, updated: ${customersUpdated}. Appointments linked: ${appointmentsLinked}.`);
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
