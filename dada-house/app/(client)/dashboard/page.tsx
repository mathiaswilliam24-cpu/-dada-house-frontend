import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AppointmentCard } from "@/components/client/appointment-card";
import Link from "next/link";
import { Calendar, Plus, Clock, CheckCircle, AlertCircle, Receipt, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();

  const [appointments, techInvoices] = await Promise.all([
    db.appointment.findMany({
      where: { userId: session!.user.id },
      include: { invoice: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    session!.user.email
      ? db.estimate.findMany({
          where: { isInvoice: true, clientEmail: session!.user.email, paidAt: null, sentAt: { not: null } },
          select: { id: true, estimateNumber: true, total: true, paymentToken: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const pending = appointments.filter((a) => a.status === "PENDING").length;
  const confirmed = appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "IN_PROGRESS"
  ).length;
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const unpaidTotal = techInvoices.reduce((s, i) => s + i.total, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Track your service history and upcoming appointments
          </p>
        </div>
        <Link
          href="/booking"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7921A] text-white rounded-lg text-sm font-medium hover:bg-[#F7921A]/90 transition-colors"
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
          <p className="text-2xl font-bold text-gray-900">{confirmed}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500">Completed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{completed}</p>
        </div>
      </div>

      {/* Appointments list */}
      {appointments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700 mb-1">
            No appointments yet
          </h3>
          <p className="text-gray-500 text-sm mb-4">
            Book your first service with DADA HOUSE
          </p>
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F7921A] text-white rounded-lg text-sm font-semibold hover:bg-[#F7921A]/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Book a Service
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appt={{
                ...appt,
                preferredDate: appt.preferredDate?.toISOString() ?? null,
                createdAt: appt.createdAt.toISOString(),
                invoice: appt.invoice
                  ? {
                      ...appt.invoice,
                      createdAt: appt.invoice.createdAt.toISOString(),
                    }
                  : null,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
