"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Save, Upload, ChevronDown, UserCheck, X } from "lucide-react";

const STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

interface Technician { id: string; name: string | null; }

interface Props {
  id: string;
  currentStatus: string;
  currentNotes: string | null;
  currentTechnicianId?: string | null;
  invoiceAmount?: number | null;
  onUpdated?: () => void;
}

export function AppointmentActions({
  id,
  currentStatus,
  currentNotes,
  currentTechnicianId,
  invoiceAmount,
  onUpdated,
}: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [technicianId, setTechnicianId] = useState(currentTechnicianId ?? "");
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [amount, setAmount] = useState(invoiceAmount?.toString() ?? "");
  const [pdfUrl, setPdfUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open && technicians.length === 0) {
      fetch("/api/admin/users/technicians")
        .then((r) => r.json())
        .then((d) => setTechnicians(Array.isArray(d.technicians) ? d.technicians : []))
        .catch(() => {});
    }
  }, [open, technicians.length]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes,
          technicianId: technicianId || null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdated?.();
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleInvoice = async () => {
    if (!amount) return;
    setSavingInvoice(true);
    try {
      await fetch(`/api/admin/appointments/${id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          pdfUrl: pdfUrl || null,
          status: "SENT",
        }),
      });
      onUpdated?.();
      router.refresh();
    } finally {
      setSavingInvoice(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors bg-white"
      >
        Actions
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-lg px-4 pb-4 pt-3 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Manage Appointment</p>
            <button onClick={() => setOpen(false)} className="p-0.5 rounded hover:bg-gray-100 text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F7921A]/30 focus:border-[#F7921A]"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Technician */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> Assign Technician
            </label>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F7921A]/30 focus:border-[#F7921A]"
            >
              <option value="">— Unassigned —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name ?? t.id}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Internal Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#F7921A]/30 focus:border-[#F7921A]"
              placeholder="Add notes for the client..."
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1B3FA8] text-white rounded-lg text-xs font-medium hover:bg-[#1B3FA8]/90 transition-colors disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>

          {/* Invoice section */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-600 mb-2">Invoice</p>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount ($)"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#F7921A]/30 focus:border-[#F7921A]"
              />
            </div>
            <input
              type="url"
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
              placeholder="PDF URL (optional)"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-[#F7921A]/30 focus:border-[#F7921A]"
            />
            <button
              onClick={handleInvoice}
              disabled={savingInvoice || !amount}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#F7921A] text-white rounded-lg text-xs font-medium hover:bg-[#F7921A]/90 transition-colors disabled:opacity-60"
            >
              <Upload className="w-3.5 h-3.5" />
              {savingInvoice ? "Sending..." : "Send Invoice"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
