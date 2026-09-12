import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import Image from "next/image";
import { PhoneCall, Phone, MessageSquare, Contact, LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { AgentStatusControl } from "@/components/call-center/agent-status-control";
import { Softphone } from "@/components/call-center/softphone";

const CALL_CENTER_ROLES = ["SUPER_ADMIN", "MANAGER", "CUSTOMER_SERVICE_REP", "ADMIN", "DISPATCHER"];

const navItems = [
  { href: "/call-center", label: "Live Call Center", icon: PhoneCall },
  { href: "/calls", label: "Call History", icon: Phone },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/customers", label: "Customers", icon: Contact },
];

export default async function CallCenterLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/call-center");
  if (!CALL_CENTER_ROLES.includes(session.user.role)) redirect("/");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-[#0D1D5E] text-white flex flex-col shrink-0 fixed inset-y-0 left-0 z-30 hidden lg:flex">
        <div className="p-4 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo dada house.png" alt="DADA HOUSE" width={100} height={36} className="h-8 w-auto" />
          </Link>
          <p className="text-xs text-blue-300 mt-1 font-medium">Call Center</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-gray-300 hover:text-white hover:bg-white/10">
              <Icon size={18} className="shrink-0" />{label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-2">
          <AgentStatusControl />
          <p className="text-xs text-gray-400 px-3 py-1 truncate">{session.user.name ?? session.user.email}</p>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button type="submit" className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors">
              <LogOut size={16} />Sign Out
            </button>
          </form>
        </div>
      </aside>
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#0D1D5E] text-white px-4 h-14 flex items-center justify-between gap-2">
        <span className="font-bold text-sm text-[#F7921A] shrink-0">CALL CENTER</span>
        <div className="flex items-center gap-2 min-w-0">
          <AgentStatusControl compact />
          <nav className="flex gap-1 items-center shrink-0">
            {navItems.map(({ href, icon: Icon }) => (
              <Link key={href} href={href} className="p-2 rounded-lg transition-colors text-gray-300 hover:text-white hover:bg-white/10"><Icon size={18} /></Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 lg:ml-56 min-w-0">
        <div className="pt-14 lg:pt-0 p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
      <Softphone />
    </div>
  );
}
