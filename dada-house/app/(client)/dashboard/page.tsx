import { auth } from "@/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  Calendar, Plus, Clock, CheckCircle, AlertCircle, Receipt,
  ExternalLink, Image as ImageIcon, FileText, Wrench,
} from "lucide-react";
import { getStatusColor, formatDate, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function statusLabel(s: string) {
  return s.replace("_", " ");
}

export default async function DashboardPage() {
  const session = await auth();

  const [appointments, techInvoices] = await Promise.all([
    db.appointment.findMany({
      where: { userId: session!.user.id },
      include: { invoice: { select: { id: true, amount: true, status: true, paidAt: true, lineItems: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    session!.user.email
      ? db.estimate.findMany({
          where: { isInvoice: true, clientEmail: session!.user.email, paidAt: null, sentAt: { not: null } },
          select: { id: true, estimateNumber: true, total: true, paymentToken: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const active    = appointments.filter(a => a.status !== "COMPLETED" && a.status !== "CANCELLED");
  const history   = appointments.filter(a => a.status === "COMPLETED");
  const cancelled = appointments.filter(a => a.status === "CANCELLED");

  const pending   = active.filter(a => a.status === "PENDING").length;
  const inFlight  = active.filter(a => a.status === "CONFIRMED" || a.status === "IN_PROGRESS").length;
  const unpaidTotal = techInvoices.reduce((s, i) => s + i.total, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Services</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track your appointments and service history</p>
        </div>
        <Link
          href="/booking"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7921A] text-white rounded-lg text-sm font-semibold hover:bg-[#F7921A]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Book Service</span>
        </Link>
      </div>

      {/* Unpaid invoices banner */}
      {techInvoices.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900 text-sm">
              {techInvoices.length === 1 ? "You have 1 unpaid invoice" : `You have ${techInvoices.length} unpaid invoices`}
            </p>
            <p className="text-xs text-amber-700">
              Total due: {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(unpaidTotal)}
            </p>
          </div>
          <Link href="/dashboard/invoices"
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors">
            <Receipt className="w-3.5 h-3.5" /> Pay Now
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-gray-500">Pending</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{inFlight}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Completed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{history.length}</p>
        </div>
      </div>

      {/* ── Upcoming / active ── */}
      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Upcoming & Active
          </h2>
          <div className="space-y-3">
            {active.map(appt => {
              const sc = getStatusColor(appt.status);
              return (
                <Link
                  key={appt.id}
                  href={`/dashboard/appointments/${appt.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-[#F7921A] hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-gray-400">#{appt.appointmentNumber}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${sc}`}>
                          {statusLabel(appt.status)}
                        </span>
                        {appt.invoice && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            appt.invoice.status === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                          }`}>
                            <FileText className="w-3 h-3" />
                            Invoice {appt.invoice.status}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                        {appt.service}
                        {appt.subservice && <span className="text-gray-500 font-normal"> — {appt.subservice}</span>}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {appt.preferredDate && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(appt.preferredDate.toISOString())}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <span className="text-gray-400">{appt.address}, {appt.city}</span>
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-[#F7921A] transition-colors shrink-0 mt-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Service History ── */}
      {history.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Service History
          </h2>
          <div className="space-y-3">
            {history.map(appt => {
              const isPaid = appt.invoice?.status === "PAID";
              return (
                <Link
                  key={appt.id}
                  href={`/dashboard/appointments/${appt.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-green-400 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    {/* Left color strip */}
                    <div className="w-1 self-stretch rounded-full bg-green-400 shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                          {appt.service}
                          {appt.subservice && <span className="text-gray-500 font-normal"> — {appt.subservice}</span>}
                        </h3>
                        {appt.invoice && (
                          <span className={`shrink-0 text-xs font-bold ${isPaid ? "text-green-600" : "text-amber-600"}`}>
                            {isPaid ? "PAID" : formatCurrency(appt.invoice.amount)}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {appt.preferredDate && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(appt.preferredDate.toISOString())}
                          </span>
                        )}
                        {appt.photos.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <ImageIcon className="w-3.5 h-3.5 text-[#F7921A]" />
                            {appt.photos.length} photo{appt.photos.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {appt.invoice && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <FileText className="w-3.5 h-3.5 text-[#1B3FA8]" />
                            Receipt available
                          </span>
                        )}
                        {appt.notes && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Wrench className="w-3.5 h-3.5" />
                            Work summary
                          </span>
                        )}
                      </div>
                    </div>

                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors shrink-0 mt-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Cancelled */}
      {cancelled.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Cancelled</h2>
          <div className="space-y-2">
            {cancelled.map(appt => (
              <Link key={appt.id} href={`/dashboard/appointments/${appt.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 opacity-60 hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">#{appt.appointmentNumber}</span>
                  <span className="text-sm text-gray-600">{appt.service}</span>
                  {appt.preferredDate && (
                    <span className="text-xs text-gray-400 ml-auto">{formatDate(appt.preferredDate.toISOString())}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {appointments.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700 mb-1">No appointments yet</h3>
          <p className="text-gray-500 text-sm mb-4">Book your first service with DADA HOUSE</p>
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F7921A] text-white rounded-lg text-sm font-semibold hover:bg-[#F7921A]/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Book a Service
          </Link>
        </div>
      )}
    </div>
  );
}
