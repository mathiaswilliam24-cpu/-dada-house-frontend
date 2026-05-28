import { db } from "@/lib/db";
import { AppointmentActions } from "@/components/admin/appointment-actions";
import { AppointmentFilters } from "@/components/admin/appointment-filters";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

const SERVICES = ["Plumbing", "Air Conditioning", "Heating", "Remodeling"];
const STATUSES = ["ALL", "PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string; status?: string; q?: string;
    service?: string; technicianId?: string; from?: string; to?: string;
  }>;
}) {
  const { page: pageParam, status: statusFilter, q, service, technicianId, from, to } =
    await searchParams;

  const page  = parseInt(pageParam ?? "1");
  const limit = 15;
  const skip  = (page - 1) * limit;

  const technicians = await db.user.findMany({
    where: { role: "TECHNICIAN" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const where: Record<string, unknown> = {};
  if (statusFilter && statusFilter !== "ALL") where.status = statusFilter;
  if (service && service !== "ALL")           where.service = service;
  if (technicianId && technicianId !== "ALL")
    where.technicianId = technicianId === "UNASSIGNED" ? null : technicianId;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) }               : {}),
      ...(to   ? { lte: new Date(to + "T23:59:59") }  : {}),
    };
  }
  if (q) {
    where.OR = [
      { name:              { contains: q, mode: "insensitive" } },
      { email:             { contains: q, mode: "insensitive" } },
      { appointmentNumber: { contains: q, mode: "insensitive" } },
      { phone:             { contains: q } },
    ];
  }

  const [appointments, total] = await Promise.all([
    db.appointment.findMany({
      where,
      include: {
        invoice:    true,
        technician: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    db.appointment.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Build stable URL helper for pagination / status tabs (server-side)
  function pageUrl(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (q)            base.q            = q;
    if (statusFilter) base.status       = statusFilter;
    if (service)      base.service      = service;
    if (technicianId) base.technicianId = technicianId;
    if (from)         base.from         = from;
    if (to)           base.to           = to;
    const merged  = { ...base, ...overrides };
    const entries = Object.entries(merged).filter((e): e is [string, string] => Boolean(e[1]));
    return "/admin/appointments?" + new URLSearchParams(entries).toString();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {total} appointment{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/booking"
          className="px-4 py-2 bg-[#F7921A] text-white rounded-xl text-sm font-semibold hover:bg-[#e07e10] transition-colors"
        >
          + New Appointment
        </Link>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        {/* Row 1: Search + Status tabs */}
        <div className="flex flex-wrap gap-3 items-center">
          <form className="flex-1 min-w-[200px] relative">
            {statusFilter && <input type="hidden" name="status"      value={statusFilter} />}
            {service      && <input type="hidden" name="service"     value={service} />}
            {technicianId && <input type="hidden" name="technicianId"value={technicianId} />}
            {from         && <input type="hidden" name="from"        value={from} />}
            {to           && <input type="hidden" name="to"          value={to} />}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search name, email, phone, #..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F7921A]/30 focus:border-[#F7921A]"
            />
          </form>
          <div className="flex gap-1 flex-wrap">
            {STATUSES.map(s => (
              <Link
                key={s}
                href={pageUrl({ status: s !== "ALL" ? s : undefined, page: "1" })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  (statusFilter ?? "ALL") === s
                    ? "bg-[#1B3FA8] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s.replace("_", " ")}
              </Link>
            ))}
          </div>
        </div>

        {/* Row 2: Service / Technician / Date — Client Component */}
        <Suspense fallback={null}>
          <AppointmentFilters
            technicians={technicians}
            services={SERVICES}
            currentService={service}
            currentTechnicianId={technicianId}
            currentFrom={from}
            currentTo={to}
            currentStatus={statusFilter}
            currentQ={q}
          />
        </Suspense>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Service</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Technician</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Invoice</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointments.map(appt => (
                <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/admin/appointments/${appt.id}`}
                      className="text-[#1B3FA8] hover:underline"
                    >
                      {appt.appointmentNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{appt.name}</p>
                    <p className="text-xs text-gray-500">{appt.phone}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-700">
                    {appt.service}
                    {appt.subservice && (
                      <span className="text-gray-400"> · {appt.subservice}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                    {appt.preferredDate
                      ? formatDate(appt.preferredDate.toISOString())
                      : formatDate(appt.createdAt.toISOString())}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appt.status)}`}>
                      {appt.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs">
                    {appt.technician ? (
                      <span className="text-blue-600 font-medium">{appt.technician.name}</span>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs">
                    {appt.invoice ? (
                      <span className="text-green-600 font-medium">
                        ${appt.invoice.amount.toFixed(2)}
                        <span className={`ml-1 text-[10px] ${appt.invoice.status === "PAID" ? "text-green-500" : "text-gray-400"}`}>
                          {appt.invoice.status}
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end">
                      <AppointmentActions
                        id={appt.id}
                        currentStatus={appt.status}
                        currentNotes={appt.notes}
                        currentTechnicianId={appt.technicianId}
                        invoiceAmount={appt.invoice?.amount}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No appointments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-1.5">
              {page > 1 && (
                <Link href={pageUrl({ page: String(page - 1) })}
                  className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200">
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={pageUrl({ page: String(page + 1) })}
                  className="px-3 py-1.5 text-xs bg-[#1B3FA8] text-white rounded-lg hover:bg-[#1B3FA8]/90">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
