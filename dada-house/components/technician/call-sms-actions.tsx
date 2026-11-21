"use client";
import { useState } from "react";
import { Send, X, Loader2 } from "lucide-react";

/**
 * Replaces plain `tel:` links so the customer sees DADA HOUSE's number, not the
 * technician's personal cell. Rings the technician's own phone first (via
 * app/api/technician/jobs/[id]/call/route.ts); once they answer, Twilio bridges
 * them to the customer showing the DADA HOUSE caller ID.
 */
export function CallButton({ jobId, className, children }: { jobId: string; className?: string; children: React.ReactNode }) {
  const [calling, setCalling] = useState(false);

  async function handleCall(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (calling) return;
    setCalling(true);
    try {
      const res = await fetch(`/api/technician/jobs/${jobId}/call`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(d.error ?? "Failed to start call.");
        return;
      }
      alert("Calling your phone now — answer to connect to the customer.");
    } finally {
      setCalling(false);
    }
  }

  return (
    <button type="button" onClick={handleCall} disabled={calling} className={className}>
      {children}
    </button>
  );
}

/** Replaces plain `sms:` links — sends via the DADA HOUSE Twilio number (DNC-checked,
 *  thread-logged) instead of opening the technician's personal Messages app. */
const QUICK = ["I’m on my way.", "I’m here, at your door.", "I’m running a few minutes late."];

export function MessageButton({ jobId, className, children }: { jobId: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    const res = await fetch(`/api/technician/jobs/${jobId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const d = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(d.error ?? "Failed to send message.");
      return;
    }
    setText("");
    setSent(true);
    setTimeout(() => { setSent(false); setOpen(false); }, 1500);
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        className={className}
      >
        {children}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => !sending && setOpen(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Message the customer</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1 text-gray-500"><X className="w-6 h-6" /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button key={q} type="button" onClick={() => setText(q)} className="px-3 py-2 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">{q}</button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              autoFocus
              placeholder="Type a message to the customer…"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg leading-relaxed text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={send}
              disabled={sending || !text.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#1B3FA8] text-white rounded-xl text-base font-bold disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : sent ? "Sent!" : <><Send className="w-5 h-5" /> Send</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
