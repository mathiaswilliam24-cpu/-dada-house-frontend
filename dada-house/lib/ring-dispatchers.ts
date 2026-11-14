import { db } from "@/lib/db";
import { getTwilioClient } from "@/lib/twilio";
import { agentIdentity } from "@/lib/twilio-voice";
import { normalizePhone } from "@/lib/customers";
import { isWithinBusinessHours } from "@/lib/business-hours";
import type { AgentStatus, Role } from "@/lib/generated/prisma/enums";

/**
 * Simultaneous ring for inbound calls.
 *
 * The caller waits in a per-call Twilio queue (hearing ringback) while every
 * AVAILABLE dispatcher is called on a separate outbound leg — their cell
 * phone (screened: "press 1") and their browser softphone. The first one to
 * accept wins (atomic DB claim), is bridged to the caller from the queue, and
 * every other leg is cancelled so the other phones stop ringing.
 *
 * Why not a single <Dial> with several <Number>s: Twilio cancels the other
 * legs as soon as ANY leg picks up — including a dispatcher's personal
 * voicemail — which stopped everyone else's phone and lost the customer.
 */

export const RING_SECONDS = 32;
const CALL_CENTER_ROLES: Role[] = ["SUPER_ADMIN", "MANAGER", "CUSTOMER_SERVICE_REP", "ADMIN", "DISPATCHER"];

export function webhookBase() {
  return (process.env.TWILIO_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");
}

export function queueName(callId: string) {
  return `call-${callId}`;
}

export async function getAvailableAgents() {
  if (!isWithinBusinessHours()) return [];
  return db.user.findMany({
    where: { agentStatus: "AVAILABLE" as AgentStatus, role: { in: CALL_CENTER_ROLES } },
    select: { id: true, phone: true },
  });
}

/** Starts one outbound leg per dispatcher device. Never throws. */
export async function ringDispatchers(callId: string, callerPhone: string, agents: { id: string; phone: string | null }[]) {
  const client = getTwilioClient();
  const businessNumber = process.env.TWILIO_PHONE_NUMBER!;
  const base = webhookBase();
  const caller = normalizePhone(callerPhone);
  const legUrl = (agentId: string, mode: "cell" | "browser") =>
    `${base}/api/twilio/voice/screen?${new URLSearchParams({ callId, agentId, mode }).toString()}`;

  const attempts: Promise<string | null>[] = [];
  for (const agent of agents) {
    // Browser softphone — shows the customer's number; accepting is explicit, no screening needed.
    attempts.push(
      client.calls
        .create({ to: `client:${agentIdentity(agent.id)}`, from: caller, url: legUrl(agent.id, "browser"), timeout: RING_SECONDS })
        .catch(() =>
          client.calls.create({ to: `client:${agentIdentity(agent.id)}`, from: businessNumber, url: legUrl(agent.id, "browser"), timeout: RING_SECONDS })
        )
        .then((c) => c.sid)
        .catch((err) => { console.error("Browser leg failed", agent.id, err?.message); return null; })
    );
    // Cell phone — caller ID must be our own number; screened with "press 1".
    const cell = agent.phone ? normalizePhone(agent.phone) : null;
    if (cell && cell !== caller) {
      attempts.push(
        client.calls
          .create({ to: cell, from: businessNumber, url: legUrl(agent.id, "cell"), timeout: RING_SECONDS })
          .then((c) => c.sid)
          .catch((err) => { console.error("Cell leg failed", agent.id, err?.message); return null; })
      );
    }
  }

  const sids = (await Promise.all(attempts)).filter((s): s is string => !!s);
  await db.call.update({ where: { id: callId }, data: { ringLegSids: sids } }).catch(() => {});
  return sids;
}

/** Atomically claims the call for one dispatcher. True only for the first claimant. */
export async function claimCall(callId: string, agentId: string | null) {
  const res = await db.call.updateMany({
    where: { id: callId, answeredAt: null, status: "RINGING" },
    data: { answeredAt: new Date(), status: "IN_PROGRESS", ...(agentId ? { agentId } : {}) },
  });
  return res.count === 1;
}

/** Stops every other dispatcher leg still ringing (or sitting in screening). Never throws. */
export async function cancelOtherLegs(callId: string, keepSid?: string) {
  const call = await db.call.findUnique({ where: { id: callId }, select: { ringLegSids: true } }).catch(() => null);
  if (!call?.ringLegSids.length) return;
  const client = getTwilioClient();
  await Promise.all(
    call.ringLegSids
      .filter((sid) => sid !== keepSid)
      .map((sid) =>
        client.calls(sid).update({ status: "canceled" })
          .catch(() => client.calls(sid).update({ status: "completed" }))
          .catch(() => {})
      )
  );
}

/** Per-call queues are created on the fly by <Enqueue>; delete them once used. */
export async function deleteQueue(queueSid: string | null) {
  if (!queueSid) return;
  await getTwilioClient().queues(queueSid).remove().catch(() => {});
}
