import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import LocationTracker from "@/components/technician/location-tracker";
import { PageTransition } from "@/components/layout/page-transition";
import TechnicianNav from "@/components/technician/technician-nav";
import ClockInScreen from "@/components/technician/clock-in-screen";

export const dynamic = "force-dynamic";

export default async function TechnicianLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/login?callbackUrl=/technician");
  if (session.user.role !== "TECHNICIAN" && session.user.role !== "ADMIN") redirect("/");

  if (session.user.role === "TECHNICIAN") {
    const lastClock = await db.technicianClockEntry.findFirst({
      where: { userId: session.user.id },
      orderBy: { timestamp: "desc" },
    });
    if (lastClock?.type !== "IN") {
      return <ClockInScreen userName={session.user.name} />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Top header */}
      <header className="bg-[#1B3FA8] text-white px-4 py-3 flex items-center justify-between safe-area-pt">
        <div>
          <p className="font-bold text-sm">DADA HOUSE</p>
          <p className="text-xs text-blue-200">Technician App</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-blue-200">Welcome back</p>
          <p className="text-sm font-medium truncate max-w-32">{session.user.name ?? "Technician"}</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-4">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Bottom navigation */}
      <TechnicianNav />

      <LocationTracker />
    </div>
  );
}
