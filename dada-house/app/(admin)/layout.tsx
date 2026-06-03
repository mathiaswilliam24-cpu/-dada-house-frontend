import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, Calendar, Users, Star, Settings, Home, LogOut,
  Images, HardHat, Map, BarChart3, ShoppingBag, FileText, Radio,
  Package, Layers, TrendingUp, MessageCircle, Bell, Shield,
  FolderOpen, ReceiptText, ClipboardList, Monitor,
} from "lucide-react";
import { signOut } from "@/auth";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> };
type NavGroup = { label: string | null; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { href: "/admin/appointments", label: "Appointments", icon: Calendar },
      { href: "/admin/dispatch", label: "Dispatch Board", icon: Radio },
      { href: "/admin/map", label: "Live Map", icon: Map },
    ],
  },
  {
    label: "CUSTOMERS",
    items: [
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/users", label: "Users & Roles", icon: Shield },
    ],
  },
  {
    label: "FIELD",
    items: [
      { href: "/admin/technicians", label: "Technicians", icon: HardHat },
      { href: "/admin/invoices", label: "Invoices", icon: ReceiptText },
      { href: "/admin/estimates", label: "Estimates", icon: ClipboardList },
    ],
  },
  {
    label: "COMMERCE",
    items: [
      { href: "/admin/store", label: "Products", icon: ShoppingBag },
      { href: "/admin/orders", label: "Orders", icon: Package },
      { href: "/admin/service-plans", label: "Service Plans", icon: Layers },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/admin/reports", label: "Reports", icon: TrendingUp },
      { href: "/admin/ai-conversations", label: "AI Assistant", icon: MessageCircle },
    ],
  },
  {
    label: "CONTENT",
    items: [
      { href: "/admin/site-content", label: "Site Content", icon: Monitor },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
      { href: "/admin/gallery", label: "Gallery", icon: Images },
      { href: "/admin/media", label: "Media & Docs", icon: FolderOpen },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/push-notifications", label: "Push Alerts", icon: Bell },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const allItems = navGroups.flatMap((g) => g.items);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Sidebar ── */}
      <aside className="w-56 bg-[#0F2A7A] text-white flex flex-col shrink-0 fixed inset-y-0 left-0 z-30 hidden lg:flex">
        {/* Logo */}
        <div className="p-4 border-b border-white/10 shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo dada house.png"
              alt="DADA HOUSE"
              width={110}
              height={38}
              className="h-9 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5 scrollbar-thin">
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "pt-3" : ""}>
              {group.label && (
                <p className="px-2 pb-1.5 text-[10px] font-bold tracking-widest text-white/30 uppercase">
                  {group.label}
                </p>
              )}
              {group.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
            <div className="w-7 h-7 rounded-full bg-[#F7921A] flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">
                {(session.user.name ?? session.user.email ?? "A")[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-white font-medium truncate">
                {session.user.name ?? session.user.email}
              </p>
              <p className="text-[10px] text-orange-400">Administrator</p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-2 px-2.5 py-2 w-full rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#0F2A7A] text-white px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#F7921A] rounded flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">
            <span className="text-white">DADA </span>
            <span className="text-[#F7921A]">ADMIN</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {allItems.slice(0, 5).map(({ href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Icon size={18} />
            </Link>
          ))}
        </nav>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 lg:ml-56 min-w-0 min-h-screen">
        <div className="pt-14 lg:pt-0">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
