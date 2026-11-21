"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";

/** Lets the customer cancel their own appointment; the office and technician are notified automatically. */
export function CancelAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true); setError(null);
    const r = await fetch(`/api/portal/appointments/${appointmentId}/cancel`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: reason.trim() || undefined }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setError(d.error ?? "Could not cancel. Please call us at (844) 928-0875."); return; }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full py-3 border border-red-200 text-red-600 bg-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
        <XCircle className="w-4 h-4" /> Cancel this appointment
      </button>
    );
  }
  return (
    <div className="bg-white border border-red-200 rounded-xl p-4 space-y-3">
      <p className="font-semibold text-gray-900">Cancel this appointment?</p>
      <p className="text-sm text-gray-600">We will let your technician know. You will receive a confirmation by text{"/"}email.</p>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} disabled={busy}
        placeholder="Reason (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base resize-none" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={cancel} disabled={busy} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Yes, cancel
        </button>
        <button onClick={() => setOpen(false)} disabled={busy} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700">Keep it</button>
      </div>
    </div>
  );
}
