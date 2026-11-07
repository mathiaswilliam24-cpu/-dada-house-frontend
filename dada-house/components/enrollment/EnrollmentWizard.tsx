"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import StepPlan from "./steps/StepPlan";
import StepSystems from "./steps/StepSystems";
import StepProperties from "./steps/StepProperties";
import StepHvacDetails from "./steps/StepHvacDetails";
import StepContact from "./steps/StepContact";
import StepSchedule from "./steps/StepSchedule";
import StepReview from "./steps/StepReview";

export type BillingInterval = "annual" | "monthly";

export interface PropertyInput {
  id: string; // client-side temp ID
  nickname: string;
  address: string;
  apt: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  systemCount: number;
  accessInstructions: string;
  gateCode: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
}

export interface HvacSystemInput {
  id: string; // client-side temp ID
  propertyId: string; // links to PropertyInput.id
  nickname: string;
  coolingType: string;
  heatingType: string;
  brand: string;
  model: string;
  serialNumber: string;
  age: string;
  indoorLocation: string;
  outdoorLocation: string;
  condition: string;
  unknownDetails: boolean;
}

export interface ContactInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  preferredContact: string;
  preferredLanguage: string;
  marketingSmsConsent: boolean;
  marketingEmailConsent: boolean;
  privacyAccepted: boolean;
  agreementAccepted: boolean;
  customerType: string;
}

export interface ScheduleInput {
  propertyId: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
  tenantAccess: boolean;
}

export interface EnrollmentState {
  billingInterval: BillingInterval;
  totalSystems: number;
  properties: PropertyInput[];
  hvacSystems: HvacSystemInput[];
  contact: ContactInput;
  schedules: ScheduleInput[];
}

const STEPS = [
  "Select Plan",
  "Systems",
  "Properties",
  "HVAC Details",
  "Contact",
  "Schedule",
  "Review & Pay",
] as const;

const EMPTY_CONTACT: ContactInput = {
  firstName: "", lastName: "", email: "", phone: "",
  billingAddress: "", billingCity: "", billingState: "TX", billingZip: "",
  preferredContact: "email", preferredLanguage: "en",
  marketingSmsConsent: false, marketingEmailConsent: false,
  privacyAccepted: false, agreementAccepted: false,
  customerType: "Homeowner",
};

function makeDefaultProperty(): PropertyInput {
  return {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    nickname: "", address: "", apt: "", city: "", state: "TX", zipCode: "",
    propertyType: "Residential", systemCount: 1,
    accessInstructions: "", gateCode: "",
    tenantName: "", tenantPhone: "", tenantEmail: "",
  };
}

function makeDefaultSystem(propertyId: string): HvacSystemInput {
  return {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    propertyId,
    nickname: "", coolingType: "Central AC", heatingType: "Gas Furnace",
    brand: "", model: "", serialNumber: "", age: "",
    indoorLocation: "", outdoorLocation: "", condition: "",
    unknownDetails: false,
  };
}

