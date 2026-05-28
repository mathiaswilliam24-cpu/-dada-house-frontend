import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { formatDate, formatCurrency, getStatusColor, getTechStatusColor } from "@/lib/utils";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Phone, MapPin, Calendar, Wrench } from "lucide-react";
import { Suspense } from "react";
import LiveTrackingMap from "@/components/portal/live-tracking-map";

export const dynamic = "force-dynamic";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id } = await params;

  const appointment = await db.appointment.findUnique({
    where: { id },
    include: {
      invoice: true,
      notifications: { orderBy: { sentAt: "desc" }, take: 5 },
      technician: { select: { name: true, image: true, phone: true } },
    },
  });

  if (!appointment || (appointment.userId !== session.user.id && session.user.role !== "ADMIN")) {
    notFound();
  }

  const isTracking = appointment.techStatus === "EN_ROUTE" || appointment.techStatus === "ARRIVED";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/portal/appointments" className="text-sm text-gray-500 hover:text-gray-700 mb-1 block">← Appointments</Link>
          <h1 className="text-2xl font-bold text-gray-900">{appointment.service}</h1>
          <p className="text-gray-500 text-sm">{appointment.appointmentNumber}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(appointment.status)}`}>
          {appointment.status.replace("_", " ")}
        </span>
      </div>

      {/* Live tracking */}
      {isTracking && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-blue-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <p className="font-semibold text-blue-900">Technician En Route</p>
            </div>
            {appointment.technician && (
              <p className="text-sm text-blue-700 mt-0.5">
                {appointment.technician.name} · {appointment.techStatus?.replace("_", " ")}
              </p>
            )}
          </div>
          <Suspense fallback={<div className="h-48 flex items-center justify-center text-gray-400">Loading map…</div>}>
            <LiveTrackingMap appointmentId={id} customerAddress={`${appointment.address}, ${appointment.city}`} />
          </Suspense>
        </div>
      )}

      {/* Technician info */}
      {appointment.technician && appointment.techStatus && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Your Technician</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#1B3FA8] rounded-full flex items-center justify-center text-white font-bold">
              {appointment.technician.name?.[0] ?? "T"}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{appointment.technician.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTechStatusColor(appointment.techStatus)}`}>
                {appointment.techStatus.replace("_", " ")}
              </span>
            </div>
            {appointment.technician.phone && (
              <a href={`tel:${appointment.technician.phone}`} className={buttonVariants({ variant: "outline" })}>
                <Phone size={16} className="mr-1.5" />
                Call
              </a>
            )}
          </div>
          {appointment.eta && (
            <p className="text-sm text-gray-600 mt-3">
              ETA: <span className="font-medium">{formatDate(appointment.eta, "MMM d 'at' h:mm a")}</span>
            </p>
          )}
        </div>
      )}

      {/* Appointment details */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-900">Appointment Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2.5">
            <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">Address</p>
              <p className="text-gray-900">{appointment.address}, {appointment.city} {appointment.zipCode}</p>
            </div>
          </div>
          {appointment.preferredDate && (
            <div className="flex items-start gap-2.5">
              <Calendar size={16} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-500 text-xs">Scheduled</p>
                <p className="text-gray-900">{formatDate(appointment.preferredDate)} {appointment.preferredTime ? `at ${appointment.preferredTime}` : ""}</p>
              </div>
            </div>
          )}
          {appointment.subservice && (
            <div className="flex items-start gap-2.5">
              <Wrench size={16} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-500 text-xs">Sub-service</p>
                <p className="text-gray-900">{appointment.subservice}</p>
              </div>
            </div>
          )}
        </div>
        {appointment.description && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-700">{appointment.description}</p>
          </div>
        )}
      </div>

      {/* Invoice */}
      {appointment.invoice && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Invoice</h3>
            <Link href={`/portal/invoices/${appointment.invoice.id}`} className="text-sm text-[#F7921A] hover:underline">View Invoice</Link>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="font-bold text-gray-900 text-lg">{formatCurrency(appointment.invoice.amount)}</p>
          </div>
          <div className="mt-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${appointment.invoice.status === "PAID" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
              {appointment.invoice.status}
            </span>
          </div>
        </div>
      )}

      {/* Photos */}
      {appointment.photos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Photos</h3>
          <div className="grid grid-cols-3 gap-2">
            {appointment.photos.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`Photo ${i + 1}`} className="w-full h-24 object-cover rounded-lg" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
