import { db } from "@/lib/db";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft, Mail, Phone, Calendar, MapPin,
  FileText, Star, Package, Home, CreditCard,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { createdAt: "desc" },
        include: {
          invoice: { select: { amount: true, status: true, paidAt: true } },
          technician: { select: { name: true } },
        },
      },
      reviews: { orderBy: { createdAt: "desc" } },
      properties: { orderBy: { createdAt: "desc" } },
      servicePlans: {
        include: { plan: { select: { name: true, price: true, interval: true } } },
        orderBy: { createdAt: "desc" },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
        take: 10,
      },
    },
  });

  if (!user) notFound();

  const totalSpent = user.appointments
    .filter(a => a.invoice?.status === "PAID")
    .reduce((s, a) => s + (a.invoice?.amount ?? 0), 0);

  const completedJobs = user.appointments.filter(a => a.status === "COMPLETED").length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#1B3FA8] flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-white">
            {(user.name ?? user.email)[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{user.name ?? "(No name)"}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
            <span className="flex items-center gap-1.5 text-sm text-gray-500">
              <Mail className="w-3.5 h-3.5" /> {user.email}
            </span>
            {user.phone && (
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Phone className="w-3.5 h-3.5" /> {user.phone}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-sm text-gray-500">
              <Calendar className="w-3.5 h-3.5" /> Joined {formatDate(user.createdAt.toISOString())}
            </span>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <div className="text-center px-4 py-2 bg-blue-50 rounded-xl">
            <p className="text-xl font-bold text-blue-700">{user.appointments.length}</p>
            <p className="text-xs text-blue-500">Appointments</p>
          </div>
          <div className="text-center px-4 py-2 bg-green-50 rounded-xl">
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalSpent)}</p>
            <p className="text-xs text-green-500">Total Spent</p>
          </div>
          <div className="text-center px-4 py-2 bg-orange-50 rounded-xl">
            <p className="text-xl font-bold text-orange-700">{completedJobs}</p>
            <p className="text-xs text-orange-500">Completed</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Appointments */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1B3FA8]" /> Appointments ({user.appointments.length})
              </h2>
              <Link
                href={`/admin/appointments?q=${encodeURIComponent(user.email)}`}
                className="text-xs text-[#F7921A] hover:underline"
              >
                View in Appointments
              </Link>
            </div>
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {user.appointments.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No appointments yet</div>
              ) : (
                user.appointments.slice(0, 20).map(appt => (
                  <div key={appt.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{appt.service}</p>
                        {appt.subservice && <span className="text-xs text-gray-400">· {appt.subservice}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-400 font-mono">{appt.appointmentNumber}</span>
                        {appt.technician && (
                          <span className="text-xs text-blue-600">{appt.technician.name}</span>
                        )}
                        <span className="text-xs text-gray-400">{formatDate(appt.createdAt.toISOString())}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {appt.invoice && (
                        <span className="text-xs font-semibold text-gray-700">
                          {formatCurrency(appt.invoice.amount)}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(appt.status)}`}>
                        {appt.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1B3FA8]" /> Invoices
              </h2>
            </div>
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {user.appointments.filter(a => a.invoice).length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">No invoices</div>
              ) : (
                user.appointments
                  .filter(a => a.invoice)
                  .map(appt => (
                    <div key={appt.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{appt.service}</p>
                        <p className="text-xs text-gray-400">{formatDate(appt.createdAt.toISOString())}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          {formatCurrency(appt.invoice!.amount)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          appt.invoice!.status === "PAID"
                            ? "text-green-700 bg-green-50"
                            : appt.invoice!.status === "SENT"
                            ? "text-blue-700 bg-blue-50"
                            : "text-gray-600 bg-gray-50"
                        }`}>
                          {appt.invoice!.status}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Orders */}
          {user.orders.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-5 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#1B3FA8]" /> Store Orders ({user.orders.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {user.orders.map(order => (
                  <div key={order.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 font-mono">{order.orderNumber}</p>
                      <p className="text-xs text-gray-400">{order.items.length} item(s) · {formatDate(order.createdAt.toISOString())}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{formatCurrency(order.total)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 font-medium">
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Properties */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Home className="w-4 h-4 text-[#1B3FA8]" /> Properties ({user.properties.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {user.properties.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs">No properties registered</div>
              ) : (
                user.properties.map(prop => (
                  <div key={prop.id} className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-900">{prop.address}</p>
                    <p className="text-xs text-gray-500">{prop.city}, TX {prop.zipCode}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs text-gray-400">{prop.type}</span>
                      {prop.sqft && <span className="text-xs text-gray-400">· {prop.sqft.toLocaleString()} sqft</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Service Plans */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#1B3FA8]" /> Service Plans
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {user.servicePlans.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs">No active subscriptions</div>
              ) : (
                user.servicePlans.map(sp => (
                  <div key={sp.id} className="px-5 py-3.5">
                    <p className="text-sm font-medium text-gray-900">{sp.plan.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(sp.plan.price)}/{sp.plan.interval}
                    </p>
                    <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                      sp.status === "ACTIVE" ? "text-green-700 bg-green-50" : "text-gray-600 bg-gray-50"
                    }`}>
                      {sp.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-[#1B3FA8]" /> Reviews ({user.reviews.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {user.reviews.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs">No reviews submitted</div>
              ) : (
                user.reviews.map(rev => (
                  <div key={rev.id} className="px-5 py-3.5">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < rev.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-700 line-clamp-2">{rev.content}</p>
                    <p className="text-xs text-gray-400 mt-1">{rev.service} · {formatDate(rev.createdAt.toISOString())}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
