"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Calendar, Clock, Wrench, MapPin, Phone, Edit3, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Appt = {
  appointmentNumber: string;
  name: string;
  phone: string;
  service: string;
  subservice: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  address: string;
  city: string;
  zipCode: string;
  description: string | null;
  status: string;
  confirmedAt: string | null;
};

type Screen = "loading" | "error" | "details" | "confirming" | "confirmed" | "modifying" | "modified";

function fmt(date: string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

const TIMES = ["7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM","7:00 PM","Emergency"];

export default function ConfirmPage() {
  const { token } = useParams<{ token: string }>();
  const [screen, setScreen] = useState<Screen>("loading");
  const [appt, setAppt] = useState<Appt | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Modify form
  const [modDate, setModDate] = useState("");
  const [modTime, setModTime] = useState("");
  const [modDesc, setModDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/confirm/${token}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Something went wrong");
        setAppt(d.appointment);
        setModDate(d.appointment.preferredDate ? d.appointment.preferredDate.split("T")[0] : "");
        setModTime(d.appointment.preferredTime ?? "");
        setModDesc(d.appointment.description ?? "");
        // If already confirmed, show confirmed screen
        setScreen(d.appointment.status === "CONFIRMED" ? "confirmed" : "details");
      })
      .catch(e => { setErrorMsg(e.message); setScreen("error"); });
  }, [token]);

  async function confirm() {
    setScreen("confirming");
    try {
      const res = await fetch(`/api/confirm/${token}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to confirm");
      setScreen("confirmed");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error");
      setScreen("error");
    }
  }

  async function saveModification(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/confirm/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredDate: modDate || null, preferredTime: modTime || null, description: modDesc }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setScreen("modified");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (screen === "loading" || screen === "confirming") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#1B3FA8] mx-auto mb-3" />
          <p className="text-gray-500">{screen === "confirming" ? "Confirming your appointment…" : "Loading…"}</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (screen === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-red-200 p-8 text-center shadow-sm">
          <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Invalid</h1>
          <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
          <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-bold">Back to Home</Link>
        </div>
      </div>
    );
  }

  // ── Confirmed ─────────────────────────────────────────────────────────────
  if (screen === "confirmed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-green-200 p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">Appointment Confirmed!</h1>
          <p className="text-gray-500 text-sm mb-6">
            Thank you, <strong>{appt?.name}</strong>. Your appointment is confirmed and our team has been notified.
          </p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
            <p className="text-xs font-bold text-[#1B3FA8]">#{appt?.appointmentNumber}</p>
            {appt?.service && <div className="flex items-center gap-2 text-sm text-gray-600"><Wrench className="w-4 h-4 text-[#F7921A] shrink-0" />{appt.service}{appt.subservice ? ` — ${appt.subservice}` : ""}</div>}
            {appt?.preferredDate && <div className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="w-4 h-4 text-[#F7921A] shrink-0" />{fmt(appt.preferredDate)}</div>}
            {appt?.preferredTime && <div className="flex items-center gap-2 text-sm text-gray-600"><Clock className="w-4 h-4 text-[#F7921A] shrink-0" />{appt.preferredTime}</div>}
            {appt?.address && <div className="flex items-center gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4 text-[#F7921A] shrink-0" />{appt.address}, {appt.city}</div>}
          </div>
          <p className="text-xs text-gray-400 mb-5">Questions? Call us at <a href="tel:+13466499353" className="text-[#1B3FA8] font-semibold">(346) 649-9353</a></p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#F7921A] text-white rounded-xl text-sm font-bold">Back to DADA HOUSE</Link>
        </div>
      </div>
    );
  }

  // ── Modified ──────────────────────────────────────────────────────────────
  if (screen === "modified") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-blue-200 p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-[#1B3FA8]" />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">Information Sent!</h1>
          <p className="text-gray-500 text-sm mb-6">Your update has been sent to our team. We will contact you shortly to confirm the changes.</p>
          <p className="text-xs text-gray-400 mb-5">Questions? Call <a href="tel:+13466499353" className="text-[#1B3FA8] font-semibold">(346) 649-9353</a></p>
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#F7921A] text-white rounded-xl text-sm font-bold">Back to DADA HOUSE</Link>
        </div>
      </div>
    );
  }

  // ── Modify form ───────────────────────────────────────────────────────────
  if (screen === "modifying") {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-sm mx-auto space-y-4">
          <button onClick={() => setScreen("details")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to appointment
          </button>
          <h1 className="text-xl font-bold text-gray-900">Modify / Add Information</h1>
          <p className="text-sm text-gray-500">Update the details below and our team will be notified of the changes.</p>
          {errorMsg && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{errorMsg}</p>}
          <form onSubmit={saveModification} className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> Preferred Date</label>
                <input type="date" value={modDate} onChange={e => setModDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block flex items-center gap-1"><Clock className="w-3 h-3" /> Preferred Time</label>
                <select value={modTime} onChange={e => setModTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8] bg-white">
                  <option value="">Any time</option>
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Additional Notes / Description</label>
                <textarea value={modDesc} onChange={e => setModDesc(e.target.value)} rows={4}
                  placeholder="Describe the issue, access instructions, or any additional info…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8] resize-none" />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="w-full py-3 bg-[#1B3FA8] hover:bg-[#1A3490] disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors">
              {saving ? "Sending…" : "Send Update"}
            </button>
            <button type="button" onClick={() => setScreen("details")}
              className="w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Details + actions ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-sm mx-auto space-y-4">
        {/* Logo / header */}
        <div className="text-center mb-2">
          <p className="text-[#F7921A] font-black text-xl tracking-wide">DADA HOUSE</p>
          <p className="text-xs text-gray-400">Home Services · Houston, TX</p>
        </div>

        {/* Appointment card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#1B3FA8] px-5 py-4">
            <p className="text-white font-bold text-base">Appointment #{appt?.appointmentNumber}</p>
            <p className="text-blue-200 text-xs mt-0.5">Please review and confirm your appointment</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <Wrench className="w-4 h-4 text-[#F7921A] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium">Service</p>
                <p className="text-sm font-semibold text-gray-900">{appt?.service}{appt?.subservice ? ` — ${appt.subservice}` : ""}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-[#F7921A] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium">Date</p>
                <p className="text-sm font-semibold text-gray-900">{fmt(appt?.preferredDate ?? null) ?? "To be scheduled"}</p>
              </div>
            </div>
            {appt?.preferredTime && (
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#F7921A] mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400 font-medium">Time</p>
                  <p className="text-sm font-semibold text-gray-900">{appt.preferredTime}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#F7921A] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium">Address</p>
                <p className="text-sm font-semibold text-gray-900">{appt?.address}, {appt?.city} {appt?.zipCode}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#F7921A] mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 font-medium">Contact</p>
                <p className="text-sm font-semibold text-gray-900">{appt?.name} · {appt?.phone}</p>
              </div>
            </div>
            {appt?.description && (
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 font-medium mb-1">Notes</p>
                <p className="text-sm text-gray-700">{appt.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={confirm}
            className="w-full flex items-center justify-between px-5 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-base transition-colors shadow-sm"
          >
            <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Confirm Appointment</span>
            <ChevronRight className="w-5 h-5 opacity-70" />
          </button>
          <button
            onClick={() => setScreen("modifying")}
            className="w-full flex items-center justify-between px-5 py-4 bg-white border border-gray-200 hover:border-[#1B3FA8] text-gray-700 hover:text-[#1B3FA8] rounded-2xl font-semibold text-sm transition-colors"
          >
            <span className="flex items-center gap-2"><Edit3 className="w-4 h-4" /> Modify / Add Information</span>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          Questions? Call <a href="tel:+13466499353" className="text-[#1B3FA8] font-semibold">(346) 649-9353</a>
        </p>
      </div>
    </div>
  );
}
