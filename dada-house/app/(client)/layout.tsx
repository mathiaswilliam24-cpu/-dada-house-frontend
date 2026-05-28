import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import Image from "next/image";
import { Calendar, User, LogOut, ChevronRight, Receipt } from "lucide-react";
import { signOut } from "@/auth";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard");
  }
  if (session.user.role === "ADMIN") redirect("/admin");
  if (session.user.role === "TECHNICIAN") redirect("/technician");
  if (session.user.role === "DISPATCHER") redirect("/dispatcher");

  return (
    <div className="bg-gray-50">
      {/* Top nav */}
      <header className="bg-[#1B3FA8] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/">
                <Image
                  src="/logo dada house.png"
                  alt="DADA HOUSE"
                  width={110}
                  height={38}
                  className="h-9 w-auto object-contain"
                />
              </Link>
              <span className="text-gray-400 text-xs hidden sm:block">
                Client Portal
              </span>
            </div>

            <nav className="flex items-center gap-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Appointments</span>
              </Link>
              <Link
                href="/dashboard/invoices"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">Invoices</span>
              </Link>
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </form>
            </nav>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span className="text-gray-900 font-medium">
              {session.user.name ?? session.user.email}
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Client Dashboard</span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
