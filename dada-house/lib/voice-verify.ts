import { db } from "@/lib/db";
import { digits10, norm } from "@/lib/voice-agent";

/**
 * Caller verification shared by the AI receptionist tools. A record is VERIFIED when
 *  - the caller's phone is the phone on file AND the name or street address matches, or
 *  - from another number: the name AND the street address (and ZIP if given) match.
 */
export async function verifyCaller(a: { callerPhone?: unknown; name?: unknown; address?: unknown; zip?: unknown }) {
  const callerPhone = digits10(String(a.callerPhone ?? ""));
  const name = norm(String(a.name ?? ""));
  const address = norm(String(a.address ?? ""));
  const zip = String(a.zip ?? "").replace(/\D/g, "").slice(0, 5);
  const nameParts = name.split(" ").filter((w) => w.length > 1);
  if (!callerPhone && !nameParts.length) return { customer: null, found: false, message: "Give callerPhone and the customer's name." };

  const candidates = await db.customer.findMany({
    where: {
      OR: [
        ...(callerPhone ? [{ phone: { contains: callerPhone } }] : []),
        ...(nameParts.length ? [{ lastName: { contains: nameParts[nameParts.length - 1], mode: "insensitive" as const } }] : []),
      ],
    },
    take: 10,
    select: { id: true, firstName: true, lastName: true, phone: true, email: true, address: true, city: true, zipCode: true, preferredLanguage: true },
  });

  const streetMatch = (addr: string | null | undefined) => {
    if (!address || !addr) return false;
    const want = address.split(" "), have = norm(addr);
    const num = want.find((w) => /^\d+$/.test(w));
    return !!num && have.startsWith(num) && want.filter((w) => !/^\d+$/.test(w) && w.length > 2).some((w) => have.includes(w));
  };
  const nameMatch = (c: { firstName: string | null; lastName: string | null }) => {
    const full = norm(`${c.firstName ?? ""} ${c.lastName ?? ""}`);
    return nameParts.length > 0 && nameParts.every((w) => full.includes(w));
  };

  const verified = [];
  for (const c of candidates) {
    const props = await db.contractProperty.findMany({ where: { contract: { customerId: c.id } }, select: { address: true, zipCode: true } }).catch(() => []);
    const jobs = await db.appointment.findMany({ where: { customerId: c.id }, select: { address: true }, take: 20, orderBy: { createdAt: "desc" } }).catch(() => []);
    const addrOk = streetMatch(c.address) || props.some((p) => streetMatch(p.address)) || jobs.some((j) => streetMatch(j.address));
    const zipOk = !zip || c.zipCode?.startsWith(zip) || props.some((p) => p.zipCode?.startsWith(zip));
    const phoneOk = !!callerPhone && digits10(c.phone) === callerPhone;
    if ((phoneOk && (nameMatch(c) || addrOk)) || (!phoneOk && nameMatch(c) && addrOk && zipOk)) verified.push(c);
  }

  if (verified.length === 1) return { customer: verified[0], found: true, message: null as string | null };
  return {
    customer: null, found: candidates.length > 0,
    message: candidates.length === 0
      ? "No customer record found for this caller. Treat them as a new customer."
      : verified.length > 1
        ? "Several records match. Ask for the full service address (street number and street) and the ZIP code, then call the tool again."
        : "Could not verify the caller. Ask for the full name on the account and the service address (street number and street), then call the tool again. Share no account details before verification.",
  };
}
