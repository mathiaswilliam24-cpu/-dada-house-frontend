import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrDispatcher } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { PAY_ROLES } from "@/lib/dispatch";
import { createVisitJob } from "@/lib/maintenance-visits";
import { sendCustomerTemplate } from "@/lib/customer-notify";
import { asLang, SEASON_SERVICE } from "@/lib/notification-templates";
import { ctParts } from "@/lib/dispatch";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["create_job", "skip", "reopen", "note", "text"]),
  note: z.string().trim().max(1000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminOrDispatcher(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { action, note } = parsed.data;

  const visit = await db.maintenanceVisit.findUnique({ where: { id } });
  if (!visit) return NextResponse.json({ error: "Visit not found" }, { status: 404 });

  try {
    if (action === "create_job") {
      const job = await createVisitJob(id, { id: auth.id, name: auth.name });
      return NextResponse.json({ ok: true, jobId: job.id, appointmentNumber: job.appointmentNumber });
    }
    if (action === "text") {
      const c = await db.maintenanceContract.findUnique({ where: { id: visit.contractId }, select: { preferredLanguage: true, customer: { select: { firstName: true, phone: true, preferredLanguage: true } } } });
      if (!c?.customer.phone) return NextResponse.json({ error: "No phone number for this member." }, { status: 400 });
      const lang = asLang(c.customer.preferredLanguage !== "en" ? c.customer.preferredLanguage : c.preferredLanguage);
      const sent = await sendCustomerTemplate({
        key: "MAINTENANCE_DUE", phone: c.customer.phone, lang, sentById: auth.id,
        vars: { name: c.customer.firstName, service: SEASON_SERVICE[visit.season]?.[lang] ?? "tune-up" },
      });
      if (!sent) return NextResponse.json({ error: "Not sent — the member opted out of texts or this message is turned off." }, { status: 400 });
      const stamp = `Texted ${ctParts(new Date()).ymd} (${lang.toUpperCase()}) by ${auth.name ?? "staff"}`;
      await db.maintenanceVisit.update({ where: { id }, data: { notes: visit.notes ? `${visit.notes} · ${stamp}` : stamp } });
      return NextResponse.json({ ok: true });
    }
    if (action === "skip") {
      if (!PAY_ROLES.includes(auth.role)) return NextResponse.json({ error: "Only managers can skip a visit." }, { status: 403 });
      if (visit.appointmentId) return NextResponse.json({ error: "Cancel the linked job first." }, { status: 400 });
      if (!note) return NextResponse.json({ error: "Give a reason for skipping (e.g. customer declined)." }, { status: 400 });
      await db.maintenanceVisit.update({ where: { id }, data: { status: "SKIPPED", notes: `${note} — ${auth.name ?? "staff"}` } });
    } else if (action === "reopen") {
      if (visit.status !== "SKIPPED") return NextResponse.json({ error: "Only skipped visits can be reopened." }, { status: 400 });
      await db.maintenanceVisit.update({ where: { id }, data: { status: "DUE" } });
    } else if (action === "note") {
      await db.maintenanceVisit.update({ where: { id }, data: { notes: note || null } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
