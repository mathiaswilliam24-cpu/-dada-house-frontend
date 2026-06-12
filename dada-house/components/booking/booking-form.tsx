"use client";

import { useState, Suspense, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { appointmentSchema, type AppointmentInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Phone,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ALL_SLOTS } from "@/lib/slots";

const services = [
  { label: "Plumbing", emoji: "🔧", color: "border-blue-500/40 hover:border-blue-400" },
  { label: "Air Conditioning", emoji: "❄️", color: "border-cyan-500/40 hover:border-cyan-400" },
  { label: "Heating", emoji: "🔥", color: "border-orange-500/40 hover:border-orange-400" },
  { label: "Remodeling", emoji: "🏠", color: "border-purple-500/40 hover:border-purple-400" },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
              i < current
                ? "bg-[#F7921A] text-white"
                : i === current
                ? "bg-[#F7921A] text-white ring-4 ring-[#F7921A]/20"
                : "bg-[#1A3490] text-slate-500"
            }`}
          >
            {i < current ? <CheckCircle size={14} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div
              className={`flex-1 h-0.5 w-8 transition-colors ${
                i < current ? "bg-[#F7921A]" : "bg-[#1A3490]"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function BookingFormInner() {
  const searchParams = useSearchParams();
  const preService = searchParams.get("service") ?? "";

  const [step, setStep] = useState(preService ? 1 : 0);
  const [success, setSuccess] = useState<{ number: string } | null>(null);
  const [submitError, setSubmitError] = useState("");

  // Availability state
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [slotUnavailable, setSlotUnavailable] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>(ALL_SLOTS);
  const [slotsLoaded, setSlotsLoaded] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      service: preService,
      city: "Houston",
      zipCode: "",
      photos: [],
    },
  });

  const selectedService = watch("service");
  const selectedTime = watch("preferredTime");
  const selectedDate = watch("preferredDate");

  // Load available slots whenever date changes
  const loadSlots = useCallback(async (date: string) => {
    if (!date) return;
    setSlotsLoaded(false);
    setAvailableSlots(ALL_SLOTS);
    try {
      const res = await fetch(`/api/availability?date=${date}`);
      const data = await res.json();
      setAvailableSlots(data.availableSlots ?? ALL_SLOTS);
    } catch {
      setAvailableSlots(ALL_SLOTS);
    } finally {
      setSlotsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadSlots(selectedDate);
      // Reset time if date changes
      setValue("preferredTime", "");
      setSlotUnavailable(false);
    }
  }, [selectedDate, loadSlots, setValue]);

  // Check specific slot when user selects one
  const handleSlotSelect = async (slot: string) => {
    setSlotUnavailable(false);
    if (!selectedDate) {
      setValue("preferredTime", slot);
      return;
    }
    setCheckingAvailability(true);
    try {
      const res = await fetch(`/api/availability?date=${selectedDate}&slot=${encodeURIComponent(slot)}`);
      const data = await res.json();
      if (data.available === false) {
        setSlotUnavailable(true);
        setAvailableSlots(data.availableSlots ?? []);
        setValue("preferredTime", "");
      } else {
        setValue("preferredTime", slot);
        setSlotUnavailable(false);
      }
    } catch {
      setValue("preferredTime", slot);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const nextStep = async () => {
    let valid = false;
    if (step === 0) {
      valid = await trigger("service");
    } else if (step === 1) {
      valid = await trigger(["name", "phone", "email", "address", "city", "zipCode"]);
    } else if (step === 2) {
      valid = true;
    }
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = async (data: AppointmentInput) => {
    setSubmitError("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to submit");
      setSuccess({ number: body.appointmentNumber });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Submission failed. Please try again."
      );
    }
  };

  if (success) {
    return (
      <div className="bg-[#0D1D5E] border border-[#1A3490] rounded-2xl p-10 text-center">
        <div className="w-20 h-20 bg-green-900/20 border border-green-700/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-400" />
        </div>
        <h2 className="text-3xl font-black text-white mb-3">Appointment Requested!</h2>
        <p className="text-slate-400 mb-2">Confirmation number:</p>
        <div className="text-2xl font-black text-[#F7921A] mb-6">{success.number}</div>
        <p className="text-slate-400 text-sm mb-8">
          We&apos;ll send a confirmation to your email and contact you within 30 minutes.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <a
            href="tel:+19106858042"
            className="flex items-center justify-center gap-2 px-4 py-3 border border-[#1A3490] hover:border-[#F7921A] text-blue-200 hover:text-white rounded-xl text-sm font-semibold transition-all"
          >
            <Phone size={14} />
            Call Us
          </a>
          <a
            href="/"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-[#F7921A] hover:bg-[#E07F10] text-white rounded-xl text-sm font-bold transition-all"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="bg-[#0D1D5E] border border-[#1A3490] rounded-2xl p-6 sm:p-8">
        <StepIndicator current={step} total={4} />

        {/* STEP 0: Service Selection */}
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-black text-white mb-2">Select a Service</h2>
            <p className="text-slate-400 text-sm mb-6">Which service do you need?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setValue("service", s.label)}
                  className={`flex items-center gap-4 p-5 bg-[#1B3FA8] border-2 rounded-xl text-left transition-all ${
                    selectedService === s.label
                      ? "border-[#F7921A] bg-[#F7921A]/5"
                      : `border-[#1A3490] ${s.color}`
                  }`}
                >
                  <span className="text-3xl">{s.emoji}</span>
                  <div>
                    <p className="text-white font-bold">{s.label}</p>
                    <p className="text-slate-400 text-xs">Tap to select</p>
                  </div>
                  {selectedService === s.label && (
                    <CheckCircle size={18} className="text-[#F7921A] ml-auto" />
                  )}
                </button>
              ))}
            </div>
            {errors.service && (
              <p className="text-red-400 text-xs mt-3">{errors.service.message}</p>
            )}
          </div>
        )}

        {/* STEP 1: Contact Info */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-black text-white mb-2">Contact Information</h2>
            <p className="text-slate-400 text-sm mb-6">How should we reach you?</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Full Name *</label>
                <input {...register("name")} placeholder="John Smith" className="form-input" />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Phone *</label>
                  <input {...register("phone")} type="tel" placeholder="+1 (555) 000-0000" className="form-input" />
                  {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone.message}</p>}
                  <p className="text-slate-400 text-[11px] leading-snug mt-1.5">
                    By providing your phone number, you agree to receive SMS appointment updates
                    from DADA HOUSE. Msg & data rates may apply. Msg frequency varies. Reply STOP
                    to opt out, HELP for help. See{" "}
                    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#F7921A] hover:underline">
                      Privacy Policy
                    </a>{" "}
                    &{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#F7921A] hover:underline">
                      Terms
                    </a>
                    .
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Email *</label>
                  <input {...register("email")} type="email" placeholder="you@example.com" className="form-input" />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Service Address *</label>
                <input {...register("address")} placeholder="123 Main Street" className="form-input" />
                {errors.address && <p className="text-red-400 text-xs mt-1">{errors.address.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">City *</label>
                  <input {...register("city")} placeholder="Houston" className="form-input" />
                  {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white mb-1.5">Zip Code *</label>
                  <input {...register("zipCode")} placeholder="77001" className="form-input" maxLength={10} />
                  {errors.zipCode && <p className="text-red-400 text-xs mt-1">{errors.zipCode.message}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Appointment Details */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-black text-white mb-2">Appointment Details</h2>
            <p className="text-slate-400 text-sm mb-6">Help us prepare for your visit.</p>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">Describe Your Issue</label>
                <textarea
                  {...register("description")}
                  rows={3}
                  placeholder="Briefly describe the problem or work needed..."
                  className="form-input"
                  style={{ resize: "none" }}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">
                  <span className="flex items-center gap-2">
                    <Calendar size={14} className="text-[#F7921A]" />
                    Preferred Date
                  </span>
                </label>
                <input
                  {...register("preferredDate")}
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  className="form-input"
                />
              </div>

              {/* Time slot picker */}
              <div>
                <label className="block text-sm font-semibold text-white mb-1.5">
                  <span className="flex items-center gap-2">
                    <Clock size={14} className="text-[#F7921A]" />
                    Preferred Time
                    {selectedDate && !slotsLoaded && (
                      <Loader2 size={12} className="animate-spin text-slate-400" />
                    )}
                    {selectedDate && slotsLoaded && (
                      <span className="text-xs text-green-400 font-normal">
                        ✓ Availability checked
                      </span>
                    )}
                  </span>
                </label>

                {!selectedDate && (
                  <p className="text-slate-500 text-xs mb-2">
                    Select a date first to see real-time availability.
                  </p>
                )}

                {/* Slot unavailable warning */}
                {slotUnavailable && (
                  <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-700/40 rounded-xl mb-3">
                    <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-red-300 text-sm font-semibold">
                        This time slot is no longer available.
                      </p>
                      <p className="text-red-400/70 text-xs mt-0.5">
                        Please choose from the available slots below.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {ALL_SLOTS.map((slot) => {
                    const isAvailable = !selectedDate || availableSlots.includes(slot);
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={!isAvailable || checkingAvailability}
                        onClick={() => handleSlotSelect(slot)}
                        className={`relative px-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-[#F7921A] text-white shadow-lg shadow-orange-900/30"
                            : isAvailable
                            ? "bg-[#1B3FA8] border border-[#1A3490] text-slate-300 hover:border-[#F7921A]/60 hover:text-white"
                            : "bg-[#0D1D5E] border border-red-900/20 text-slate-600 cursor-not-allowed line-through"
                        }`}
                      >
                        {checkingAvailability && isSelected ? (
                          <Loader2 size={12} className="animate-spin mx-auto" />
                        ) : (
                          slot
                        )}
                        {!isAvailable && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-[#0D1D5E]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-3 h-3 rounded bg-[#F7921A] inline-block" /> Selected
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-3 h-3 rounded bg-[#1B3FA8] border border-[#1A3490] inline-block" /> Available
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-3 h-3 rounded bg-[#0D1D5E] border border-red-900/20 inline-block" /> Unavailable
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Submit */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-black text-white mb-2">Review & Submit</h2>
            <p className="text-slate-400 text-sm mb-6">Please review your details before submitting.</p>

            <div className="bg-[#1B3FA8] border border-[#1A3490] rounded-xl overflow-hidden mb-6">
              {[
                { label: "Service", value: getValues("service") },
                { label: "Name", value: getValues("name") },
                { label: "Phone", value: getValues("phone") },
                { label: "Email", value: getValues("email") },
                {
                  label: "Address",
                  value: `${getValues("address")}, ${getValues("city")}, TX ${getValues("zipCode")}`,
                },
                {
                  label: "Appointment",
                  value: getValues("preferredDate")
                    ? `${getValues("preferredDate")}${getValues("preferredTime") ? ` at ${getValues("preferredTime")}` : ""}`
                    : "Flexible",
                },
                { label: "Description", value: getValues("description") || "—" },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className={`flex gap-4 px-5 py-3 ${i % 2 === 0 ? "bg-white/3" : ""} border-b border-[#1A3490] last:border-0`}
                >
                  <span className="text-slate-400 text-sm w-28 flex-shrink-0">{row.label}</span>
                  <span className="text-white text-sm font-medium">{row.value}</span>
                </div>
              ))}
            </div>

            {submitError && (
              <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-xl text-red-300 text-sm mb-4">
                {submitError}
              </div>
            )}

            <p className="text-slate-400 text-[11px] leading-snug">
              By submitting this form, you consent to receive SMS text messages from DADA HOUSE
              regarding your appointment status, scheduling, and service updates. Msg & data
              rates may apply. Msg frequency varies. Reply STOP to opt out, HELP for help.{" "}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#F7921A] hover:underline">
                Privacy Policy
              </a>{" "}
              |{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#F7921A] hover:underline">
                Terms
              </a>
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#1A3490]">
          <div>
            {step > 0 && (
              <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft size={16} />
                Back
              </Button>
            )}
          </div>
          <div>
            {step < 3 ? (
              <Button type="button" onClick={nextStep} size="lg" className="font-black">
                Continue
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button type="submit" size="lg" loading={isSubmitting} className="font-black">
                <Calendar size={16} />
                Submit Appointment
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

export default function BookingForm() {
  return (
    <Suspense
      fallback={
        <div className="bg-[#0D1D5E] border border-[#1A3490] rounded-2xl p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/10 rounded w-48" />
            <div className="h-4 bg-white/5 rounded w-64" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-24 bg-white/5 rounded-xl" />
              <div className="h-24 bg-white/5 rounded-xl" />
            </div>
          </div>
        </div>
      }
    >
      <BookingFormInner />
    </Suspense>
  );
}
