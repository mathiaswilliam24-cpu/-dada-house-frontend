import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";
import { TrendingUp, DollarSign, Users, Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const now = new Date();

  const monthly = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const d = subMonths(now, 11 - i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const [invoiceRev, orderRev, apptCount] = await Promise.all([
        db.invoice.aggregate({ where: { status: "PAID", paidAt: { gte: start, lte: end } }, _sum: { amount: true } }),
        db.order.aggregate({ where: { status: { not: "CANCELLED" }, createdAt: { gte: start, lte: end } }, _sum: { total: true } }),
        db.appointment.count({ where: { createdAt: { gte: start, lte: end } } }),
      ]);
      return {
        month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
        revenue: (invoiceRev._sum.amount ?? 0) + (orderRev._sum.total ?? 0),
        appointments: apptCount,
      };
    })
  );

  const techPerf = await db.user.findMany({
    where: { role: "TECHNICIAN" },
    include: {
      technicianAppointments: {
        select: { techStatus: true, totalAmount: true },
      },
    },
  });

  const totalRevenue = monthly.reduce((s, m) => s + m.revenue, 0);
  const maxRevenue = Math.max(...monthly.map(m => m.revenue), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm mt-0.5">12-month revenue and performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "12-Month Revenue", value: formatCurrency(totalRevenue), icon: DollarSign, color: "text-green-600 bg-green-50" },
          { label: "Active Technicians", value: techPerf.length.toString(), icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "Total Appointments", value: monthly.reduce((s, m) => s + m.appointments, 0).toString(), icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
          { label: "Avg Monthly Revenue", value: formatCurrency(totalRevenue / 12), icon: Star, color: "text-orange-600 bg-orange-50" },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-5">Monthly Revenue — Last 12 Months</h3>
        <div className="flex items-end gap-1.5 h-40">
          {monthly.map((m) => {
            const pct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative flex-1 flex items-end">
                  <div
                    className="w-full bg-[#1B3FA8] rounded-t hover:bg-[#163291] transition-colors"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                    title={formatCurrency(m.revenue)}
                  />
                </div>
                <span className="text-[9px] text-gray-400 rotate-45 origin-left translate-x-1 whitespace-nowrap">{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Technician Performance</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Technician</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Total Jobs</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Completed</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Completion %</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {techPerf.map(tech => {
              const total = tech.technicianAppointments.length;
              const completed = tech.technicianAppointments.filter(a => a.techStatus === "COMPLETED").length;
              const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
              const revenue = tech.technicianAppointments.reduce((s, a) => s + (a.totalAmount ?? 0), 0);
              return (
                <tr key={tech.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#1B3FA8] rounded-full flex items-center justify-center text-white text-xs font-bold">{tech.name?.[0] ?? "T"}</div>
                      <p className="font-medium text-gray-900 text-sm">{tech.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm text-gray-600">{total}</td>
                  <td className="px-5 py-3.5 text-right text-sm text-gray-600">{completed}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rate >= 80 ? "bg-green-50 text-green-700" : rate >= 50 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-600"}`}>
                      {rate}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-sm text-gray-900">{formatCurrency(revenue)}</td>
                </tr>
              );
            })}
            {techPerf.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-sm">No technicians found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
