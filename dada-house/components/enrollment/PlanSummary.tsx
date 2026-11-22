"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { calcAnnualTotal, calcMonthlyTotal, calcPropertyAnnual, calcPropertyMonthly } from "@/lib/enrollment-pricing";
import type { EnrollmentState } from "./EnrollmentWizard";

const usd = (n: number, cents = false) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }).format(n);

/**
 * "Your plan so far": a live preview of what the customer has entered, under every step,
 * so they see what their plan will look like before paying. Prices come from lib/enrollment-pricing
 * (the same engine the checkout uses); the final amount is confirmed at checkout.
 */
export default function PlanSummary({ state, step }: { state: EnrollmentState; step: number }) {
  const monthly = state.billingInterval === "monthly";
  const props = state.properties;
  const total = monthly ? calcMonthlyTotal(props) : calcAnnualTotal(props);
  const filledProps = props.filter((p) => p.address.trim() && p.city.trim() && p.zipCode.trim());
  const c = state.contact;
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  const billingLine = [c.billingAddress, c.billingCity, [c.billingState, c.billingZip].filter(Boolean).join(" ")].filter((x) => x && x.trim()).join(", ");
  const described = state.hvacSystems.filter((s) => !s.unknownDetails && (s.brand.trim() || s.model.trim() || s.age.trim())).length;
  const visits = state.schedules.filter((s) => s.preferredDate);
  const propLabel = (id: string) => {
    const p = props.find((x) => x.id === id);
    return p ? (p.nickname || p.address || "Property") : "Property";
  };

  const rows: { label: string; done: boolean; value: React.ReactNode; from: number }[] = [
    { label: "Plan", from: 0, done: true, value: <>HVAC Maintenance Plan — <strong>{monthly ? "Monthly" : "Annual"}</strong>{monthly ? " (12-month commitment)" : ""}</> },
    { label: "Systems", from: 1, done: step > 1 || state.totalSystems >= 1, value: <>{state.totalSystems} system{state.totalSystems === 1 ? "" : "s"}</> },
    {
      label: props.length > 1 ? `Properties (${props.length})` : "Property", from: 2, done: filledProps.length === props.length && props.length > 0,
      value: filledProps.length ? (
        <span className="block space-y-0.5">
          {filledProps.map((p) => (
            <span key={p.id} className="block">
              {p.nickname ? <strong>{p.nickname}: </strong> : null}{p.address}{p.apt ? `, ${p.apt}` : ""}, {p.city}, {p.state} {p.zipCode}
              <span className="text-slate-400"> · {p.systemCount} system{p.systemCount === 1 ? "" : "s"} · {monthly ? `${usd(calcPropertyMonthly(p.systemCount), true)}/mo` : `${usd(calcPropertyAnnual(p.systemCount))}/yr`}</span>
            </span>
          ))}
        </span>
      ) : "Service address — next steps",
    },
    { label: "HVAC details", from: 3, done: step > 3, value: described ? `${described} of ${state.hvacSystems.length} system${state.hvacSystems.length === 1 ? "" : "s"} described` : step > 3 ? "Our technician will record them on the first visit" : "Optional" },
    {
      label: "Contact", from: 4, done: !!(name && c.email && c.phone),
      value: name || c.email || c.phone ? (
        <span className="block">
          {name && <span className="block font-semibold">{name}</span>}
          {(c.email || c.phone) && <span className="block break-all">{[c.phone, c.email].filter(Boolean).join(" · ")}</span>}
          {billingLine && <span className="block text-slate-400">Billing: {billingLine}</span>}
        </span>
      ) : "Your name, phone and email",
    },
    {
      label: "First tune-up", from: 5, done: visits.length > 0,
      value: visits.length ? (
        <span className="block">
          {visits.map((v) => (
            <span key={v.propertyId} className="block">
              {props.length > 1 ? `${propLabel(v.propertyId)}: ` : ""}
              {new Date(`${v.preferredDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}{v.preferredTime ? `, ${v.preferredTime}` : ""}
            </span>
          ))}
        </span>
      ) : "Preferred date — optional",
    },
  ];

  return (
    <div className="mt-8 max-w-2xl mx-auto bg-white border-2 border-[#1B3FA8]/15 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-[#0A1628] px-5 py-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-slate-400 text-[11px] uppercase tracking-wider">Your plan so far</p>
          <p className="text-white font-bold text-sm">Preview — updated as you go</p>
        </div>
        <div className="text-right">
          <p className="text-[#F7921A] font-black text-2xl leading-none">{monthly ? usd(total, true) : usd(total)}</p>
          <p className="text-slate-400 text-xs">{monthly ? "per month" : "per year"}</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((r) => {
          const active = step === r.from;
          const pending = step < r.from && !r.done;
          return (
            <div key={r.label} className={`flex gap-3 px-5 py-3 text-sm ${active ? "bg-[#1B3FA8]/5" : ""}`}>
              {r.done && !pending ? <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" /> : <Circle size={16} className={`shrink-0 mt-0.5 ${active ? "text-[#1B3FA8]" : "text-slate-300"}`} />}
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold uppercase tracking-wide ${active ? "text-[#1B3FA8]" : "text-slate-400"}`}>{r.label}</p>
                <div className={pending ? "text-slate-400" : "text-[#0A1628]"}>{r.value}</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="px-5 py-3 bg-slate-50 text-[11px] text-slate-500">
        {state.promoCode ? `Promo ${state.promoCode} is applied at checkout. ` : ""}Final amount (with any sales tax) is confirmed at secure checkout. After payment you&apos;ll sign your contract online and receive a copy by email.
      </p>
    </div>
  );
}
