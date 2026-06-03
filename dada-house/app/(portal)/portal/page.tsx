import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Calendar, FileText, ShieldCheck, Clock, ReceiptText } from "lucide-react";
import { ExpenseChart } from "@/components/portal/expense-chart";

export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [activeAppointments, unpaidInvoices, warranties, recentHistory, recentExpenses] = await Promise.all([
    db.appointment.findMany({
      where: { userId: session.user.id, status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] } },
      orderBy: { preferredDate: "asc" },
      take: 3,
    }),
    db.invoice.findMany({
      where: { status: { in: ["DRAFT", "SENT"] }, appointment: { userId: session.user.id } },
      include: { appointment: { select: { service: true, appointmentNumber: true } } },
      take: 3,
    }),
    db.warranty.findMany({
      where: { userId: session.user.id, expiresAt: { gte: new Date() } },
      orderBy: { expiresAt: "asc" },
      take: 3,
    }),
    db.maintenanceLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    db.expense.findMany({
      where: { userId: session.user.id, date: { gte: sixMonthsAgo } },
      select: { amount: true, date: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  // Build monthly expense chart data (last 6 months)
  const monthMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
    monthMap[key] = 0;
  }
  for (const e of recentExpenses) {
    const key = new Date(e.date).toLocaleString("en-US", { month: "short", year: "2-digit" });
    if (key in monthMap) monthMap[key] += e.amount;
  }
  const expenseChartData = Object.entries(monthMap).map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }));
  const totalExpenses = recentExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.user.name?.split(" ")[0] ?? "Customer"} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Here's your home services overview</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-500">Active Jobs</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{activeAppointments.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm text-gray-500">Unpaid</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalUnpaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-500">Active Warranties</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{warranties.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-500">Service Records</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{recentHistory.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <ReceiptText className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-sm text-gray-500">Expenses (6mo)</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      {/* Expense chart */}
      <ExpenseChart data={expenseChartData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Appointments */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Active Appointments</h3>
            <Link href="/portal/appointments" className="text-sm text-[#F7921A] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {activeAppointments.map((appt) => (
              <Link key={appt.id} href={`/portal/appointments/${appt.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{appt.service}</p>
                  <p className="text-xs text-gray-500">{appt.appointmentNumber} · {appt.preferredDate ? formatDate(appt.preferredDate) : "Date TBD"}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(appt.status)}`}>
                  {appt.status.replace("_", " ")}
                </span>
              </Link>
            ))}
            {activeAppointments.length === 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-gray-400 text-sm mb-3">No active appointments</p>
                <Link href="/booking" className="text-sm text-[#F7921A] hover:underline font-medium">Book a service →</Link>
              </div>
            )}
          </div>
        </div>

        {/* Unpaid Invoices */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Outstanding Invoices</h3>
            <Link href="/portal/invoices" className="text-sm text-[#F7921A] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {unpaidInvoices.map((inv) => (
              <Link key={inv.id} href={`/portal/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{inv.appointment.service}</p>
                  <p className="text-xs text-gray-500">{inv.appointment.appointmentNumber}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(inv.amount)}</span>
              </Link>
            ))}
            {unpaidInvoices.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No outstanding invoices</div>
            )}
          </div>
        </div>
      </div>

      {/* Emergency contact banner */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-red-800">24/7 Emergency Service</p>
          <p className="text-sm text-red-600">We're always here when you need us most</p>
        </div>
        <a href="tel:8326264398" className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
          Call 832-626-4398
        </a>
      </div>
    </div>
  );
}
