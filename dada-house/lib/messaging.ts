import { db } from "@/lib/db";
import { sendSMS } from "@/lib/twilio";
import { normalizePhone, findOrCreateCustomerByPhone } from "@/lib/customers";

const STOP_KEYWORDS = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
const START_KEYWORDS = ["START", "YES", "UNSTOP"];
const HELP_KEYWORDS = ["HELP", "INFO"];

const MISSED_CALL_MESSAGE =
  "Hi, this is DADA HOUSE. We're sorry we missed your call. How can we help you with HVAC, heating, plumbing, or remodeling? Reply to this message or call us back.";

const OPT_IN_CONFIRMATION_MESSAGE =
  "DADA HOUSE: You're now subscribed to appointment and service updates by text. Msg frequency varies. Msg & data rates may apply. Reply STOP to unsubscribe, HELP for help.";

const HELP_MESSAGE =
  "DADA HOUSE Help: For assistance, call us at +1 (844) 928-0875 or email customerservice@dada-house.com. Msg & data rates may apply. Reply STOP to unsubscribe.";

export class DoNotContactError extends Error {
  constructor(phone: string) {
    super(`${phone} has opted out of SMS (do-not-contact)`);
  }
}

async function getOrCreateThread(phone: string, customerId?: string | null) {
  const existing = await db.messageThread.findFirst({ where: { phoneNumber: phone } });
  if (existing) return { thread: existing, isNew: false };
  const thread = await db.messageThread.create({ data: { phoneNumber: phone, customerId: customerId ?? undefined } });
  return { thread, isNew: true };
}

/** Fires the actual Twilio send + logs the Message row. No DNC check — callers decide when that applies. */
async function dispatchSms(
  threadId: string,
  phone: string,
  body: string,
  opts?: { sentById?: string; templateId?: string; mediaUrls?: string[] }
) {
  const baseUrl = process.env.TWILIO_WEBHOOK_BASE_URL;
  const twilioMessage = await sendSMS(
    phone,
    body,
    {
      ...(baseUrl ? { statusCallback: `${baseUrl}/api/twilio/sms/status` } : {}),
      ...(opts?.mediaUrls?.length ? { mediaUrls: opts.mediaUrls } : {}),
    }
  );

  const message = await db.message.create({
    data: {
      threadId,
      direction: "OUTBOUND",
      body,
      status: "SENT",
      twilioSid: twilioMessage?.sid,
      fromNumber: process.env.TWILIO_PHONE_NUMBER ?? "",
      toNumber: phone,
      sentById: opts?.sentById,
      templateId: opts?.templateId,
      mediaUrls: opts?.mediaUrls ?? [],
    },
  });

  await db.messageThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } });

  return message;
}

/**
 * Sends an outbound SMS, blocked if the number has opted out (STOP), and logs it to the thread.
 * The very first message to a brand-new number is preceded by the CTIA-style opt-in confirmation
 * declared in the Toll-Free Verification form, matching the verbal consent given on the call.
 */
export async function sendOutboundSms(
  to: string,
  body: string,
  opts?: { sentById?: string; templateId?: string; mediaUrls?: string[] }
) {
  const phone = normalizePhone(to);

  const dnc = await db.doNotContact.findUnique({ where: { phoneNumber: phone } });
  if (dnc) throw new DoNotContactError(phone);

  const customer = await findOrCreateCustomerByPhone(phone);
  const { thread, isNew } = await getOrCreateThread(phone, customer.id);

  if (isNew) {
    await dispatchSms(thread.id, phone, OPT_IN_CONFIRMATION_MESSAGE);
  }

  return dispatchSms(thread.id, phone, body, opts);
}

export async function sendMissedCallSms(fromNumber: string, customerId?: string | null) {
  const phone = normalizePhone(fromNumber);
  const dnc = await db.doNotContact.findUnique({ where: { phoneNumber: phone } });
  if (dnc) return null;
  return sendOutboundSms(phone, MISSED_CALL_MESSAGE).catch((err) => {
    if (err instanceof DoNotContactError) return null;
    throw err;
  });
}

/** Handles an inbound SMS webhook: STOP/START compliance keywords, or logs to the customer's thread. */
export async function handleInboundSms(from: string, to: string, body: string, twilioSid?: string) {
  const phone = normalizePhone(from);
  const trimmed = body.trim().toUpperCase();

  if (STOP_KEYWORDS.includes(trimmed)) {
    const customer = await db.customer.findUnique({ where: { phone } });
    await db.doNotContact.upsert({
      where: { phoneNumber: phone },
      update: {},
      create: { phoneNumber: phone, customerId: customer?.id, reason: "STOP_KEYWORD" },
    });
    return { optedOut: true };
  }

  const customer = await findOrCreateCustomerByPhone(phone);
  const { thread } = await getOrCreateThread(phone, customer.id);

  if (START_KEYWORDS.includes(trimmed)) {
    await db.doNotContact.delete({ where: { phoneNumber: phone } }).catch(() => {});
    await dispatchSms(thread.id, phone, OPT_IN_CONFIRMATION_MESSAGE).catch(() => {});
  }

  if (HELP_KEYWORDS.includes(trimmed)) {
    await dispatchSms(thread.id, phone, HELP_MESSAGE).catch(() => {});
  }

  await db.message.create({
    data: {
      threadId: thread.id,
      direction: "INBOUND",
      body,
      status: "RECEIVED",
      twilioSid,
      fromNumber: phone,
      toNumber: normalizePhone(to),
    },
  });

  await db.messageThread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
  });

  return { optedOut: false };
}
