import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import { AppointmentActions } from "@/components/admin/appointment-actions";
import {
  ArrowLeft, Calendar, MapPin, Phone, Mail, User,
  FileText, Clock, HardHat, StickyNote, Camera, Mic,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const { id } = await params;

  const appt = await db.appointment.findUnique({
    where: { id },
    include: {
      invoice: true,
      technician: { select: { id: true, name: true, phone: true } },
      dispatcher: { select: { id: true, name: true } },
      notifications: { orderBy: { sentAt: "desc" } },
    },
  });

  if (!appt) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/appointments"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Appointments
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-mono text-gray-500">{appt.appointmentNumber}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-gray-900">{appt.service}</h1>
              {appt.subservice && (
                <span className="text-sm text-gray-500">· {appt.subservice}</span>
              )}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appt.status)}`}>
                {appt.status.replace("_", " ")}
              </span>
              {appt.source === "voice_agent" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                  <Mic size={12} /> Booked via AI Voice Agent
                </span>
              )}
            </div>
            <p className="text-sm font-mono text-gray-400">#{appt.appointmentNumber}</p>
          </div>
          <AppointmentActions
            id={appt.id}
            currentStatus={appt.status}
            currentNotes={appt.notes}
            currentTechnicianId={appt.technicianId}
            invoiceAmount={appt.invoice?.amount}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-5">
          {/* Client info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-[#1B3FA8]" /> Client Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{appt.name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${appt.phone}`} className="hover:text-[#F7921A]">{appt.phone}</a>
              </div>
              <div className="flex items-center gap-2 text-gray-600 sm:col-span-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${appt.email}`} className="hover:text-[#F7921A]">{appt.email}</a>
              </div>
              <div className="flex items-start gap-2 text-gray-600 sm:col-span-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <span>{appt.address}, {appt.city}</span>
              </div>
            </div>
          </div>

          {/* Job details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1B3FA8]" /> Job Details
            </h2>
            <div className="space-y-3 text-sm">
              {appt.preferredDate && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Scheduled: <span className="font-medium">{formatDate(appt.preferredDate.toISOString())}</span></span>
                  {appt.preferredTime && <span className="text-gray-400">at {appt.preferredTime}</span>}
                </div>
              )}
              {appt.eta && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>ETA: <span className="font-medium">{formatDate(appt.eta.toISOString())}</span></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <Clock className="w-3.5 h-3.5" />
                Created {formatDate(appt.createdAt.toISOString())}
              </div>
              {appt.description && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                  <p className="text-gray-700">{appt.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {appt.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <StickyNote className="w-4 h-4" /> Internal Notes
              </h2>
              <p className="text-sm text-amber-700">{appt.notes}</p>
            </div>
          )}

          {/* Photos */}
          {appt.photos.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#1B3FA8]" /> Photos ({appt.photos.length})
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {appt.photos.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full aspect-square object-cover rounded-lg hover:opacity-90 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Notification log */}
          {appt.notifications.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Notification History</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {appt.notifications.map((n) => (
                  <div key={n.id} className="px-4 py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded font-medium ${n.type === "SMS" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                        {n.type}
                      </span>
                      <span className="text-gray-500">{n.recipient}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={n.status === "sent" ? "text-green-600" : "text-red-500"}>{n.status}</span>
                      <span className="text-gray-400">{formatDate(n.sentAt.toISOString())}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Technician */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <HardHat className="w-4 h-4 text-[#1B3FA8]" /> Assigned Technician
            </h2>
            {appt.technician ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1B3FA8] rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {appt.technician.name?.[0] ?? "T"}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{appt.technician.name}</p>
                  {appt.technician.phone && (
                    <a href={`tel:${appt.technician.phone}`} className="text-xs text-gray-500 hover:text-[#F7921A]">
                      {appt.technician.phone}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not assigned yet</p>
            )}
            {appt.techStatus && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">Field Status: </span>
                <span className="text-xs font-semibold text-purple-700">{appt.techStatus.replace("_", " ")}</span>
              </div>
            )}
          </div>

          {/* Invoice */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-[#1B3FA8]" /> Invoice
            </h2>
            {appt.invoice ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">{formatCurrency(appt.invoice.amount)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    appt.invoice.status === "PAID" ? "bg-green-50 text-green-700" :
                    appt.invoice.status === "SENT" ? "bg-blue-50 text-blue-700" :
                    "bg-gray-50 text-gray-600"
                  }`}>
                    {appt.invoice.status}
                  </span>
                </div>
                {appt.invoice.paidAt && (
                  <p className="text-xs text-gray-400">Paid {formatDate(appt.invoice.paidAt.toISOString())}</p>
                )}
                {appt.invoice.dueDate && !appt.invoice.paidAt && (
                  <p className="text-xs text-gray-400">Due {formatDate(appt.invoice.dueDate.toISOString())}</p>
                )}
                {appt.invoice.pdfUrl && (
                  <a href={appt.invoice.pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#1B3FA8] hover:underline flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Download PDF
                  </a>
                )}
                {appt.invoice.notes && (
                  <p className="text-xs text-gray-500 mt-2 border-t border-gray-50 pt-2">{appt.invoice.notes}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No invoice yet</p>
            )}
          </div>

          {/* Dispatcher */}
          {appt.dispatcher && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-2 text-sm">Dispatched By</h2>
              <p className="text-sm text-gray-600">{appt.dispatcher.name}</p>
            </div>
          )}

          {/* Links */}
          <div className="space-y-2">
            <Link
              href={`/admin/appointments?q=${encodeURIComponent(appt.appointmentNumber)}`}
              className="block w-full text-center py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
            >
              Back to List
            </Link>
            <Link
              href={`/admin/customers?q=${encodeURIComponent(appt.email)}`}
              className="block w-full text-center py-2 text-sm border border-[#1B3FA8]/30 rounded-lg hover:bg-blue-50 text-[#1B3FA8]"
            >
              View Customer Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
