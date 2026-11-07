import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle, Calendar, Shield, Phone, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welcome — HVAC Maintenance Plan Confirmed | DADA HOUSE",
};

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ contract?: string; session_id?: string }>;
}) {
  const params = await searchParams;
  if (!params.contract) redirect("/hvac-maintenance-plan");

  const contract = await db.maintenanceContract.findUnique({
    where: { id: params.contract },
    include: {
      properties: true,
      hvacSystems: { include: { property: true } },
      planType: true,
    },
  }).catch(() => null);

  if (!contract || contract.status === "SENT") {
    // Payment not yet confirmed — could be processing
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-5">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-amber-500" />
          </div>
          <h1 className="text-2xl font-black text-[#0A1628] mb-2">Payment Processing</h1>
          <p className="text-slate-500 text-sm mb-6">
            Your payment is being processed. You&apos;ll receive a confirmation email at the address you provided within a few minutes.
          </p>
          <a href="tel:+18449280875"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B3FA8] text-white font-bold rounded-xl">
            <Phone size={16} />
            Call (844) 928-0875
          </a>
        </div>
      </div>
    );
  }

  const isAnnual = contract.billingInterval === "annual";
  const amount = isAnnual ? contract.annualTotal : contract.monthlyTotal;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-[#0A1628] py-6 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            Welcome to the DADA HOUSE Comfort Family!
          </h1>
          <p className="text-slate-300">Your HVAC Maintenance Plan is now active.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 md:px-10 py-10 space-y-6">
        {/* Membership card */}
        <div className="bg-[#0A1628] rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Membership Number</p>
              <p className="text-3xl font-black text-[#F7921A]">{contract.membershipNumber}</p>
            </div>
            <span className="px-3 py-1 bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold rounded-full">ACTIVE</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-700">
            <div>
              <p className="text-slate-500 text-xs">Customer</p>
              <p className="text-white font-bold text-sm">{contract.firstName} {contract.lastName}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Systems</p>
              <p className="text-white font-bold text-sm">{contract.numberOfSystems}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Billing</p>
              <p className="text-[#F7921A] font-bold text-sm">
                {amount ? `$${isAnnual ? amount.toFixed(0) : amount.toFixed(2)}/${isAnnual ? "yr" : "mo"}` : "—"}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Renews</p>
              <p className="text-white font-bold text-sm">
                {contract.renewalDate
                  ? new Date(contract.renewalDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Properties */}
        {contract.properties.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="font-black text-[#0A1628] mb-4">Covered Properties</h2>
            <div className="space-y-3">
              {contract.properties.map((p) => (
                <div key={p.id} className="pl-3 border-l-2 border-[#F7921A]/40">
                  <p className="font-semibold text-sm">{p.nickname || p.address}</p>
                  <p className="text-slate-500 text-xs">{p.address}, {p.city}, {p.state} {p.zipCode} · {p.systemCount} system{p.systemCount !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What's next */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-black text-[#0A1628] mb-4">What Happens Next</h2>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Appointment Scheduling",
                desc: "Our team will contact you within 24 hours to confirm your first seasonal tune-up appointment.",
              },
              {
                step: "2",
                title: "Confirmation Email",
                desc: `A full confirmation with your membership details has been sent to ${contract.email}.`,
              },
              {
                step: "3",
                title: "Priority Service Access",
                desc: "You can now call (844) 928-0875 anytime for priority dispatch and your $69 service call fee.",
              },
              {
                step: "4",
                title: "Annual Tune-Ups",
                desc: "We'll reach out before each season (spring and fall) to schedule your included tune-up visits.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[#1B3FA8] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  {step}
                </span>
                <div>
                  <p className="font-bold text-sm text-[#0A1628]">{title}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Appointment note */}
        {contract.firstAppointmentNotes && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Calendar size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-blue-800 text-sm">Requested First Appointment</p>
                <p className="text-blue-700 text-xs mt-1">{contract.firstAppointmentNotes}</p>
                <p className="text-blue-600 text-xs mt-1">We&apos;ll confirm availability and send a final confirmation.</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/dashboard"
            className={cn(buttonVariants({ size: "lg" }), "flex-1 gap-2 font-bold")}>
            Go to My Dashboard
            <ArrowRight size={16} />
          </Link>
          <a href="tel:+18449280875"
            className="flex-1 flex items-center justify-center gap-2 py-3 px-6 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 hover:bg-slate-50 transition-colors">
            <Phone size={16} />
            (844) 928-0875
          </a>
        </div>

        <p className="text-center text-xs text-slate-400">
          Questions? Call us at (844) 928-0875 or email customerservice@dada-house.com
        </p>
      </div>
    </div>
  );
}