export default function EnrollmentWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<EnrollmentState>(() => {
    const p = makeDefaultProperty();
    return {
      billingInterval: "annual",
      totalSystems: 1,
      properties: [p],
      hvacSystems: [makeDefaultSystem(p.id)],
      contact: EMPTY_CONTACT,
      schedules: [{ propertyId: p.id, preferredDate: "", preferredTime: "", notes: "", tenantAccess: false }],
    };
  });

  const update = useCallback((patch: Partial<EnrollmentState>) => {
    setState(prev => ({ ...prev, ...patch }));
  }, []);

  // Sync hvacSystems when property system counts change
  const syncSystems = useCallback((properties: PropertyInput[]) => {
    const totalSystems = properties.reduce((s, p) => s + p.systemCount, 0);
    const newSystems: HvacSystemInput[] = [];
    for (const prop of properties) {
      for (let i = 0; i < prop.systemCount; i++) {
        const existing = state.hvacSystems.find(
          s => s.propertyId === prop.id &&
            state.hvacSystems.filter(x => x.propertyId === prop.id).indexOf(s) === i
        );
        newSystems.push(existing ?? makeDefaultSystem(prop.id));
      }
    }
    setState(prev => ({
      ...prev,
      properties,
      totalSystems,
      hvacSystems: newSystems,
      schedules: properties.map(p => ({
        propertyId: p.id,
        preferredDate: "",
        preferredTime: "",
        notes: "",
        tenantAccess: false,
      })),
    }));
  }, [state.hvacSystems]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/enrollment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enrollment failed");
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An error occurred");
      setSubmitting(false);
    }
  }

  function canAdvance(): boolean {
    if (step === 0) return true;
    if (step === 1) return state.totalSystems >= 1;
    if (step === 2) {
      return state.properties.every(p =>
        p.address.trim() && p.city.trim() && p.state.trim() && p.zipCode.trim()
      );
    }
    if (step === 3) return true; // HVAC details optional
    if (step === 4) {
      const c = state.contact;
      return !!(c.firstName && c.lastName && c.email && c.phone &&
        c.billingAddress && c.billingCity && c.billingState && c.billingZip &&
        c.privacyAccepted && c.agreementAccepted);
    }
    if (step === 5) return true; // Schedule optional
    if (step === 6) return true;
    return false;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top bar */}
      <div className="bg-[#0A1628] py-4 px-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-white font-black text-lg">DADA HOUSE</span>
          <span className="text-slate-400 text-sm">HVAC Maintenance Plan Enrollment</span>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-white border-b border-slate-200 py-3 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-1 shrink-0">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  i < step ? "bg-green-100 text-green-700" :
                  i === step ? "bg-[#1B3FA8] text-white" :
                  "bg-slate-100 text-slate-400"
                }`}>
                  {i < step ? <CheckCircle size={12} /> : <span>{i + 1}</span>}
                  <span className="hidden sm:block">{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-4 rounded-full ${i < step ? "bg-green-400" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-5 md:px-10 py-8 pb-32">
        {step === 0 && (
          <StepPlan
            value={state.billingInterval}
            onChange={v => update({ billingInterval: v })}
            totalSystems={state.totalSystems}
          />
        )}
        {step === 1 && (
          <StepSystems
            value={state.totalSystems}
            onChange={n => {
              const diff = n - state.properties.reduce((s, p) => s + p.systemCount, 0);
              if (state.properties.length === 1) {
                const updated = { ...state.properties[0], systemCount: Math.max(1, state.properties[0].systemCount + diff) };
                syncSystems([updated]);
              } else {
                update({ totalSystems: n });
              }
            }}
          />
        )}
        {step === 2 && (
          <StepProperties
            properties={state.properties}
            totalSystems={state.totalSystems}
            onChange={syncSystems}
            makeDefault={makeDefaultProperty}
          />
        )}
        {step === 3 && (
          <StepHvacDetails
            systems={state.hvacSystems}
            properties={state.properties}
            onChange={systems => update({ hvacSystems: systems })}
            makeDefault={makeDefaultSystem}
          />
        )}
        {step === 4 && (
          <StepContact
            value={state.contact}
            onChange={c => update({ contact: c })}
          />
        )}
        {step === 5 && (
          <StepSchedule
            schedules={state.schedules}
            properties={state.properties}
            onChange={s => update({ schedules: s })}
          />
        )}
        {step === 6 && (
          <StepReview
            state={state}
          />
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 px-5 py-4 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : router.push("/hvac-maintenance-plan")}
            className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-600 hover:text-[#0A1628] transition-colors"
          >
            <ArrowLeft size={16} />
            {step === 0 ? "Back to Plan" : "Previous"}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm hidden sm:block">Step {step + 1} of {STEPS.length}</span>
          </div>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-6 py-3 bg-[#1B3FA8] hover:bg-[#0D1D5E] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-colors"
            >
              Continue
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canAdvance()}
              className="flex items-center gap-2 px-6 py-3 bg-[#F7921A] hover:bg-[#e07f10] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm rounded-xl transition-colors"
            >
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <>Pay Securely →</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
