import { db } from "@/lib/db";
import { resend, FROM_EMAIL } from "@/lib/resend";

/** Every customer-facing email points replies here so they land in the dispatcher dashboard
 *  instead of the (already human-monitored) customerservice@/service@ inbox. Requires its own
 *  MX record on this subdomain only — dada-house.com's existing mail routing is untouched.
 *  Only active once RESEND_WEBHOOK_SECRET is set (i.e. the inbound pipeline is actually wired
 *  up and receiving is verified in Resend) — until then, omit reply-to entirely so replies fall
 *  back to FROM_EMAIL, which is a real monitored inbox. Setting an unreachable reply-to would
 *  silently bounce every customer reply into the void. */
export const EMAIL_REPLY_TO = process.env.RESEND_WEBHOOK_SECRET
  ? process.env.RESEND_REPLY_TO_ADDRESS || "reply@reply.dada-house.com"
  : undefined;

async function getOrCreateEmailThread(emailAddress: string, customerId?: string | null) {
  const existing = await db.emailThread.findFirst({ where: { emailAddress } });
  if (existing) return existing;
  return db.emailThread.create({ data: { emailAddress, customerId: customerId ?? undefined } });
}

/**
 * Sends a customer-facing email with the reply-to header set so replies route back into the
 * dashboard, and logs it as an outbound EmailMessage. Use this instead of calling
 * resend.emails.send() directly for anything a customer might reasonably reply to.
 */
export async function sendTrackedEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  customerId?: string | null;
  sentById?: string;
  attachmentUrls?: string[];
  attachmentBuffers?: { filename: string; content: Buffer }[];
}) {
  const thread = await getOrCreateEmailThread(opts.to, opts.customerId);

  const lastInbound = await db.emailMessage.findFirst({
    where: { threadId: thread.id, direction: "INBOUND" },
    orderBy: { createdAt: "desc" },
  });

  const attachments = [
    ...(opts.attachmentUrls?.map((url) => ({
      filename: decodeURIComponent(url.split("/").pop() || "attachment"),
      path: url,
    })) ?? []),
    ...(opts.attachmentBuffers?.map((a) => ({ filename: a.filename, content: a.content })) ?? []),
  ];

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: opts.to,
    replyTo: EMAIL_REPLY_TO,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    headers: lastInbound?.messageIdHeader
      ? { "In-Reply-To": lastInbound.messageIdHeader, References: lastInbound.messageIdHeader }
      : undefined,
    attachments: attachments.length ? attachments : undefined,
  });

  await db.emailMessage.create({
    data: {
      threadId: thread.id,
      direction: "OUTBOUND",
      subject: opts.subject,
      body: opts.text || opts.html,
      bodyHtml: opts.html,
      fromAddress: FROM_EMAIL,
      toAddress: opts.to,
      resendId: result.data?.id,
      attachmentUrls: opts.attachmentUrls ?? [],
      sentById: opts.sentById,
    },
  });

  await db.emailThread.update({ where: { id: thread.id }, data: { lastMessageAt: new Date() } });

  return result;
}

/** Called by the Resend inbound webhook when a customer replies. */
export async function handleInboundEmail(data: {
  from: string;
  to: string;
  subject: string | null;
  text: string | null;
  html: string | null;
  messageId: string | null;
  resendId: string;
}) {
  const fromAddress = data.from.match(/<(.+)>/)?.[1] ?? data.from;
  const customer = await db.customer.findFirst({ where: { email: { equals: fromAddress, mode: "insensitive" } } });

  const thread = await getOrCreateEmailThread(fromAddress, customer?.id);

  await db.emailMessage.create({
    data: {
      threadId: thread.id,
      direction: "INBOUND",
      subject: data.subject ?? undefined,
      body: data.text || data.html || "",
      bodyHtml: data.html ?? undefined,
      fromAddress,
      toAddress: data.to,
      resendId: data.resendId,
      messageIdHeader: data.messageId ?? undefined,
    },
  });

  await db.emailThread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date(), unreadCount: { increment: 1 }, subject: data.subject ?? undefined },
  });

  return thread;
}
