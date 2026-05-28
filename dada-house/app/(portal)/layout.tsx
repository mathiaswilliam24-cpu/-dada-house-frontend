import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Calendar,
  FileText,
  History,
  Home,
  ShieldCheck,
  Bot,
  ShoppingBag,
  Package,
  User,
  LogOut,
} from "lucide-react";
import { signOut } from "@/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PageTransition } from "@/components/layout/page-transition";

const navItems = [
  { href: "/portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portal/appointments", label: "Appointments", icon: Calendar },
  { href: "/portal/invoices", label: "Invoices", icon: FileText },
  { href: "/portal/history", label: "Service History", icon: History },
  { href: "/portal/properties", label: "My Properties", icon: Home },
  { href: "/portal/warranties", label: "Warranties", icon: ShieldCheck },
  { href: "/portal/ai-assist", label: "AI Assistant", icon: Bot },
  { href: "/store", label: "Shop", icon: ShoppingBag },
  { href: "/portal/orders", label: "My Orders", icon: Package },
  { href: "/portal/profile", label: "Profile", icon: User },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/portal");
  if (session.user.role === "TECHNICIAN") redirect("/technician");
  if (session.user.role === "DISPATCHER") redirect("/dispatcher");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-60 bg-[#0D1D5E] text-white flex flex-col shrink-0 fixed inset-y-0 left-0 z-30 hidden lg:flex">
        <div className="p-5 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo dada house.png" alt="DADA HOUSE" width={120} height={42} className="h-10 w-auto object-contain" />
          </Link>
          <p className="text-xs text-blue-300 mt-1 font-medium">Customer Portal</p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2 mb-1 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 truncate">{session.user.name ?? session.user.email}</p>
              <p className="text-xs text-[#F7921A] font-medium">Customer</p>
            </div>
            <ThemeToggle />
          </div>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button type="submit" className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <LogOut size={16} />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#0D1D5E] text-white px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-sm">
          <span className="text-white">DADA </span>
          <span className="text-[#F7921A]">PORTAL</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.slice(0, 5).map(({ href, icon: Icon }) => (
            <Link key={href} href={href} className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <Icon size={18} />
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 lg:ml-60 min-w-0 min-h-screen">
        <div className="pt-14 lg:pt-0">
          <div className="p-4 sm:p-6 lg:p-8">
            <PageTransition>{children}</PageTransition>
          </div>
        </div>
      </main>
    </div>
  );
}
