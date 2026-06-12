import { NextRequest, NextResponse, after } from "next/server";
import { requireTechnician } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { techJobStatusSchema } from "@/lib/validations";
import { getWebPush } from "@/lib/web-push";
import { sendSMS } from "@/lib/twilio";

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
    where: { id, technicianId: auth.role === "ADMIN" ? undefined : auth.id },
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
    await db.jobTimeLog.upsert({
      where: { appointmentId: id },
      create: { appointmentId: id, technicianId: auth.id, completedAt: new Date() },
      update: { completedAt: new Date() },
    }).catch(() => {});
  } else if (status === "ARRIVED") {
    await db.jobTimeLog.upsert({
      where: { appointmentId: id },
      create: { appointmentId: id, technicianId: auth.id, arrivedAt: new Date() },
      update: { arrivedAt: new Date() },
    }).catch(() => {});
  }

  const updated = await db.appointment.update({ where: { id }, data: updateData });

  // Customer notifications
  const customerPhone = appointment.phone;
  const smsMessages: Record<string, string> = {
    EN_ROUTE: `Hi ${appointment.name}! Your DADA HOUSE technician is on the way. We'll notify you when they arrive. Questions? Call (910) 685-8042.`,
    ARRIVED: `Your DADA HOUSE technician has arrived at your location. Please let them in. Thank you!`,
    COMPLETED: `Your DADA HOUSE service has been completed! Thank you for choosing us. Please leave a review at dada-house.com/reviews`,
    NEED_RESCHEDULE: `Hi ${appointment.name}, your DADA HOUSE appointment needs to be rescheduled. We'll contact you shortly to arrange a new time.`,
  };

  after(async () => {
    const tasks: Promise<unknown>[] = [];

    if (smsMessages[status] && customerPhone) {
      tasks.push(sendSMS(customerPhone, smsMessages[status]).catch(console.error));
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
