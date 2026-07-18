"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, Clock, Wrench, FileText, UserCheck } from "lucide-react";
import Link from "next/link";

const SERVICES = ["Plumbing", "Air Conditioning", "Heating", "Remodeling", "Home Inspection", "Other"];
const TIMES = ["7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM","7:00 PM","Emergency"];

type Tech = { id: string; name: string | null; email: string };

export default function NewDispatcherAppointment() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [techs, setTechs] = useState<Tech[]>([]);

  // form fields
  const [service, setService] = useState("");
  const [subservice, setSubservice] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [description, setDescription] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [technicianId, setTechnicianId] = useState("");

  useEffect(() => {
    fetch("/api/admin/users/technicians")
      .then(r => r.json())
      .then(d => setTechs(d.technicians ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/dispatcher/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, subservice, name, phone, email, address, city, zipCode, description, preferredDate: preferredDate || undefined, preferredTime: preferredTime || undefined, technicianId: technicianId || undefined, photos: [] }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create appointment");
      }

      router.push("/dispatcher");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dispatcher" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">New Appointment</h1>
          <p className="text-sm text-gray-500">Create a job and optionally assign a technician</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Service */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
            <Wrench className="w-4 h-4 text-[#F7921A]" /> Service
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Service *</label>
              <select
                value={service}
                onChange={e => setService(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8] bg-white"
              >
                <option value="">Select…</option>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Sub-service</label>
              <input
                value={subservice}
                onChange={e => setSubservice(e.target.value)}
                placeholder="e.g. Leak repair"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]"
              />
            </div>
          </div>
        </div>

        {/* Client info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
            <User className="w-4 h-4 text-[#F7921A]" /> Client
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Full Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="John Smith"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> Phone *</label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                required
                placeholder="(346) 000-0000"
                type="tel"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block flex items-center gap-1"><Mail className="w-3 h-3" /> Email <span className="text-gray-400">(optional)</span></label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="john@email.com"
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
            <MapPin className="w-4 h-4 text-[#F7921A]" /> Service Address
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Street Address *</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              placeholder="1234 Main St"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">City *</label>
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                required
                placeholder="Houston"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Zip Code *</label>
              <input
                value={zipCode}
                onChange={e => setZipCode(e.target.value)}
                required
                placeholder="77001"
                maxLength={10}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]"
              />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
            <Calendar className="w-4 h-4 text-[#F7921A]" /> Schedule
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</label>
              <input
                value={preferredDate}
                onChange={e => setPreferredDate(e.target.value)}
                type="date"
                min={new Date().toISOString().split("T")[0]}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block flex items-center gap-1"><Clock className="w-3 h-3" /> Time</label>
              <select
                value={preferredTime}
                onChange={e => setPreferredTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8] bg-white"
              >
                <option value="">Any time</option>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <FileText className="w-4 h-4 text-[#F7921A]" /> Notes / Description
          </div>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the issue or any special instructions…"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8] resize-none"
          />
        </div>

        {/* Assign technician */}
        {techs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <UserCheck className="w-4 h-4 text-[#F7921A]" /> Assign Technician <span className="text-gray-400 font-normal">(optional)</span>
            </div>
            <select
              value={technicianId}
              onChange={e => setTechnicianId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8] bg-white"
            >
              <option value="">— Assign later —</option>
              {techs.map(t => (
                <option key={t.id} value={t.id}>{t.name ?? t.email}</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <Link
            href="/dispatcher"
            className="flex-1 text-center py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 bg-[#F7921A] hover:bg-[#E07F10] disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors"
          >
            {saving ? "Creating…" : "Create Appointment"}
          </button>
        </div>
      </form>
    </div>
  );
}
