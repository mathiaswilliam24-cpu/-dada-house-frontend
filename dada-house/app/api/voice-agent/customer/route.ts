import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { voiceAuthError, toolArgs, digits10, vapiTool } from "@/lib/voice-agent";
import { verifyCaller } from "@/lib/voice-verify";
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
export const POST = vapiTool(async (req: NextRequest) => {
  const denied = voiceAuthError(req); if (denied) return denied;
  const a = await toolArgs(req);
  const v = await verifyCaller(a);
  if (!v.customer) {
    return NextResponse.json({
      found: v.found, verified: false,
      message: v.found ? v.message : "No customer record found. Treat the caller as a new customer (they can still join the maintenance plan).",
    });
  }
  const cust = v.customer;
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
});
