import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate, getStatusColor } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { MapPin, Calendar, Mic } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DispatcherRequestsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const [requests, technicians] = await Promise.all([
    db.appointment.findMany({
      where: { technicianId: null, status: { in: ["PENDING", "CONFIRMED"] } },
      orderBy: { preferredDate: "asc" },
    }),
    db.user.findMany({
      where: { role: "TECHNICIAN" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Incoming Requests</h1>
        <p className="text-gray-500 text-sm mt-0.5">{requests.length} unassigned appointment{requests.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="space-y-3">
        {requests.map((appt) => (
          <div key={appt.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{appt.service}</p>
                  {appt.source === "voice_agent" && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700">
                      <Mic size={10} /> AI
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{appt.appointmentNumber} · {appt.name}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border shrink-0 ${getStatusColor(appt.status)}`}>
                {appt.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-gray-400" />
                {appt.address}, {appt.city}
              </div>
              {appt.preferredDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-gray-400" />
                  {formatDate(appt.preferredDate)}
                </div>
              )}
            </div>
            <Link
              href={`/dispatcher/assign/${appt.id}`}
              className={buttonVariants({ variant: "default" })}
            >
              Assign Technician
            </Link>
          </div>
        ))}
        {requests.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            All requests are assigned ✓
          </div>
        )}
      </div>
    </div>
  );
}
