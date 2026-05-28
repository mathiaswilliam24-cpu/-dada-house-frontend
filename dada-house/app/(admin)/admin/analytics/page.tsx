import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { BarChart3, TrendingUp, DollarSign, Users, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalRevenue, monthRevenue, lastMonthRevenue,
    totalAppts, monthAppts, totalCustomers,
    serviceBreakdown, monthlyRevenue,
  ] = await Promise.all([
    db.invoice.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    db.invoice.aggregate({ where: { status: "PAID", paidAt: { gte: thisMonthStart } }, _sum: { amount: true } }),
    db.invoice.aggregate({ where: { status: "PAID", paidAt: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { amount: true } }),
    db.appointment.count(),
    db.appointment.count({ where: { createdAt: { gte: thisMonthStart } } }),
    db.user.count({ where: { role: "CLIENT" } }),
    db.appointment.groupBy({ by: ["service"], _count: { service: true }, _sum: { totalAmount: true }, orderBy: { _count: { service: "desc" } }, take: 6 }),
    Promise.all(Array.from({ length: 6 }, async (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const [count, revenue] = await Promise.all([
        db.appointment.count({ where: { createdAt: { gte: start, lte: end } } }),
        db.invoice.aggregate({ where: { status: "PAID", paidAt: { gte: start, lte: end } }, _sum: { amount: true } }),
      ]);
      return { month: start.toLocaleString("en-US", { month: "short" }), count, revenue: revenue._sum.amount ?? 0 };
    })),
  ]);

  const thisM = monthRevenue._sum.amount ?? 0;
  const lastM = lastMonthRevenue._sum.amount ?? 0;
  const revChange = lastM > 0 ? ((thisM - lastM) / lastM * 100).toFixed(1) : "0";

  const stats = [
    { label: "Total Revenue", value: formatCurrency(totalRevenue._sum.amount ?? 0), icon: DollarSign, color: "text-green-600 bg-green-50" },
    { label: "This Month", value: formatCurrency(thisM), sub: `${revChange}% vs last month`, icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
    { label: "Total Customers", value: totalCustomers.toString(), icon: Users, color: "text-purple-600 bg-purple-50" },
    { label: "Appointments", value: totalAppts.toString(), sub: `${monthAppts} this month`, icon: Calendar, color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">Business performance overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            {s.sub && <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      <RevenueChart data={monthlyRevenue} />

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Revenue by Service</h3>
        <div className="space-y-3">
          {serviceBreakdown.map(s => {
            const total = totalRevenue._sum.amount ?? 1;
            const sRev = s._sum.totalAmount ?? 0;
            const pct = total > 0 ? Math.round((sRev / total) * 100) : 0;
            return (
              <div key={s.service}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{s.service}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">{s._count.service} jobs</span>
                    <span className="font-semibold text-gray-900">{pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1B3FA8] rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}