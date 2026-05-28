import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { InvoiceDownload } from "@/components/client/invoice-download";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const { id } = await params;

  const appt = await db.appointment.findUnique({
    where: { id },
    include: { invoice: true, notifications: true },
  });

  if (!appt) notFound();

  if (appt.userId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const statusClasses = getStatusColor(appt.status);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-xl font-bold text-gray-900">
          Appointment #{appt.appointmentNumber}
        </h1>
      </div>

      <div className="space-y-4">
        {/* Status card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Service</p>
              <p className="font-semibold text-gray-900">
                {appt.service}
                {appt.subservice && (
                  <span className="text-gray-500 font-normal">
                    {" "}
                    — {appt.subservice}
                  </span>
                )}
              </p>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusClasses}`}
            >
              {appt.status.replace("_", " ")}
            </span>
          </div>

          {appt.notes && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Notes from our team</p>
              <p className="text-sm text-gray-700">{appt.notes}</p>
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">
            Schedule & Location
          </h3>
          <div className="space-y-2.5">
            {appt.preferredDate && (
              <div className="flex items-center gap-2.5 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-700">
                  {formatDate(appt.preferredDate.toISOString())}
                </span>
              </div>
            )}
            {appt.preferredTime && (
              <div className="flex items-center gap-2.5 text-sm">
                <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-700">{appt.preferredTime}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-sm">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-gray-700">
                {appt.address}, {appt.city}
              </span>
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">
            Contact Information
          </h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <a
                href={`tel:${appt.phone}`}
                className="text-gray-700 hover:text-[#F7921A] transition-colors"
              >
                {appt.phone}
              </a>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              <a
                href={`mailto:${appt.email}`}
                className="text-gray-700 hover:text-[#F7921A] transition-colors"
              >
                {appt.email}
              </a>
            </div>
          </div>
        </div>

        {/* Description */}
        {appt.description && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Description</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {appt.description}
            </p>
          </div>
        )}

        {/* Photos */}
        {appt.photos && appt.photos.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900">
                Photos ({appt.photos.length})
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {appt.photos.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-24 object-cover rounded-lg hover:opacity-90 transition-opacity"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Invoice */}
        {appt.invoice && (
          <InvoiceDownload
            invoice={{
              ...appt.invoice,
              createdAt: appt.invoice.createdAt.toISOString(),
            }}
          />
        )}

        <div className="text-center py-2">
          <p className="text-xs text-gray-400">
            Booked on {formatDate(appt.createdAt.toISOString())}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Questions?{" "}
            <a
              href="tel:+19106858042"
              className="text-[#F7921A] hover:underline"
            >
              Call us: +1 (910) 685-8042
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
