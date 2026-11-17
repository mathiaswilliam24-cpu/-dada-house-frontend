import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { PAY_ROLES } from "@/lib/dispatch";
import { getTemplateOverrides, saveTemplateOverrides } from "@/lib/customer-notify";
import { TEMPLATE_KEYS, LANGS, type TemplateOverrides } from "@/lib/notification-templates";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ overrides: await getTemplateOverrides(), canEdit: PAY_ROLES.includes(auth.role) });
}

const text = z.string().max(640);
const schema = z.object({
  phone: z.string().trim().max(30).optional(),
  templates: z.record(
    z.enum(TEMPLATE_KEYS as [string, ...string[]]),
    z.object({
      enabled: z.boolean().optional(),
      text: z.record(z.enum(LANGS as unknown as [string, ...string[]]), text).optional(),
    })
  ).optional(),
});

/** Saves message overrides (managers only). Empty text = use the default. */
export async function PUT(req: NextRequest) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  if (!PAY_ROLES.includes(auth.role)) return NextResponse.json({ error: "Only managers can change customer messages." }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 });

  // Every template text must keep its placeholders well-formed and STOP-safe length.
  for (const [k, t] of Object.entries(parsed.data.templates ?? {})) {
    for (const [lang, body] of Object.entries(t.text ?? {})) {
      const bad = body.match(/\{(\w+)\}/g)?.find((v) => !["{name}", "{number}", "{service}", "{date}", "{window}", "{tech}", "{link}", "{phone}"].includes(v));
      if (bad) return NextResponse.json({ error: `${k} (${lang.toUpperCase()}): unknown placeholder ${bad}` }, { status: 400 });
    }
  }
  await saveTemplateOverrides(parsed.data as TemplateOverrides);
  return NextResponse.json({ ok: true });
}
