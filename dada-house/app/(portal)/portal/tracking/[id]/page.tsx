import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, Clock, CheckCircle, Truck, Wrench } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const techStatusSteps = [
  { key: "EN_ROUTE", label: "On the way", icon: Truck },
  { key: "ARRIVED", label: "Arrived", icon: MapPin },
  { key: "WORKING", label: "Working on it", icon: Wrench },
  { key: "COMPLETED", label: "Completed", icon: CheckCircle },
];

export default async function PortalTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const appointment = await db.appointment.findFirst({
    where: { id, userId: session.user.id },
    include: {
      technician: { select: { name: true, phone: true } },
    },
  });

  if (!appointment) notFound();

  const latestLocation = appointment.technicianId
    ? await db.technicianLocation.findFirst({
        where: { userId: appointment.technicianId },
        orderBy: { timestamp: "desc" },
      })
    : null;

  const currentStep = techStatusSteps.findIndex((s) => s.key === appointment.techStatus);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/portal/appointments" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Live Tracking</h1>
          <p className="text-xs text-gray-500">{appointment.appointmentNumber}</p>
        </div>
      </div>

      {appointment.techStatus ? (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Job Progress</h2>
            <div className="space-y-3">
              {techStatusSteps.map((step, i) => {
                const done = i <= currentStep;
                const active = i === currentStep;
                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      done ? "bg-[#1B3FA8] text-white" : "bg-gray-100 text-gray-400"
                    } ${active ? "ring-4 ring-blue-100" : ""}`}>
                      <step.icon size={15} />
                    </div>
                    <span className={`text-sm font-medium ${done ? "text-gray-900" : "text-gray-400"}`}>
                      {step.label}
                    </span>
                    {active && (
                      <span className="ml-auto text-xs text-blue-600 font-medium animate-pulse">• Now</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {appointment.technician && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Your Technician</h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1B3FA8] flex items-center justify-center text-white font-bold text-lg">
                  {appointment.technician.name?.[0] ?? "T"}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{appointment.technician.name}</p>
                  <p className="text-sm text-gray-500">Certified Technician</p>
                </div>
                {appointment.technician.phone && (
                  <a href={`tel:${appointment.technician.phone}`} className="p-2.5 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                    <Phone size={18} />
                  </a>
                )}
              </div>
            </div>
          )}

          {latestLocation && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Last Known Location</h2>
              <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                <Clock size={12} />
                Updated {formatDate(latestLocation.timestamp)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${latestLocation.lat},${latestLocation.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-[#1B3FA8] font-medium hover:underline"
              >
                <MapPin size={15} />
                View on Google Maps
              </a>
            </div>
          )}

          {appointment.eta && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Estimated Arrival</p>
                <p className="text-sm text-blue-700">{formatDate(appointment.eta)}</p>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7 text-gray-400" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">No technician dispatched yet</p>
          <p className="text-sm text-gray-500">We will notify you once a technician is assigned to your job.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Job Details</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Service</span>
            <span className="font-medium text-gray-900">{appointment.service}</span>
          </div>
          {appointment.subservice && (
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-gray-900">{appointment.subservice}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Address</span>
            <span className="font-medium text-gray-900 text-right max-w-48">{appointment.address}, {appointment.city}</span>
          </div>
          {appointment.preferredDate && (
            <div className="flex justify-between">
              <span className="text-gray-500">Scheduled</span>
              <span className="font-medium text-gray-900">{formatDate(appointment.preferredDate)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}