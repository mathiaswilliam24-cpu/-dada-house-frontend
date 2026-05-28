import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, getStatusColor } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalAppointmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const appointments = await db.appointment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { invoice: { select: { status: true, amount: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-sm mt-0.5">Your service history and upcoming bookings</p>
        </div>
        <Link href="/booking" className={buttonVariants({ variant: "default" })}>
          <Plus size={16} className="mr-1.5" />
          Book Service
        </Link>
      </div>

      <div className="space-y-3">
        {appointments.map((appt) => (
          <Link
            key={appt.id}
            href={`/portal/appointments/${appt.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900">{appt.service}</p>
                  {appt.subservice && <span className="text-xs text-gray-500">· {appt.subservice}</span>}
                </div>
                <p className="text-sm text-gray-500">{appt.appointmentNumber}</p>
                <p className="text-sm text-gray-600 mt-1">{appt.address}, {appt.city}</p>
                {appt.preferredDate && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDate(appt.preferredDate)} {appt.preferredTime ? `at ${appt.preferredTime}` : ""}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getStatusColor(appt.status)}`}>
                  {appt.status.replace("_", " ")}
                </span>
                {appt.techStatus && (
                  <span className="text-xs text-blue-600 font-medium">
                    Tech: {appt.techStatus.replace("_", " ")}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
        {appointments.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 mb-4">No appointments yet</p>
            <Link href="/booking" className={buttonVariants({ variant: "default" })}>Book your first service</Link>
          </div>
        )}
      </div>
    </div>
  );
}
