"use client";

import Link from "next/link";
import { Calendar, MapPin, Clock, FileText, ChevronRight } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";

interface Invoice {
  id: string;
  amount: number;
  status: string;
  pdfUrl: string | null;
  createdAt: string;
}

interface Appointment {
  id: string;
  appointmentNumber: string;
  service: string;
  subservice: string | null;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  preferredDate: string | null;
  preferredTime: string | null;
  status: string;
  description: string | null;
  createdAt: string;
  invoice: Invoice | null;
}

export function AppointmentCard({ appt }: { appt: Appointment }) {
  const statusClasses = getStatusColor(appt.status);

  return (
    <Link
      href={`/dashboard/appointments/${appt.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-[#F7921A] hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-gray-500">
              #{appt.appointmentNumber}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses}`}
            >
              {appt.status.replace("_", " ")}
            </span>
            {appt.invoice && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  appt.invoice.status === "PAID"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                <FileText className="w-3 h-3" />
                Invoice {appt.invoice.status}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
            {appt.service}
            {appt.subservice && (
              <span className="text-gray-500 font-normal">
                {" "}
                — {appt.subservice}
              </span>
            )}
          </h3>
          <div className="mt-2 space-y-1">
            {appt.preferredDate && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {formatDate(appt.preferredDate)}
                {appt.preferredTime && (
                  <span className="flex items-center gap-1 ml-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {appt.preferredTime}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              {appt.address}, {appt.city}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {appt.invoice && (
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(appt.invoice.amount)}
            </span>
          )}
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#F7921A] transition-colors" />
        </div>
      </div>
    </Link>
  );
}
