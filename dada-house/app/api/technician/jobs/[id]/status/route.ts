import { sendCustomerTemplate, customerLang, jobVars } from "@/lib/customer-notify";
import { NextRequest, NextResponse, after } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { techJobStatusSchema } from "@/lib/validations";
import { getWebPush } from "@/lib/web-push";
import { sendReviewRequest } from "@/lib/review-request";
import { logJobEvent } from "@/lib/dispatch";
import { TECH_STATUS_LABEL } from "@/lib/tech-status";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTechnician(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json();
  const result = techJobStatusSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
  }

  const { status } = result.data;

  const appointment = await db.appointment.findFirst({
    where: { id, ...(["ADMIN", "SUPER_ADMIN"].includes(auth.role) ? {} : { OR: [{ technicianId: auth.id }, { assignments: { some: { technicianId: auth.id } } }] }) },
  });
  if (!appointment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { techStatus: status };

  // Auto-update appointment status
  if (status === "WORKING" || status === "DIAGNOSING") {
    updateData.status = "IN_PROGRESS";
    if (status === "WORKING") {
      await db.jobTimeLog.upsert({
        where: { appointmentId: id },
        create: { appointmentId: id, technicianId: auth.id, startedAt: new Date() },
        update: { startedAt: new Date() },
      }).catch(() => {});
    }
  } else if (status === "COMPLETED") {
    updateData.status = "COMPLETED";
    updateData.approvedAt = new Date();
    const completedAt = new Date();
    const existingLog = await db.jobTimeLog.findUnique({ where: { appointmentId: id } }).catch(() => null);
    const start = existingLog?.enRouteAt ?? existingLog?.startedAt;
    const totalMinutes = start ? Math.round((completedAt.getTime() - start.getTime()) / 60000) : undefined;
    // Stop the billable timer and bank whatever segment was still running.
    let accumulatedSeconds = existingLog?.accumulatedSeconds ?? 0;
    if (existingLog?.timerStartedAt) {
      accumulatedSeconds += Math.round((completedAt.getTime() - existingLog.timerStartedAt.getTime()) / 1000);
    }
    await db.jobTimeLog.upsert({
      where: { appointmentId: id },
      create: { appointmentId: id, technicianId: auth.id, completedAt, accumulatedSeconds, timerStartedAt: null, ...(totalMinutes != null ? { totalMinutes } : {}) },
      update: { completedAt, accumulatedSeconds, timerStartedAt: null, ...(totalMinutes != null ? { totalMinutes } : {}) },
    }).catch(() => {});
  } else if (status === "ARRIVED") {
    // Auto-start the billable-hours timer on arrival, unless it's already running.
    const existingLog = await db.jobTimeLog.findUnique({ where: { appointmentId: id } }).catch(() => null);
    await db.jobTimeLog.upsert({
      where: { appointmentId: id },
      create: { appointmentId: id, technicianId: auth.id, arrivedAt: new Date(), timerStartedAt: new Date() },
      update: { arrivedAt: new Date(), ...(existingLog?.timerStartedAt ? {} : { timerStartedAt: new Date() }) },
    }).catch(() => {});
  } else if (status === "EN_ROUTE") {
    await db.jobTimeLog.upsert({
      where: { appointmentId: id },
      create: { appointmentId: id, technicianId: auth.id, enRouteAt: new Date() },
      update: { enRouteAt: new Date() },
    }).catch(() => {});
  }

  const updated = await db.appointment.update({ where: { id }, data: updateData });
  await logJobEvent({
    appointmentId: id, type: "TECH_STATUS", userId: auth.id, userName: auth.name ?? null,
    message: `${auth.name ?? "Technician"}: ${TECH_STATUS_LABEL[status] ?? status}`,
    fromValue: appointment.techStatus, toValue: status,
  });

  // Customer notifications
  const customerPhone = appointment.phone;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dada-house.com";
  const trackingUrl = `${baseUrl}/track/${id}`;
  const STATUS_TEMPLATE: Record<string, "TECH_EN_ROUTE" | "TECH_ARRIVED" | "NEED_RESCHEDULE"> = {
    EN_ROUTE: "TECH_EN_ROUTE", ARRIVED: "TECH_ARRIVED", NEED_RESCHEDULE: "NEED_RESCHEDULE",
  };

  after(async () => {
    const tasks: Promise<unknown>[] = [];

    if (status === "COMPLETED") {
      tasks.push(sendReviewRequest({
        name: appointment.name,
        phone: customerPhone,
        email: appointment.email,
        service: appointment.service,
      }).catch(console.error));
    } else if (STATUS_TEMPLATE[status] && customerPhone) {
      // Customer's language, STOP/Do-Not-Contact respected, logged to their message thread.
      tasks.push((async () => {
        const lang = await customerLang({ customerId: appointment.customerId });
        const techFirst = (auth.name ?? "").trim().split(/\s+/)[0] || (lang === "fr" ? "Votre technicien" : lang === "es" ? "Su técnico" : "Your technician");
        await sendCustomerTemplate({ key: STATUS_TEMPLATE[status], phone: customerPhone, lang, vars: jobVars(appointment, lang, { tech: techFirst, link: trackingUrl }) });
      })().catch(console.error));
    }

    // Push notification to customer
    if (appointment.userId) {
      const subs = await db.pushSubscription.findMany({ where: { userId: appointment.userId } });
      const wp = getWebPush();
      const pushMessages: Record<string, string> = {
        EN_ROUTE: "Your technician is on the way!",
        ARRIVED: "Your technician has arrived.",
        COMPLETED: "Service completed! Thank you.",
        NEED_RESCHEDULE: "Your appointment needs to be rescheduled.",
      };
      if (pushMessages[status]) {
        const payload = JSON.stringify({
          title: "DADA HOUSE",
          body: pushMessages[status],
          url: `/portal/appointments/${id}`,
        });
        for (const sub of subs) {
          tasks.push(
            wp.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys as { auth: string; p256dh: string } },
              payload
            ).catch(console.error)
          );
        }
      }
    }

    await Promise.allSettled(tasks);
  });

  return NextResponse.json({ appointment: updated });
}
