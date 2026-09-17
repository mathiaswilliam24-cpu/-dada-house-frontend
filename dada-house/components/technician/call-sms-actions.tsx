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
        <div className="mt-2 bg-white border border-gray-200 rounded-xl p-3 space-y-2 shadow-sm">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Type a message to the customer…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={send}
              disabled={sending || !text.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#1B3FA8] text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : sent ? "Sent!" : <><Send className="w-3.5 h-3.5" /> Send</>}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 border border-gray-200 rounded-lg text-xs text-gray-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
