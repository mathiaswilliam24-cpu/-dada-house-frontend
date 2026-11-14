/**
 * One-off: recover photo-only customer texts the old webhook dropped
 * (it ignored messages with an empty Body). Idempotent — skips SIDs already saved.
 * Run: npx tsx --env-file=.env scripts/backfill-inbound-mms.ts
 */
import { db } from "@/lib/db";
import { normalizePhone, findOrCreateCustomerByPhone } from "@/lib/customers";
import { rehostTwilioMedia, type InboundMedia } from "@/lib/inbound-media";

const SID = process.env.TWILIO_ACCOUNT_SID!;
const AUTH = "Basic " + Buffer.from(`${SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
const BUSINESS = process.env.TWILIO_PHONE_NUMBER!;
const api = (path: string) =>
  fetch(`https://api.twilio.com${path}`, { headers: { Authorization: AUTH } }).then((r) => r.json());

async function main() {
  const list = await api(`/2010-04-01/Accounts/${SID}/Messages.json?PageSize=1000&To=${encodeURIComponent(BUSINESS)}`);
  const withMedia = (list.messages as any[]).filter((m) => Number(m.num_media) > 0);

  for (const m of withMedia) {
    if (await db.message.findUnique({ where: { twilioSid: m.sid } })) {
      console.log(m.sid, "already saved — skip");
      continue;
    }
    const mediaList = await api(`/2010-04-01/Accounts/${SID}/Messages/${m.sid}/Media.json`);
    const media: InboundMedia[] = (mediaList.media_list as any[]).map((x) => ({
      url: `https://api.twilio.com/2010-04-01/Accounts/${SID}/Messages/${m.sid}/Media/${x.sid}`,
      contentType: x.content_type,
    }));
    const mediaUrls = await rehostTwilioMedia(media, `sms-${m.sid}`);

    const phone = normalizePhone(m.from);
    const customer = await findOrCreateCustomerByPhone(phone);
    const thread =
      (await db.messageThread.findFirst({ where: { phoneNumber: phone } })) ??
      (await db.messageThread.create({ data: { phoneNumber: phone, customerId: customer.id } }));

    const sentAt = new Date(m.date_sent);
    await db.message.create({
      data: {
        threadId: thread.id, direction: "INBOUND", body: m.body ?? "", status: "RECEIVED",
        twilioSid: m.sid, fromNumber: phone, toNumber: normalizePhone(m.to), mediaUrls, createdAt: sentAt,
      },
    });
    await db.messageThread.update({
      where: { id: thread.id },
      data: {
        unreadCount: { increment: 1 },
        ...(!thread.lastMessageAt || thread.lastMessageAt < sentAt ? { lastMessageAt: sentAt } : {}),
      },
    });
    console.log(m.sid, phone, `${mediaUrls.length}/${media.length} files recovered`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
