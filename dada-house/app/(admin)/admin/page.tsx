import { db } from "@/lib/db";
import { StatsCards } from "@/components/admin/stats-cards";
import { AppointmentsChart } from "@/components/admin/appointments-chart";
import { ServicePieChart } from "@/components/admin/service-pie-chart";
import { formatDate, getStatusColor, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  Calendar, Users, HardHat, Radio, FileText, ShoppingBag, BarChart3,
  MessageCircle, Bell, Star, Images, FolderOpen, Shield, Package,
  Map, TrendingUp, Layers, Settings, ChevronRight, AlertCircle, PhoneCall,
} from "lucide-react";

export const dynamic = "force-dynamic";

const modules = [
  {
    section: "OPERATIONS",
    color: "border-blue-200 bg-blue-50",
    iconColor: "text-blue-600",
    items: [
      { label: "Appointments",  href: "/admin/appointments", icon: Calendar,    desc: "View, create, filter" },
      { label: "Dispatch Board",href: "/admin/dispatch",     icon: Radio,       desc: "Assign & schedule jobs" },
      { label: "Live Map",      href: "/admin/map",          icon: Map,         desc: "Technician GPS tracking" },
    ],
  },
  {
    section: "CUSTOMERS",
    color: "border-purple-200 bg-purple-50",
    iconColor: "text-purple-600",
    items: [
      { label: "Customers",    href: "/admin/customers", icon: Users,   desc: "Profiles & service history" },
      { label: "Users & Roles",href: "/admin/users",     icon: Shield,  desc: "RBAC — manage all accounts" },
    ],
  },
  {
    section: "FIELD",
    color: "border-orange-200 bg-orange-50",
    iconColor: "text-orange-600",
    items: [
      { label: "Technicians",        href: "/admin/technicians", icon: HardHat,  desc: "Team roster & profiles" },
      { label: "Invoices & Estimates",href: "/admin/invoices",   icon: FileText, desc: "Create, send, mark paid" },
    ],
  },
  {
    section: "COMMERCE",
    color: "border-green-200 bg-green-50",
    iconColor: "text-green-600",
    items: [
      { label: "Products",      href: "/admin/store",          icon: ShoppingBag, desc: "Inventory management" },
      { label: "Orders",        href: "/admin/orders",         icon: Package,     desc: "Customer purchases" },
      { label: "Service Plans", href: "/admin/service-plans",  icon: Layers,      desc: "Subscriptions" },
    ],
  },
  {
    section: "INTELLIGENCE",
    color: "border-indigo-200 bg-indigo-50",
    iconColor: "text-indigo-600",
    items: [
      { label: "Analytics",    href: "/admin/analytics",       icon: BarChart3,    desc: "Revenue & performance" },
      { label: "Reports",      href: "/admin/reports",         icon: TrendingUp,   desc: "Monthly breakdowns" },
      { label: "AI Assistant", href: "/admin/ai-conversations",icon: MessageCircle,desc: "AI chats & tickets" },
      { label: "Voice Agent",  href: "https://frontend-tau-rose-16.vercel.app", icon: PhoneCall, desc: "AI call logs & appointments", external: true },
    ],
  },
  {
    section: "CONTENT",
    color: "border-pink-200 bg-pink-50",
    iconColor: "text-pink-600",
    items: [
      { label: "Reviews",    href: "/admin/reviews", icon: Star,       desc: "Moderation queue" },
      { label: "Gallery",    href: "/admin/gallery", icon: Images,     desc: "Portfolio projects" },
      { label: "Media & Docs",href: "/admin/media",  icon: FolderOpen, desc: "All uploaded files" },
    ],
  },
  {
    section: "SYSTEM",
    color: "border-gray-200 bg-gray-50",
    iconColor: "text-gray-600",
    items: [
      { label: "Notifications", href: "/admin/notifications",      icon: Bell,     desc: "SMS & email logs" },
      { label: "Push Alerts",   href: "/admin/push-notifications", icon: Bell,     desc: "Broadcast push" },
      { label: "Settings",      href: "/admin/settings",           icon: Settings, desc: "Business configuration" },
    ],
  },
];

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    total, pending, completed, thisMonth, invoiceSum,
    serviceGroups, recentAppts,
    unassigned, techCount, pendingReviews, unpaidInvoices,
  ] = await Promise.all([
    db.appointment.count(),
    db.appointment.count({ where: { status: "PENDING" } }),
    db.appointment.count({ where: { status: "COMPLETED" } }),
    db.appointment.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.invoice.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    db.appointment.groupBy({
      by: ["service"], _count: { service: true }, orderBy: { _count: { service: "desc" } },
    }),
    db.appointment.findMany({
      orderBy: { createdAt: "desc" }, take: 6,
      select: { id: true, appointmentNumber: true, name: true, service: true, status: true, createdAt: true },
    }),
    db.appointment.count({ where: { technicianId: null, status: { in: ["PENDING", "CONFIRMED"] } } }),
    db.user.count({ where: { role: "TECHNICIAN" } }),
    db.review.count({ where: { approved: false } }),
    db.invoice.count({ where: { status: { in: ["DRAFT", "SENT"] } } }),
  ]);

  const monthlyData = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const count = await db.appointment.count({ where: { createdAt: { gte: start, lte: end } } });
      return { month: start.toLocaleString("en-US", { month: "short" }), count };
    })
  );

  const stats = { total, pending, completed, thisMonth, revenue: invoiceSum._sum.amount ?? 0 };
  const serviceBreakdown = serviceGroups.map(g => ({ service: g.service, count: g._count.service }));

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">DADA HOUSE · Houston, TX</p>
      </div>

      {/* Alerts */}
      {(unassigned > 0 || pendingReviews > 0 || unpaidInvoices > 0) && (
        <div className="flex flex-wrap gap-3">
          {unassigned > 0 && (
            <Link href="/admin/dispatch" className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 hover:bg-red-100 transition-colors">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {unassigned} unassigned job{unassigned !== 1 ? "s" : ""} — Assign now
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
          {pendingReviews > 0 && (
            <Link href="/admin/reviews" className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 hover:bg-amber-100 transition-colors">
              <Star className="w-4 h-4 shrink-0" />
              {pendingReviews} review{pendingReviews !== 1 ? "s" : ""} awaiting approval
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
          {unpaidInvoices > 0 && (
            <Link href="/admin/invoices" className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700 hover:bg-orange-100 transition-colors">
              <FileText className="w-4 h-4 shrink-0" />
              {unpaidInvoices} unpaid invoice{unpaidInvoices !== 1 ? "s" : ""}
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <StatsCards data={stats} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AppointmentsChart data={monthlyData} />
        </div>
        <div>
          {serviceBreakdown.length > 0 ? (
            <ServicePieChart data={serviceBreakdown} />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5 h-full flex items-center justify-center">
              <p className="text-gray-400 text-sm">No service data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{techCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Active Technicians</p>
          <Link href="/admin/technicians" className="text-xs text-[#F7921A] hover:underline mt-1 block">Manage →</Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{unassigned}</p>
          <p className="text-xs text-gray-500 mt-0.5">Unassigned Jobs</p>
          <Link href="/admin/dispatch" className="text-xs text-[#F7921A] hover:underline mt-1 block">Dispatch →</Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{pendingReviews}</p>
          <p className="text-xs text-gray-500 mt-0.5">Reviews Pending</p>
          <Link href="/admin/reviews" className="text-xs text-[#F7921A] hover:underline mt-1 block">Moderate →</Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{unpaidInvoices}</p>
          <p className="text-xs text-gray-500 mt-0.5">Unpaid Invoices</p>
          <Link href="/admin/invoices" className="text-xs text-[#F7921A] hover:underline mt-1 block">View →</Link>
        </div>
      </div>

      {/* 11 Module Grid */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">All Modules</h2>
        <div className="space-y-4">
          {modules.map(group => (
            <div key={group.section}>
              <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">{group.section}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {group.items.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    {...('external' in item && item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`bg-white border rounded-xl p-4 hover:shadow-md transition-all group ${group.color.replace("bg-", "hover:bg-")}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${group.color}`}>
                      <item.icon className={`w-4 h-4 ${group.iconColor}`} />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-[#1B3FA8]">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Recent Appointments</h3>
          <Link href="/admin/appointments" className="text-sm text-[#F7921A] hover:underline">View all</Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentAppts.map(appt => (
            <Link
              key={appt.id}
              href={`/admin/appointments?q=${appt.appointmentNumber}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-gray-600">{appt.name[0].toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{appt.name}</p>
                  <p className="text-xs text-gray-500">{appt.service} · {formatDate(appt.createdAt.toISOString())}</p>
                </div>
              </div>
              <span className={`shrink-0 ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appt.status)}`}>
                {appt.status.replace("_", " ")}
              </span>
            </Link>
          ))}
          {recentAppts.length === 0 && (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">No appointments yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
