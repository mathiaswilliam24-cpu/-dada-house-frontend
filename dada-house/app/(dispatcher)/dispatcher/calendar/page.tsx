import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { addDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DispatcherCalendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const today = new Date();
  const appointments = await db.appointment.findMany({
    where: {
      preferredDate: { gte: today, lte: addDays(today, 7) },
      status: { not: "CANCELLED" },
    },
    include: {
      technician: { select: { name: true } },
    },
    orderBy: { preferredDate: "asc" },
  });

  // Group by day
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i);
    const dayStr = day.toDateString();
    const dayAppts = appointments.filter((a) => a.preferredDate?.toDateString() === dayStr);
    return { date: day, appointments: dayAppts };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule — Next 7 Days</h1>
        <p className="text-gray-500 text-sm mt-0.5">View and manage upcoming appointments</p>
      </div>

      <div className="space-y-4">
        {days.map(({ date, appointments: appts }) => (
          <div key={date.toISOString()} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <p className="font-semibold text-gray-900">{formatDate(date, "EEEE, MMMM d")}</p>
              <p className="text-xs text-gray-500">{appts.length} appointment{appts.length !== 1 ? "s" : ""}</p>
            </div>
            {appts.length === 0 ? (
              <div className="px-5 py-4 text-sm text-gray-400">No appointments</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {appts.map((appt) => (
                  <div key={appt.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{appt.service}</p>
                      <p className="text-xs text-gray-500">{appt.name} · {appt.address}</p>
                    </div>
                    <div className="text-right">
                      {appt.preferredTime && <p className="text-xs text-gray-600">{appt.preferredTime}</p>}
                      {appt.technician ? (
                        <p className="text-xs text-blue-600 font-medium">{appt.technician.name}</p>
                      ) : (
                        <a href={`/dispatcher/assign/${appt.id}`} className="text-xs text-orange-600 font-medium hover:underline">Unassigned →</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
