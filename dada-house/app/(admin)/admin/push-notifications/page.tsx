"use client";
import { useState } from "react";
import { Bell, Send, CheckCircle, Loader2 } from "lucide-react";

export default function AdminPushNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, userId: userId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setSent(true);
      setTitle(""); setBody(""); setUserId("");
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Push Notifications</h1>
        <p className="text-gray-500 text-sm mt-0.5">Send push notifications to users who have subscribed</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">How it works</p>
        <p>Notifications are sent via Web Push to all subscribed users, or to a specific user by ID. Users must have granted notification permission and be subscribed.</p>
      </div>

      <form onSubmit={send} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-[#1B3FA8]/10 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-[#1B3FA8]" />
          </div>
          <h3 className="font-semibold text-gray-900">Compose Notification</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Your technician is on the way!"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
          <textarea required rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="e.g. Alex will arrive in approximately 20 minutes."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User ID <span className="text-gray-400 font-normal">(optional — leave blank to send to all)</span></label>
          <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="Specific user ID"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

        <button type="submit" disabled={sending}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${sent ? "bg-green-600 text-white" : "bg-[#1B3FA8] text-white hover:bg-[#163291]"} disabled:opacity-60`}>
          {sending ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : sent ? <><CheckCircle className="w-4 h-4" />Sent!</> : <><Send className="w-4 h-4" />Send Notification</>}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Notification Examples</h3>
        <div className="space-y-2">
          {[
            { title: "Technician En Route", body: "Your DADA HOUSE technician is on the way! ETA: 25 minutes." },
            { title: "Job Completed", body: "Your service has been completed. Check your portal for the invoice." },
            { title: "Appointment Reminder", body: "Reminder: Your appointment is tomorrow at 10:00 AM." },
          ].map((ex, i) => (
            <button key={i} onClick={() => { setTitle(ex.title); setBody(ex.body); }}
              className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-[#1B3FA8]/30 hover:bg-blue-50/30 transition-colors">
              <p className="font-medium text-gray-900 text-sm">{ex.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{ex.body}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
