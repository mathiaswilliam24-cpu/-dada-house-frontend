import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getWebPush } from "@/lib/web-push";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { userId, title, body, url } = await req.json();
  if (!title || !body) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const subs = await db.pushSubscription.findMany({
    where: userId ? { userId } : undefined,
  });

  const payload = JSON.stringify({ title, body, url: url ?? "/" });
  const wp = getWebPush();
  let sent = 0;

  await Promise.all(
    subs.map((sub) =>
      wp
        .sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys as { auth: string; p256dh: string } },
          payload
        )
        .then(() => { sent++; })
        .catch(console.error)
    )
  );

  return NextResponse.json({ sent, total: subs.length });
}
