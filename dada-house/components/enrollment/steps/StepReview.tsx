"use client";

import { CheckCircle, MapPin, Thermometer, User, Calendar, AlertCircle } from "lucide-react";
import type { EnrollmentState } from "../EnrollmentWizard";
import { calcAnnualTotal, calcMonthlyTotal, calcPropertyAnnual, calcPropertyMonthly } from "@/lib/enrollment-pricing";

interface Props {
  state: EnrollmentState;
}

export default function StepReview({ state }: Props) {
  const { billingInterval, totalSystems, properties, hvacSystems, contact, schedules } = state;
  const isAnnual = billingInterval === "annual";

  // Real total: per-property model
  const amount = isAnnual ? calcAnnualTotal(properties) : calcMonthlyTotal(properties);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-[#0A1628] mb-2">Review Your Order</h2>
        <p className="text-slate-500 text-sm">Please confirm everything is correct before paying.</p>
      </div>

      {/* Plan summary */}
      <div className="bg-[#0A1628] rounded-2xl p-5 text-white">
        <p className="text-slate-400 text-xs uppercase tracking-wider mb-3">HVAC Maintenance Plan</p>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-black text-[#F7921A]">
            ${amount.toFixed(isAnnual ? 0 : 2)}
          </span>
          <span className="text-slate-400">/{isAnnual ? "year" : "month"}</span>
        </div>
        <p className="text-slate-300 text-sm">
          {properties.length} propert{properties.length !== 1 ? "ies" : "y"} · {totalSystems} system{totalSystems !== 1 ? "s" : ""} ·{" "}
          {isAnnual ? "Annual billing" : "Monthly billing · 12-month commitment"}
        </p>
        <div className="mt-4 pt-4 border-t border-slate-700 space-y-1.5">
          {["2 tune-ups/year (spring AC + fall heating)", "Priority scheduling", "$69 service call fee", "10% off all HVAC repairs"].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle size={13} className="text-green-400 shrink-0" />
              {f}
            </div>
          ))}
        </div>
        {isAnnual ? (
          <div className="mt-3 text-xs text-slate-400">Renews annually · Cancel anytime</div>
        ) : (
          <div className="mt-3 text-xs text-amber-400">12-month minimum commitment · Then month-to-month, cancel anytime</div>
        )}
      </div>

      {/* Per-property pricing breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={16} className="text-[#F7921A]" />
          <p className="font-bold text-[#0A1628] text-sm">Properties & Pricing</p>
        </div>
        {properties.map((p, i) => {
          const propCost = isAnnual ? calcPropertyAnnual(p.systemCount) : calcPropertyMonthly(p.systemCount);
          return (
            <div key={p.id} className="flex items-start justify-between pl-3 border-l-2 border-[#F7921A]/30">
              <div>
                <p className="font-semibold text-sm text-[#0A1628]">{p.nickname || `Property ${i + 1}`}</p>
                <p className="text-slate-500 text-xs">
                  {p.address}{p.apt ? ` #${p.apt}` : ""}, {p.city}, {p.state} {p.zipCode}
                </p>
                <p className="text-slate-400 text-xs">{p.systemCount} HVAC system{p.systemCount !== 1 ? "s" : ""}</p>
              </div>
              <span className="font-black text-[#F7921A] text-sm shrink-0 ml-4">
                ${propCost.toFixed(isAnnual ? 0 : 2)}/{isAnnual ? "yr" : "mo"}
              </span>
            </div>
          );
        })}
      </div>

      {/* HVAC Systems */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Thermometer size={16} className="text-[#F7921A]" />
          <p className="font-bold text-[#0A1628] text-sm">HVAC Systems ({totalSystems})</p>
        </div>
        {hvacSystems.map((s, i) => (
          <div key={s.id} className="pl-3 border-l-2 border-blue-200">
            <p className="font-semibold text-sm text-[#0A1628]">{s.nickname || `System ${i + 1}`}</p>
            {s.unknownDetails ? (
              <p className="text-slate-400 text-xs">Details unknown — technician will assess on first visit</p>
            ) : (
              <p className="text-slate-500 text-xs">{s.coolingType} / {s.heatingType}{s.brand ? ` · ${s.brand}` : ""}</p>
            )}
          </div>
        ))}
      </div>

      {/* Contact */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <User size={16} className="text-[#F7921A]" />
          <p className="font-bold text-[#0A1628] text-sm">Contact Information</p>
        </div>
        <div className="space-y-1 text-sm text-slate-600">
          <p>{contact.firstName} {contact.lastName}</p>
          <p>{contact.email}</p>
          <p>{contact.phone}</p>
          <p>{contact.billingAddress}, {contact.billingCity}, {contact.billingState} {contact.billingZip}</p>
        </div>
      </div>

      {/* Schedule */}
      {schedules.some(s => s.preferredDate) && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-[#F7921A]" />
            <p className="font-bold text-[#0A1628] text-sm">Requested First Appointment</p>
          </div>
          {schedules.filter(s => s.preferredDate).map((s, i) => {
            const prop = properties.find(p => p.id === s.propertyId);
            return (
              <div key={i} className="text-sm text-slate-600 pl-3 border-l-2 border-blue-200 mb-2">
                <p className="font-semibold">{prop?.nickname || prop?.address || "Property"}</p>
                <p>{new Date(s.preferredDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                {s.preferredTime && <p>{s.preferredTime}</p>}
              </div>
            );
          })}
          <p className="text-xs text-slate-400 mt-2">Subject to availability — confirmed within 24 hours after payment.</p>
        </div>
      )}

      {/* Monthly commitment notice */}
      {!isAnnual && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-800 font-bold text-sm">12-Month Commitment</p>
            <p className="text-amber-700 text-xs mt-1">
              By subscribing monthly, you agree to a minimum 12-month term. After 12 months, your plan continues month-to-month and you can cancel anytime by calling (844) 928-0875.
            </p>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        <strong>Important:</strong> This maintenance plan covers the cost of two seasonal tune-up visits only.
        Any parts, refrigerant, or repair labor required during or between visits is billed separately.
        As a plan member, you receive 10% off all repair costs.
      </div>

      {/* Total */}
      <div className="bg-white border-2 border-[#F7921A] rounded-2xl p-5">
        {properties.map((p, i) => {
          const propCost = isAnnual ? calcPropertyAnnual(p.systemCount) : calcPropertyMonthly(p.systemCount);
          return (
            <div key={p.id} className="flex justify-between items-center text-sm mb-2">
              <span className="text-slate-600">{p.nickname || `Property ${i + 1}`} ({p.systemCount} sys)</span>
              <span className="font-semibold text-slate-700">${propCost.toFixed(isAnnual ? 0 : 2)}/{isAnnual ? "yr" : "mo"}</span>
            </div>
          );
        })}
        <div className="flex justify-between items-center text-sm mb-3 pt-2 border-t border-slate-100">
          <span className="text-slate-600">Taxes</span>
          <span className="text-slate-500">Calculated at checkout</span>
        </div>
        <div className="flex justify-between items-center font-black text-base border-t border-slate-200 pt-3">
          <span className="text-[#0A1628]">Total due today</span>
          <span className="text-[#F7921A]">${amount.toFixed(isAnnual ? 0 : 2)}{isAnnual ? " + tax" : "/mo + tax"}</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Secure payment via Stripe · Card, Apple Pay, Google Pay accepted
        </p>
      </div>
    </div>
  );
}
