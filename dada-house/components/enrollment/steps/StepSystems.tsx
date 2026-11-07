"use client";

import { Minus, Plus } from "lucide-react";
import { calcPropertyAnnual, calcPropertyMonthly } from "@/lib/enrollment-pricing";

interface Props {
  value: number;
  onChange: (n: number) => void;
}

const QUICK_OPTIONS = [1, 2, 3, 4, 5];

export default function StepSystems({ value, onChange }: Props) {
  // Preview assumes all systems at one property (cheapest estimate)
  const annual = calcPropertyAnnual(value);
  const monthly = calcPropertyMonthly(value);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-black text-[#0A1628] mb-2">How Many HVAC Systems?</h2>
        <p className="text-slate-500 max-w-md mx-auto text-sm">
          Count each air handler/furnace + outdoor unit as one system. A 2-story home with separate upstairs/downstairs AC has 2 systems.
        </p>
      </div>

      {/* Quick select */}
      <div className="flex flex-wrap gap-3 justify-center mb-6">
        {QUICK_OPTIONS.map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`px-6 py-3 rounded-xl font-black text-lg border-2 transition-all ${
              value === n
                ? "bg-[#1B3FA8] border-[#1B3FA8] text-white"
                : "bg-white border-slate-200 text-[#0A1628] hover:border-[#1B3FA8]/40"
            }`}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onChange(Math.max(6, value > 5 ? value : 6))}
          className={`px-6 py-3 rounded-xl font-black text-sm border-2 transition-all ${
            value > 5
              ? "bg-[#1B3FA8] border-[#1B3FA8] text-white"
              : "bg-white border-slate-200 text-[#0A1628] hover:border-[#1B3FA8]/40"
          }`}
        >
          More
        </button>
      </div>

      {/* Fine-tune spinner */}
      <div className="flex items-center justify-center gap-6 mb-8">
        <button
          onClick={() => onChange(Math.max(1, value - 1))}
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <Minus size={18} />
        </button>
        <div className="text-center">
          <span className="text-6xl font-black text-[#0A1628]">{value}</span>
          <p className="text-slate-400 text-sm mt-1">System{value !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => onChange(Math.min(20, value + 1))}
          className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Price breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-sm mx-auto">
        <p className="text-slate-500 text-sm mb-3 text-center">Price Preview — 1 property</p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Annual plan</span>
            <span className="font-black text-[#F7921A]">${annual.toFixed(0)}/year</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Monthly plan</span>
            <span className="font-semibold text-slate-700">${monthly.toFixed(2)}/month</span>
          </div>
          {value > 1 && (
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
              $199 base + {value - 1} extra system{value > 2 ? "s" : ""} × $159/yr at same address
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 mt-5">
        You&apos;ll assign systems to specific properties next. Each property starts at $199/yr (1st system).
        Max 20 systems via online enrollment — call for larger portfolios.
      </p>
    </div>
  );
}
