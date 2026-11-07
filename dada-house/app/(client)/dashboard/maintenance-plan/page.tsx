import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  CheckCircle, MapPin, Thermometer, Calendar, Phone, AlertCircle,
  Clock, Shield, ArrowRight, Building2,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Maintenance Plan — My Dashboard | DADA HOUSE" };

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 border-green-200",
  PAST_DUE: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
  SENT: "bg-amber-100 text-amber-700 border-amber-200",
  PAID: "bg-blue-100 text-blue-700 border-blue-200",
};

export default async function MaintenancePlanDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  // Find the customer record linked to this user account
  const customer = await db.customer.findFirst({
    where: { userId: session.user.id },
  });

  const contracts = customer
    ? await db.maintenanceContract.findMany({
        where: {
          customerId: customer.id,
          selfEnrolled: true,
        },
        include: {
          planType: { select: { name: true } },
          properties: {
            orderBy: { createdAt: "asc" },
            include: {
              systems: { orderBy: { createdAt: "asc" } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const activeContract = contracts.find(c => c.status === "ACTIVE" || c.status === "PAID");

  // No plan — CTA
  if (!activeContract) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-5 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield size={28} className="text-slate-400" />
        </div>
        <h1 className="text-2xl font-black text-[#0A1628] mb-2">No Active Maintenance Plan</h1>
        <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto">
          Protect every HVAC system with 2 seasonal tune-ups per year, priority scheduling, and a reduced $69 service call fee.
        </p>
        <Link
          href="/hvac-maintenance-plan"
          className={cn(buttonVariants({ size: "lg" }), "gap-2 font-bold")}
        >
          View Maintenance Plans
          <ArrowRight size={16} />
        </Link>
        {contracts.length > 0 && (
          <p className="mt-6 text-xs text-slate-400">
            You have {contracts.length} past plan{contracts.length > 1 ? "s" : ""} on file.{" "}
            <a href="tel:+18449280875" className="underline">Call (844) 928-0875</a> to reactivate.
          </p>
        )}
      </div>
    );
  }

  const isAnnual = activeContract.billingInterval === "annual";
  const amount = isAnnual ? activeContract.annualTotal : activeContract.monthlyTotal;
  const isMonthlyInCommitment =
    !isAnnual &&
    activeContract.commitmentEndDate &&
    new Date(activeContract.commitmentEndDate) > new Date();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#0A1628]">HVAC Maintenance Plan</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your properties and tune-up schedule</p>
      </div>

      {/* Membership card */}
      <div className="bg-[#0A1628] rounded-2xl p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Membership Number</p>
            <p className="text-3xl font-black text-[#F7921A]">{activeContract.membershipNumber ?? "—"}</p>
          </div>
          <span className={cn(
            "self-start px-3 py-1 rounded-full text-xs font-bold border",
            STATUS_COLOR[activeContract.status] ?? "bg-slate-100 text-slate-500 border-slate-200"
          )}>
            {activeContract.status}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-700 text-sm">
          <div>
            <p className="text-slate-500 text-xs">Properties</p>
            <p className="text-white font-bold">{activeContract.properties.length}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Systems</p>
            <p className="text-white font-bold">{activeContract.numberOfSystems}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Billing</p>
            <p className="text-[#F7921A] font-bold">
              {amount ? `$${isAnnual ? amount.toFixed(0) : amount.toFixed(2)}/${isAnnual ? "yr" : "mo"}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">{isAnnual ? "Renews" : "Next charge"}</p>
            <p className="text-white font-bold text-xs">
              {activeContract.renewalDate
                ? new Date(activeContract.renewalDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Monthly commitment banner */}
      {isMonthlyInCommitment && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Clock size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-800 font-bold text-sm">12-Month Commitment Active</p>
            <p className="text-amber-700 text-xs mt-1">
              Your plan is committed through{" "}
              <strong>{new Date(activeContract.commitmentEndDate!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>.
              After that, it continues month-to-month. To discuss your plan, call{" "}
              <a href="tel:+18449280875" className="underline font-bold">(844) 928-0875</a>.
            </p>
          </div>
        </div>
      )}

      {/* Included benefits */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="font-black text-[#0A1628] mb-4 text-sm">Your Plan Includes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: CheckCircle, label: "2 Tune-Ups / Year", sub: "Spring AC + Fall Heating", color: "text-green-500" },
            { icon: Phone, label: "Priority Dispatch", sub: "Call (844) 928-0875", color: "text-[#1B3FA8]" },
            { icon: Shield, label: "$69 Service Calls", sub: "Members-only rate", color: "text-[#F7921A]" },
            { icon: CheckCircle, label: "10% Off Repairs", sub: "All HVAC labor & parts", color: "text-purple-500" },
          ].map(({ icon: Icon, label, sub, color }) => (
            <div key={label} className="text-center p-3 rounded-xl bg-slate-50">
              <Icon size={20} className={cn("mx-auto mb-2", color)} />
              <p className="text-xs font-bold text-[#0A1628]">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Properties */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-[#0A1628]">Your Properties</h2>
          <span className="text-xs text-slate-400">{activeContract.properties.length} address{activeContract.properties.length !== 1 ? "es" : ""}</span>
        </div>
        <div className="space-y-4">
          {activeContract.properties.map((prop, pi) => (
            <div key={prop.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {/* Property header */}
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F7921A]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 size={16} className="text-[#F7921A]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-[#0A1628]">{prop.nickname || `Property ${pi + 1}`}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      <MapPin size={11} className="inline mr-1" />
                      {prop.address}{prop.apt ? ` #${prop.apt}` : ""}, {prop.city}, {prop.state} {prop.zipCode}
                    </p>
                  </div>
                </div>
              </div>

              {/* Systems at this property */}
              <div className="p-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  HVAC Systems ({prop.systemCount})
                </p>
                <div className="space-y-2 mb-5">
                  {prop.systems.map((sys, si) => (
                    <div key={sys.id} className="flex items-center gap-3 text-sm">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <Thermometer size={13} className="text-[#1B3FA8]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#0A1628]">{sys.nickname || `System ${si + 1}`}</p>
                        {sys.unknownDetails ? (
                          <p className="text-slate-400 text-xs">Details TBD — tech will assess on first visit</p>
                        ) : (
                          <p className="text-slate-400 text-xs">
                            {[sys.coolingType, sys.heatingType, sys.brand].filter(Boolean).join(" · ") || "Details on file"}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Schedule request */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <a
                    href={`tel:+18449280875`}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1B3FA8] hover:bg-[#0D1D5E] text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    <Calendar size={13} />
                    Schedule Tune-Up
                  </a>
                  <a
                    href={`tel:+18449280875`}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
                  >
                    <Phone size={13} />
                    (844) 928-0875
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next steps reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <h2 className="font-black text-[#1B3FA8] mb-3 text-sm">What to Expect</h2>
        <div className="space-y-3">
          {[
            { title: "Spring Tune-Up (April–May)", desc: "AC system check, coil cleaning, refrigerant check, filter replacement." },
            { title: "Fall Tune-Up (Oct–Nov)", desc: "Heating system check, heat exchanger inspection, burner/ignition test." },
            { title: "Priority Service Year-Round", desc: "Call (844) 928-0875 for same-day or next-day service, $69 service call fee." },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#1B3FA8] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-sm text-[#0A1628]">{item.title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-black text-[#0A1628]">Questions about your plan?</p>
          <p className="text-slate-500 text-sm">Our team is available 7 days a week.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <a href="tel:+18449280875"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F7921A] hover:bg-[#e07f10] text-white font-bold text-sm rounded-xl transition-colors">
            <Phone size={14} />
            Call Us
          </a>
          <Link href="/booking"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 font-bold text-xs")}>
            Book Service
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-slate-400">
        To add more properties to your plan, call (844) 928-0875 or{" "}
        <Link href="/hvac-maintenance-plan/enroll" className="underline">enroll a new property online</Link>.
      </p>
    </div>
  );
}
