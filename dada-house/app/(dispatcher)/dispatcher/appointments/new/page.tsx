"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, User, Phone, Mail, MapPin, Calendar, Clock, Wrench, FileText, UserCheck, CheckCircle, Copy, Send, ExternalLink, Search, X, UserPlus } from "lucide-react";
import Link from "next/link";

const SERVICES = ["Plumbing", "Air Conditioning", "Heating", "Remodeling", "Home Inspection", "Other"];
const TIMES = ["7:00 AM","8:00 AM","9:00 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM","6:00 PM","7:00 PM","Emergency"];

type Tech = { id: string; name: string | null; email: string };
type ClientResult = { name: string; phone: string; email: string; address: string; city: string; zipCode: string };
type Created = { id: string; appointmentNumber: string; name: string; service: string; confirmUrl: string; email: string };

export default function NewDispatcherAppointment() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [techs, setTechs] = useState<Tech[]>([]);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Client search
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [clientMode, setClientMode] = useState<"search" | "new">("search");
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced client search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (clientQuery.length < 2) { setClientResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/dispatcher/clients?q=${encodeURIComponent(clientQuery)}`);
        const d = await res.json();
        setClientResults(d.clients ?? []);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [clientQuery]);

  function selectClient(c: ClientResult) {
    setSelectedClient(c);
    setName(c.name);
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
    setAddress(c.address ?? "");
    setCity(c.city ?? "");
    setZipCode(c.zipCode ?? "");
    setClientQuery("");
    setClientResults([]);
    setClientMode("new"); // show fields filled in
  }

  function clearClient() {
    setSelectedClient(null);
    setName(""); setPhone(""); setEmail(""); setAddress(""); setCity(""); setZipCode("");
    setClientMode("search");
  }

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
      const d = await res.json();
      setCreated({ id: d.appointment.id, appointmentNumber: d.appointment.appointmentNumber, name, service, confirmUrl: d.confirmUrl, email });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!created) return;
    await navigator.clipboard.writeText(created.confirmUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (created) {
    return (
      <div className="max-w-md mx-auto space-y-5 pt-4">
        <div className="bg-white rounded-2xl border border-green-200 p-6 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Job Created!</h2>
          <p className="text-gray-500 text-sm mt-1">
            <strong>#{created.appointmentNumber}</strong> · {created.name} · {created.service}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Confirmation link to send to the client:</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <span className="flex-1 text-xs text-gray-600 truncate font-mono">{created.confirmUrl}</span>
            <a href={created.confirmUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-600 shrink-0">
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <button
            onClick={copyLink}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors ${copied ? "bg-green-500 text-white" : "bg-[#1B3FA8] hover:bg-[#1A3490] text-white"}`}
          >
            <Copy className="w-4 h-4" />
            {copied ? "Link Copied!" : "Copy Link"}
          </button>
          <p className="text-xs text-gray-400 text-center">Share via SMS, WhatsApp, or any channel</p>
        </div>

        {created.email && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-800 mb-1">Or send by email:</p>
            <p className="text-xs text-gray-500 mb-3">Will be sent to <strong>{created.email}</strong></p>
            <button
              onClick={async () => {
                setSendingEmail(true);
                await fetch(`/api/dispatcher/appointments/${created.id}/send-confirmation`, { method: "POST" });
                setEmailSent(true);
                setSendingEmail(false);
              }}
              disabled={sendingEmail || emailSent}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#F7921A] hover:bg-[#E07F10] disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors"
            >
              <Send className="w-4 h-4" />
              {emailSent ? "Email Sent ✓" : sendingEmail ? "Sending…" : "Send Confirmation Email"}
            </button>
          </div>
        )}

        <Link href="/dispatcher" className="block w-full text-center py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          Back to Schedule
        </Link>
      </div>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto space-y-6">
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

        {/* ── Client picker ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <User className="w-4 h-4 text-[#F7921A]" /> Client
            </div>
            {selectedClient && (
              <button type="button" onClick={clearClient} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <X className="w-3 h-3" /> Change client
              </button>
            )}
          </div>

          {/* Search bar (shown when no client selected) */}
          {!selectedClient && clientMode === "search" && (
            <div ref={searchRef} className="relative">
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-[#1B3FA8]">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  value={clientQuery}
                  onChange={e => setClientQuery(e.target.value)}
                  placeholder="Search by name, phone or email…"
                  className="flex-1 text-sm outline-none bg-transparent"
                  autoComplete="off"
                />
                {searching && <span className="text-xs text-gray-400">…</span>}
                {clientQuery && (
                  <button type="button" onClick={() => { setClientQuery(""); setClientResults([]); }} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Results dropdown */}
              {clientResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {clientResults.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectClient(c)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.phone}{c.email ? ` · ${c.email}` : ""}</p>
                      {c.address && <p className="text-xs text-gray-400">{c.address}, {c.city}</p>}
                    </button>
                  ))}
                </div>
              )}

              {/* New client button */}
              <button
                type="button"
                onClick={() => setClientMode("new")}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-[#F7921A] hover:text-[#F7921A] transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Add new client
              </button>
            </div>
          )}

          {/* Client fields (shown after selection or "Add new client") */}
          {(selectedClient || clientMode === "new") && (
            <div className="space-y-3">
              {selectedClient && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                  <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                  <p className="text-sm text-blue-800 font-medium">Existing client — fields pre-filled</p>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Full Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} required placeholder="John Smith"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> Phone *</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} required placeholder="(346) 000-0000" type="tel"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block flex items-center gap-1"><Mail className="w-3 h-3" /> Email <span className="text-gray-400">(optional)</span></label>
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="john@email.com" type="email"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Service Address ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
            <MapPin className="w-4 h-4 text-[#F7921A]" /> Service Address
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Street Address *</label>
            <input value={address} onChange={e => setAddress(e.target.value)} required placeholder="1234 Main St"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">City *</label>
              <input value={city} onChange={e => setCity(e.target.value)} required placeholder="Houston"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Zip Code *</label>
              <input value={zipCode} onChange={e => setZipCode(e.target.value)} required placeholder="77001" maxLength={10}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
            </div>
          </div>
        </div>

        {/* ── Service ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Wrench className="w-4 h-4 text-[#F7921A]" /> Service
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Service *</label>
              <select value={service} onChange={e => setService(e.target.value)} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8] bg-white">
                <option value="">Select…</option>
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Sub-service</label>
              <input value={subservice} onChange={e => setSubservice(e.target.value)} placeholder="e.g. Leak repair"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
            </div>
          </div>
        </div>

        {/* ── Schedule ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Calendar className="w-4 h-4 text-[#F7921A]" /> Schedule
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</label>
              <input value={preferredDate} onChange={e => setPreferredDate(e.target.value)} type="date"
                min={new Date().toISOString().split("T")[0]}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block flex items-center gap-1"><Clock className="w-3 h-3" /> Time</label>
              <select value={preferredTime} onChange={e => setPreferredTime(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8] bg-white">
                <option value="">Any time</option>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Notes ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <FileText className="w-4 h-4 text-[#F7921A]" /> Notes / Description
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Describe the issue or any special instructions…" rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8] resize-none" />
        </div>

        {/* ── Assign technician ─────────────────────────────────────────── */}
        {techs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <UserCheck className="w-4 h-4 text-[#F7921A]" /> Assign Technician <span className="text-gray-400 font-normal">(optional)</span>
            </div>
            <select value={technicianId} onChange={e => setTechnicianId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8] bg-white">
              <option value="">— Assign later —</option>
              {techs.map(t => <option key={t.id} value={t.id}>{t.name ?? t.email}</option>)}
            </select>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex gap-3 pb-8">
          <Link href="/dispatcher" className="flex-1 text-center py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-[#F7921A] hover:bg-[#E07F10] disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-colors">
            {saving ? "Creating…" : "Create Appointment"}
          </button>
        </div>
      </form>
    </div>
  );
}
