"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Wrench, CalendarDays, Clock, CheckCircle, Loader2, ArrowLeft } from "lucide-react";

const TIME_SLOTS = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
];

function ScheduleForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("orderId");

  const [form, setForm] = useState({
    firstName: "", lastName: "", address: "", city: "Houston", phone: "", date: "", time: "",
  });
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Get minimum date (tomorrow)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split("T")[0];

  // Check availability when date changes
  useEffect(() => {
    if (!form.date) return;
    setLoadingSlots(true);
    setBusySlots([]);
    fetch(`/api/store/availability?date=${form.date}`)
      .then(r => r.json())
      .then(d => { setBusySlots(d.busyTimes ?? []); setLoadingSlots(false); })
      .catch(() => setLoadingSlots(false));
  }, [form.date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) { setError("Order ID missing. Please go back and try again."); return; }
    if (!form.date || !form.time) { setError("Please select a date and time."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/store/orders/${orderId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to schedule. Please try again."); setSaving(false); return; }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-5">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Installation Scheduled!</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Your appointment has been confirmed for <strong>{form.date}</strong> at <strong>{form.time}</strong>.
            Our technician will contact you before the visit.
          </p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 text-left space-y-2">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#F97316]" />
            <span className="font-bold text-orange-800 text-sm">Appointment Details</span>
          </div>
          <p className="text-orange-700 text-sm">📅 {form.date} at {form.time}</p>
          <p className="text-orange-700 text-sm">📍 {form.address}, {form.city}</p>
          <p className="text-orange-700 text-sm">👤 {form.firstName} {form.lastName}</p>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <Link href="/store" className="px-5 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold hover:bg-[#163291] transition-colors">
            Continue Shopping
          </Link>
          <Link href="/portal/orders" className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            View My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/store" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="w-4 h-4" />Back to Store
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F97316] rounded-xl flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Installation</h1>
            <p className="text-gray-500 text-sm">Choose your preferred date & time for professional installation</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Contact info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Contact Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">First Name *</label>
              <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Last Name *</label>
              <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone *</label>
              <input required type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">City *</label>
              <input required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Installation Address *</label>
              <input required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Street address where installation will take place"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Preferred Date & Time</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              <CalendarDays className="w-3.5 h-3.5 inline mr-1" />Date *
            </label>
            <input required type="date" min={minDateStr} value={form.date}
              onChange={e => { setForm(f => ({ ...f, date: e.target.value, time: "" })); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
          </div>

          {form.date && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                <Clock className="w-3.5 h-3.5 inline mr-1" />Available Time Slots *
              </label>
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />Checking availability…
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {TIME_SLOTS.map(slot => {
                    const busy = busySlots.includes(slot);
                    const selected = form.time === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={busy}
                        onClick={() => setForm(f => ({ ...f, time: slot }))}
                        className={`py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                          busy ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed line-through"
                          : selected ? "bg-[#1B3FA8] text-white border-[#1B3FA8]"
                          : "bg-white text-gray-700 border-gray-200 hover:border-[#1B3FA8] hover:text-[#1B3FA8]"
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

        <button type="submit" disabled={saving || !form.time}
          className="w-full py-4 bg-[#F97316] text-white rounded-xl font-bold text-sm hover:bg-[#ea6c0a] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Scheduling…</> : <><CheckCircle className="w-4 h-4" />Confirm Installation Appointment</>}
        </button>
      </form>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>}>
      <ScheduleForm />
    </Suspense>
  );
}
