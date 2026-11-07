import { db } from "@/lib/db";
import { getWebPush } from "@/lib/web-push";
import type { Role } from "@/lib/generated/prisma/enums";

const STAFF_ROLES: Role[] = ["DISPATCHER", "CUSTOMER_SERVICE_REP", "MANAGER", "ADMIN", "SUPER_ADMIN"];

// Web-push to every subscribed staff device. Never throws — a failed push
// must not break the webhook that triggered it.
export async function notifyStaff(payload: { title: string; body: string; url?: string; tag?: string }) {
  try {
    const subs = await db.pushSubscription.findMany({ where: { user: { role: { in: STAFF_ROLES } } } });
    if (subs.length === 0) return;

    const wp = getWebPush();
    const data = JSON.stringify({ url: "/", ...payload });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await wp.sendNotification({ endpoint: sub.endpoint, keys: sub.keys as { auth: string; p256dh: string } }, data);
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            console.error("Staff push failed", err);
          }
        }
      })
    );
  } catch (err) {
    console.error("notifyStaff failed", err);
  }
}
