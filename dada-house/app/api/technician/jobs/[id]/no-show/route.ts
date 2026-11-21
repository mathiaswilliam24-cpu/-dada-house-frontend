import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { logJobEvent } from "@/lib/dispatch";
import { customerLang, getTemplateOverrides, jobVars, renderCustomerText } from "@/lib/customer-notify";
import { sendOutboundSms, DoNotContactError } from "@/lib/messaging";
import { sendTrackedEmail } from "@/lib/customer-email";
import { DEFAULT_BUSINESS_PHONE, type Lang } from "@/lib/notification-templates";
import { getWebPush } from "@/lib/web-push";

export const dynamic = "force-dynamic";

const schema = z.object({
  photoUrls: z.array(z.string().url()).min(1, "Take at least one photo").max(10),
  note: z.string().max(500).optional(),
});

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const EMAIL: Record<Lang, { subject: (n: string) => string; hello: (n: string) => string; body: (t: string, n: string) => string; call: (p: string) => string; photos: string; note: string }> = {
  en: {
    subject: (n) => `We came for your appointment #${n} — no one was home`,
    hello: (n) => `Hi ${n},`,
    body: (t, n) => `${t} from DADA HOUSE came to your address for appointment #${n}, but no one was there. The photos below were taken on site at the time of the visit.`,
    call: (p) => `Please call us at <b>${p}</b> to reschedule your appointment.`,
    photos: "Photos of the visit", note: "Technician note",
  },
  fr: {
    subject: (n) => `Nous sommes passés pour votre rendez-vous n°${n} — personne n'était présent`,
    hello: (n) => `Bonjour ${n},`,
    body: (t, n) => `${t} de DADA HOUSE est venu à votre adresse pour le rendez-vous n°${n}, mais personne n'était présent. Les photos ci-dessous ont été prises sur place au moment du passage.`,
    call: (p) => `Merci de nous appeler au <b>${p}</b> pour reprogrammer votre rendez-vous.`,
    photos: "Photos du passage", note: "Note du technicien",
  },
  es: {
    subject: (n) => `Fuimos a su cita #${n} — no había nadie`,
    hello: (n) => `Hola ${n},`,
    body: (t, n) => `${t} de DADA HOUSE llegó a su dirección para la cita #${n}, pero no había nadie. Las fotos a continuación se tomaron en el lugar al momento de la visita.`,
    call: (p) => `Por favor llámenos al <b>${p}</b> para reprogramar su cita.`,
    photos: "Fotos de la visita", note: "Nota del técnico",
  },
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { photoUrls, note } = parsed.data;

  const appointment = await db.appointment.findFirst({
    where: { id, ...(["ADMIN", "SUPER_ADMIN"].includes(auth.role) ? {} : { OR: [{ technicianId: auth.id }, { assignments: { some: { technicianId: auth.id } } }] }) },
  });
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.jobPhoto.createMany({
    data: photoUrls.map((url) => ({ appointmentId: id, technicianId: auth.id, url, category: "proof", caption: "No one on site" })),
  });
  const updated = await db.appointment.update({ where: { id }, data: { techStatus: "NEED_RESCHEDULE" } });
  await db.jobTimeLog.updateMany({ where: { appointmentId: id, timerStartedAt: { not: null } }, data: { timerStartedAt: null } }).catch(() => {});

  const lang = await customerLang({ customerId: appointment.customerId });
  const techFirst = (auth.name ?? "").trim().split(/\s+/)[0] || (lang === "fr" ? "Votre technicien" : lang === "es" ? "Su técnico" : "Your technician");
  const overrides = await getTemplateOverrides();
  const phone = overrides.phone || DEFAULT_BUSINESS_PHONE;

  // Text message (photo link + MMS pictures; WhatsApp backup adds the remaining links).
  let sms: "sent" | "skipped" | "opted-out" | "failed" = "skipped";
  let smsError: string | null = null;
  if (appointment.phone) {
    const body = await renderCustomerText("NO_ONE_HOME", lang, jobVars(appointment, lang, { tech: techFirst, link: photoUrls[0] }));
    if (body) {
      try { await sendOutboundSms(appointment.phone, body, { sentById: auth.id, mediaUrls: photoUrls }); sms = "sent"; }
      catch (err) {
        if (err instanceof DoNotContactError) sms = "opted-out";
        else { sms = "failed"; smsError = (err as Error).message; console.error("no-show SMS", err); }
      }
    }
  }

  // Email with the photos inline and attached.
  let email: "sent" | "skipped" | "failed" = "skipped";
  let emailError: string | null = null;
  if (appointment.email) {
    const t = EMAIL[lang];
    const first = appointment.name.trim().split(/\s+/)[0] || appointment.name;
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#111">
  <h2 style="color:#1B3FA8;margin-bottom:4px">DADA HOUSE</h2>
  <p>${esc(t.hello(first))}</p>
  <p>${esc(t.body(techFirst, appointment.appointmentNumber))}</p>
  ${note ? `<p><b>${t.note}:</b> ${esc(note)}</p>` : ""}
  <p style="font-size:16px;background:#FFF4E5;border-radius:8px;padding:12px">${t.call(esc(phone))}</p>
  <p><b>${t.photos}</b></p>
  ${photoUrls.map((u) => `<p><a href="${esc(u)}"><img src="${esc(u)}" alt="" style="max-width:100%;border-radius:8px"/></a></p>`).join("")}
</div>`;
    const text = `${t.hello(first)}\n\n${t.body(techFirst, appointment.appointmentNumber)}\n${note ? `\n${t.note}: ${note}\n` : ""}\n${t.call(phone).replace(/<\/?b>/g, "")}\n\n${t.photos}:\n${photoUrls.join("\n")}`;
    try {
      const r = await sendTrackedEmail({ to: appointment.email, subject: t.subject(appointment.appointmentNumber), html, text, customerId: appointment.customerId, sentById: auth.id, attachmentUrls: photoUrls });
      if (r.error) { email = "failed"; emailError = r.error.message; } else email = "sent";
    } catch (err) { email = "failed"; emailError = (err as Error).message; console.error("no-show email", err); }
  }

  await logJobEvent({
    appointmentId: id, type: "TECH_STATUS", userId: auth.id, userName: auth.name ?? null,
    message: `${auth.name ?? "Technician"}: no one on site (${photoUrls.length} photo${photoUrls.length > 1 ? "s" : ""}) — customer text ${sms}${smsError ? ` (${smsError})` : ""}, email ${email}${emailError ? ` (${emailError})` : ""}`,
    fromValue: appointment.techStatus, toValue: "NEED_RESCHEDULE",
    metadata: { noShow: true, photoUrls, note: note ?? null, sms, email },
  });

  if (appointment.userId) {
    const subs = await db.pushSubscription.findMany({ where: { userId: appointment.userId } });
    const wp = getWebPush();
    const payload = JSON.stringify({ title: "DADA HOUSE", body: "Our technician came but no one was home. Please call us to reschedule.", url: `/portal/appointments/${id}` });
    await Promise.allSettled(subs.map((s) => wp.sendNotification({ endpoint: s.endpoint, keys: s.keys as { auth: string; p256dh: string } }, payload)));
  }

  return NextResponse.json({ appointment: updated, sms, smsError, email, emailError });
}
