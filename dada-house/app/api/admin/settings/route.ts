import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const settings = await db.setting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return NextResponse.json(map);
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const entries = Object.entries(body as Record<string, string>).filter(
    ([, v]) => typeof v === "string"
  );

  await Promise.all(
    entries.map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  );

  return NextResponse.json({ success: true });
}
