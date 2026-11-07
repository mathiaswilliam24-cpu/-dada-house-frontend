"use client";

import { CheckCircle, Calendar, Zap, AlertCircle } from "lucide-react";
import type { BillingInterval } from "../EnrollmentWizard";
import { calcPropertyAnnual, calcPropertyMonthly } from "@/lib/enrollment-pricing";

interface Props {
  value: BillingInterval;
  onChange: (v: BillingInterval) => void;
  totalSystems: number;
}

export default function StepPlan({ value, onChange, totalSystems }: Props) {
  // Preview uses one-property estimate (cheapest scenario for given system count)
  const annual = calcPropertyAnnual(totalSystems);
  const monthly = calcPropertyMonthly(totalSystems);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-black text-[#0A1628] mb-2">Select Your Payment Option</h2>
        <p className="text-slate-500">Starting price for 1 property · Final price confirmed in the last step.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Annual */}
        <button
          onClick={() => onChange("annual")}
          className={`relative text-left p-6 rounded-2xl border-2 transition-all ${
            value === "annual"
              ? "border-[#F7921A] bg-[#F7921A]/5"
              : "border-slate-200 bg-white hover:border-[#F7921A]/40"
          }`}
        >
          <div className="absolute top-4 right-4">
            {value === "annual" && <CheckCircle size={20} className="text-[#F7921A]" />}
          </div>
          <span className="inline-block px-2.5 py-0.5 bg-[#F7921A] text-white text-xs font-bold rounded-full mb-4">
            BEST VALUE
          </span>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-4xl font-black text-[#0A1628]">${annual.toFixed(0)}</span>
            <span className="text-slate-400 font-medium">/year</span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            per property · billed once annually
          </p>
          <div className="space-y-1.5">
            {["2 tune-ups per year", "Priority scheduling", "$69 service calls", "10% off repairs", "No commitment"].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle size={13} className="text-green-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </button>

        {/* Monthly */}
        <button
          onClick={() => onChange("monthly")}
          className={`relative text-left p-6 rounded-2xl border-2 transition-all ${
            value === "monthly"
              ? "border-[#1B3FA8] bg-[#1B3FA8]/5"
              : "border-slate-200 bg-white hover:border-[#1B3FA8]/40"
          }`}
        >
          <div className="absolute top-4 right-4">
            {value === "monthly" && <CheckCircle size={20} className="text-[#1B3FA8]" />}
          </div>
          <span className="inline-block px-2.5 py-0.5 bg-slate-200 text-slate-600 text-xs font-bold rounded-full mb-4">
            MONTHLY
          </span>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-4xl font-black text-[#0A1628]">${monthly.toFixed(2)}</span>
            <span className="text-slate-400 font-medium">/month</span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            per property · billed monthly
          </p>
          <div className="space-y-1.5">
            {["2 tune-ups per year", "Priority scheduling", "$69 service calls", "10% off repairs"].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle size={13} className="text-green-500 shrink-0" />
                {f}
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <AlertCircle size={13} className="text-amber-500 shrink-0" />
              12-month commitment
            </div>
          </div>
        </button>
      </div>

      {value === "annual" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <Zap size={18} className="text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-green-800 font-bold text-sm">Annual plan saves money — no commitment required</p>
            <p className="text-green-700 text-xs mt-1">
              Annual: ${annual.toFixed(0)}/yr vs monthly: ${(monthly * 12).toFixed(2)}/yr —
              save ${((monthly * 12) - annual).toFixed(2)}/year per property by paying annually.
            </p>
          </div>
        </div>
      )}

      {value === "monthly" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-800 font-bold text-sm">12-month minimum commitment</p>
            <p className="text-amber-700 text-xs mt-1">
              Your card is charged ${monthly.toFixed(2)}/month per property. After 12 months, the plan continues month-to-month and you can cancel anytime.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-start gap-2">
          <Calendar size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-500">
            <strong>Multi-property pricing:</strong> each address is billed independently — $199/yr (or $21/mo) per property for the first system, +$159/yr (+$16.78/mo) for each additional system at the same address.
          </p>
        </div>
      </div>
    </div>
  );
}
