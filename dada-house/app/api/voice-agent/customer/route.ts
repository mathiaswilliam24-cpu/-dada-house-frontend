import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { voiceAuthError, toolArgs, digits10, norm } from "@/lib/voice-agent";
import { syncMaintenanceVisits, visitState, SEASONS, COVERED_STATUSES, type Season } from "@/lib/maintenance-visits";

export const dynamic = "force-dynamic";

/**
 * AI receptionist tool — find the caller's customer record and maintenance membership.
 * POST { callerPhone, name, address?, zip? }
 * Identity rule: details are returned only when the record is VERIFIED:
 *   - the caller's phone is the phone on file AND the name or street address matches, or
 *   - calling from another number: the name AND the street address both match.
 * Otherwise the response only says what to ask for — no personal or plan data.
 */
export async function POST(req: NextRequest) {
  const denied = voiceAuthError(req); if (denied) return denied;
  const a = await toolArgs(req);
  const callerPhone = digits10(String(a.callerPhone ?? a.phone ?? ""));
  const name = norm(String(a.name ?? ""));
  const address = norm(String(a.address ?? ""));
  const zip = String(a.zip ?? "").replace(/\D/g, "").slice(0, 5);
  if (!callerPhone && !name) return NextResponse.json({ error: "Give callerPhone and the customer's name." }, { status: 400 });

  const nameParts = name.split(" ").filter((w) => w.length > 1);
  const candidates = await db.customer.findMany({
    where: {
      OR: [
        ...(callerPhone ? [{ phone: { contains: callerPhone } }] : []),
        ...(nameParts.length ? [{ AND: nameParts.slice(-1).map((w) => ({ lastName: { contains: w, mode: "insensitive" as const } })) }] : []),
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

  const scored = await Promise.all(candidates.map(async (c) => {
    const props = await db.contractProperty.findMany({ where: { contract: { customerId: c.id } }, select: { address: true, zipCode: true } }).catch(() => []);
    const addrOk = streetMatch(c.address) || props.some((p) => streetMatch(p.address));
    const zipOk = !zip || c.zipCode?.startsWith(zip) || props.some((p) => p.zipCode?.startsWith(zip));
    const phoneOk = !!callerPhone && digits10(c.phone) === callerPhone;
    const verified = (phoneOk && (nameMatch(c) || addrOk)) || (!phoneOk && nameMatch(c) && addrOk && zipOk);
    return { c, verified, phoneOk };
  }));

  const v = scored.filter((s) => s.verified);
  if (v.length !== 1) {
    return NextResponse.json({
      found: candidates.length > 0, verified: false,
      message: candidates.length === 0
        ? "No customer record found. Treat the caller as a new customer (they can still join the maintenance plan)."
        : v.length > 1
          ? "Several records match. Ask for the full service address (street number and street) and the ZIP code, then call this tool again."
          : "Could not verify the caller. Ask for the full name on the account and the service address (street number and street), then call this tool again. Do not share any account details before verification.",
    });
  }

  const cust = v[0].c;
  await syncMaintenanceVisits().catch(console.error);
  const contracts = await db.maintenanceContract.findMany({
    where: { customerId: cust.id, status: { notIn: ["CANCELLED"] } },
    orderBy: { createdAt: "desc" },
    include: {
      planType: { select: { name: true } },
      properties: { orderBy: { createdAt: "asc" }, select: { id: true, nickname: true, address: true, apt: true, city: true, zipCode: true, systemCount: true } },
      visits: {
        orderBy: [{ periodStart: "desc" }, { visitNumber: "asc" }], take: 200,
        include: { appointment: { select: { id: true, appointmentNumber: true, status: true, techStatus: true, technicianId: true, scheduledStart: true, arrivalWindow: true } } },
      },
    },
  });
  const day = (d: Date | null | undefined) => d ? d.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric", year: "numeric" }) : null;

  const memberships = contracts.map((c) => {
    const covered = (COVERED_STATUSES as readonly string[]).includes(c.status);
    const latest = c.visits[0]?.periodStart.getTime();
    const current = c.visits.filter((x) => x.periodStart.getTime() === latest);
    const visitOut = (x: (typeof c.visits)[number]) => {
      const st = visitState(x);
      const ap = x.appointment;
      return {
        visitId: x.id, visit: `${x.visitNumber} of 2`, type: x.season === "SPRING_AC" ? "Cooling Tune-Up" : "Heating Tune-Up",
        season: SEASONS[x.season as Season]?.label, status: st,
        window: `${day(x.windowStart)} to ${day(x.windowEnd)}`,
        appointment: ap ? {
          number: ap.appointmentNumber, date: day(ap.scheduledStart), arrivalWindow: ap.arrivalWindow,
          dispatch: ap.status === "CANCELLED" ? "CANCELED" : ap.technicianId ? "TECHNICIAN_ASSIGNED" : "PENDING_DISPATCH",
        } : null,
        canBook: !ap && (st === "DUE_NOW" || st === "OVERDUE" || st === "UPCOMING"),
      };
    };
    const homes = c.properties.length
      ? c.properties.map((p, i) => ({
          homeId: p.id, home: `${p.nickname ? `${p.nickname} — ` : ""}${p.address}${p.apt ? ` ${p.apt}` : ""}, ${p.city} ${p.zipCode}`, homeNumber: i + 1,
          systems: p.systemCount,
          visits: covered ? current.filter((x) => x.propertyId === p.id).map(visitOut) : [],
        }))
      : [{ homeId: null, home: cust.address ? `${cust.address}, ${cust.city ?? ""} ${cust.zipCode ?? ""}`.trim() : "address on file", homeNumber: 1, systems: c.numberOfSystems, visits: covered ? current.map(visitOut) : [] }];
    return {
      contractId: c.id, plan: c.planType.name, membershipNumber: c.membershipNumber,
      status: covered ? (c.status === "PAST_DUE" ? "ACTIVE_PAYMENT_PAST_DUE" : "ACTIVE") : c.status === "SENT" || c.status === "SIGNED" ? "NOT_PAID_YET" : c.status,
      billing: c.billingInterval, startDate: day(c.membershipStartDate ?? c.paidAt), renewalDate: day(c.renewalDate),
      systemsCovered: c.numberOfSystems, numberOfHomes: homes.length,
      homes,
    };
  });

  return NextResponse.json({
    found: true, verified: true,
    customer: {
      customerId: cust.id, name: `${cust.firstName ?? ""} ${cust.lastName ?? ""}`.trim(), phoneOnFile: cust.phone ? `ends in ${digits10(cust.phone).slice(-4)}` : null,
      hasEmail: !!cust.email, serviceAddress: cust.address ? `${cust.address}, ${cust.city ?? ""} ${cust.zipCode ?? ""}`.trim() : null,
      language: cust.preferredLanguage ?? "en",
    },
    memberships,
    message: memberships.some((m) => m.status.startsWith("ACTIVE"))
      ? `Active maintenance member${memberships.some((m) => m.numberOfHomes > 1) ? " with several homes: each home has its own 2 visits. Ask which home(s) the caller wants to schedule (one, some or all) and book each home's visit separately — each can have its own date and window" : ""}. Only book visits with canBook=true; a visit that already has an appointment must not be booked again.`
      : memberships.length ? "The customer has a membership that is not active (see status). Explain it; offer to renew / complete payment." : "Verified customer without a maintenance plan — you may present the plan.",
  });
}
