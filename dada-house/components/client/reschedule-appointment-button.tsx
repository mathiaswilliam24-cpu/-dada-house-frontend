"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2 } from "lucide-react";

type Win = { start: string; end: string; label: string };

/** Lets the customer move his own appointment to a real open arrival window (office notified automatically). */
export function RescheduleAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date(Date.now() + 864e5).toLocaleDateString("en-CA", { timeZone: "America/New_York" }));
  const [windows, setWindows] = useState<Win[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load(d: string) {
    setWindows(null); setPicked(null); setMsg(null);
    const r = await fetch(`/api/portal/appointments/${appointmentId}/reschedule?date=${d}`);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg({ ok: false, text: j.error ?? "Could not load the available times." }); setWindows([]); return; }
    setWindows(j.windows ?? []);
  }

  async function confirm() {
    if (!picked) return;
    setBusy(true); setMsg(null);
    const r = await fetch(`/api/portal/appointments/${appointmentId}/reschedule`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slotStart: picked }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: j.error ?? "Could not move your appointment. Please call (844) 928-0875." }); if (r.status === 409) load(date); return; }
    setMsg({ ok: true, text: j.message });
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => { setOpen(true); load(date); }} className="w-full py-3 border border-[#1B3FA8]/30 text-[#1B3FA8] bg-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
        <CalendarClock className="w-4 h-4" /> Reschedule this appointment
      </button>
    );
  }

  return (
    <div className="bg-white border border-[#1B3FA8]/30 rounded-xl p-4 space-y-3">
      <p className="font-semibold text-gray-900 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-[#1B3FA8]" /> Choose a new arrival window</p>
      <input type="date" value={date} min={new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })}
        onChange={(e) => { setDate(e.target.value); load(e.target.value); }}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      {windows === null ? (
        <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-[#1B3FA8]" /></div>
      ) : windows.length === 0 ? (
        <p className="text-sm text-gray-500">No open windows from this date. Try another date or call (844) 928-0875.</p>
      ) : (
        <div className="grid gap-2 max-h-64 overflow-y-auto">
          {windows.map((w) => (
            <button key={w.start} onClick={() => setPicked(w.start)}
              className={`text-left px-3 py-2 rounded-lg border text-sm ${picked === w.start ? "border-[#1B3FA8] bg-blue-50 font-semibold" : "border-gray-200"}`}>
              {w.label}
            </button>
          ))}
        </div>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      <div className="flex gap-2">
        <button onClick={confirm} disabled={!picked || busy} className="flex-1 py-2.5 rounded-lg bg-[#1B3FA8] disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-bold">
          {busy ? "Saving…" : "Confirm new time"}
        </button>
        <button onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm">Close</button>
      </div>
    </div>
  );
}
