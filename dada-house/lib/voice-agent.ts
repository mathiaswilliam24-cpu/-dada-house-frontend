import { NextRequest, NextResponse } from "next/server";
import { sendSMS } from "@/lib/twilio";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { notifyStaff } from "@/lib/staff-push";

/** Shared helpers for the AI receptionist (Vapi) tool endpoints. */

/** Bearer DADA_HOUSE_API_KEY — returns a 401 response when the key is wrong. */
export function voiceAuthError(req: NextRequest): NextResponse | null {
  const key = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  // DADA_HOUSE_API_KEY (voice-agent backend) or VAPI_TOOLS_KEY (tools called directly by Vapi).
  const allowed = [process.env.DADA_HOUSE_API_KEY, process.env.VAPI_TOOLS_KEY].filter((k): k is string => !!k && k.length >= 16);
  if (!key || !allowed.includes(key)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Vapi sends tool arguments either flat or wrapped ({ message: { toolCalls: [{ function: { arguments } }] } }). */
export async function toolArgs(req: NextRequest): Promise<Record<string, unknown>> {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const msg = body.message as { toolCalls?: { function?: { arguments?: unknown } }[]; toolCallList?: { function?: { arguments?: unknown } }[]; call?: { id?: string } } | undefined;
  const call = msg?.toolCalls?.[0] ?? msg?.toolCallList?.[0];
  if (call?.function?.arguments) {
    const a = call.function.arguments;
    const parsed = (typeof a === "string" ? JSON.parse(a) : a) as Record<string, unknown>;
    return { ...parsed, vapiCallId: parsed.vapiCallId ?? msg?.call?.id };
  }
  return body;
}

export const digits10 = (p: string | null | undefined) => (p ?? "").replace(/\D/g, "").slice(-10);
export const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const list = (v?: string) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean);

/** Internal alert to the office: staff push + SMS to the alert phones + email to the appointment alert inbox. */
export async function alertOffice(opts: { title: string; text: string; url?: string; tag?: string }) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://dada-house.com").replace(/\/$/, "");
  const link = opts.url ? `${base}${opts.url}` : base;
  const results: string[] = [];
  await notifyStaff({ title: opts.title, body: opts.text.slice(0, 180), url: opts.url, tag: opts.tag }).then(() => results.push("push")).catch((e) => console.error("office push", e));
  const business = digits10(process.env.TWILIO_PHONE_NUMBER);
  for (const to of list(process.env.INBOUND_SMS_ALERT_PHONES || process.env.ADMIN_PHONE).filter((p) => digits10(p) !== business)) {
    await sendSMS(to, `${opts.title}\n${opts.text}\n${link}`).then(() => results.push("sms")).catch((e) => console.error("office sms", e));
  }
  const emails = list(process.env.APPOINTMENT_ALERT_EMAIL);
  if (emails.length) {
    await resend.emails.send({
      from: FROM_EMAIL, to: emails, subject: opts.title,
      text: `${opts.text}\n\n${link}`,
      html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${opts.text.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!)}</pre><p><a href="${link}">${link}</a></p>`,
    }).then(() => results.push("email")).catch((e) => console.error("office email", e));
  }
  return results;
}

// ── Maintenance visits: 2-hour arrival windows inside 8:00 AM – 4:00 PM (business time) ──
import { findOpenWindows } from "@/lib/dispatch-availability";
import { ctParts, fmtTimeCT } from "@/lib/dispatch";
export const MAINTENANCE_DAY = { startMin: 8 * 60, endMin: 16 * 60 };

export async function maintenanceWindows(opts: { fromYmd?: string; days?: number; limit?: number; excludeAppointmentId?: string }) {
  const r = await findOpenWindows({ jobType: "MAINTENANCE", fromYmd: opts.fromYmd, days: opts.days ?? 3, excludeAppointmentId: opts.excludeAppointmentId });
  const windows = r.windows.filter((w) => {
    const s = ctParts(new Date(w.start)), e = ctParts(new Date(w.end));
    return s.minutes >= MAINTENANCE_DAY.startMin && e.minutes <= MAINTENANCE_DAY.endMin && e.ymd === s.ymd;
  });
  return { windows: windows.slice(0, opts.limit ?? 6), durationMinutes: r.durationMinutes };
}

/** Re-checks a chosen window against the live board; returns the slot or the alternatives. */
export async function checkMaintenanceSlot(slotStart: string, excludeAppointmentId?: string) {
  const start = new Date(slotStart);
  if (Number.isNaN(start.getTime())) return { slot: null, alternatives: [] };
  const day = await maintenanceWindows({ fromYmd: ctParts(start).ymd, days: 1, limit: 20, excludeAppointmentId });
  const w = day.windows.find((x) => new Date(x.start).getTime() === start.getTime());
  if (!w) {
    const alt = await maintenanceWindows({ fromYmd: ctParts(start).ymd, days: 4, limit: 3, excludeAppointmentId });
    return { slot: null, alternatives: alt.windows };
  }
  const t = (d: Date) => fmtTimeCT(d).replace(":00", "");
  const end = new Date(w.end);
  return { slot: { start, end: new Date(start.getTime() + day.durationMinutes * 60000), window: `${t(start)} - ${t(end)}`, minutes: day.durationMinutes, label: w.label }, alternatives: [] };
}

// ── Vapi "function" tools: request { message: { toolCallList: [{ id, function: { name, arguments } }] } }
//    and expect { results: [{ toolCallId, result }] } with HTTP 200. API-request tools get plain JSON. ──
type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
export function vapiTool(handler: Handler): Handler {
  return async (req, ctx) => {
    const raw = (await req.clone().json().catch(() => null)) as { message?: { toolCallList?: { id?: string }[]; toolCalls?: { id?: string }[] } } | null;
    const id = raw?.message?.toolCallList?.[0]?.id ?? raw?.message?.toolCalls?.[0]?.id;
    const res = await handler(req, ctx);
    if (!id) return res;
    const data = await res.json().catch(() => ({ error: "No response" }));
    return NextResponse.json({ results: [{ toolCallId: id, result: JSON.stringify(data) }] }, { status: 200 });
  };
}
