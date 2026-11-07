"use client";
import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}

async function registerSubscription() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false;
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
    }));
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.toJSON().keys }),
  });
  return res.ok;
}

// Staff (dispatcher / call center / admin) opt-in for new-message push alerts.
// Already-granted browsers silently re-register so the subscription is tied to
// the currently logged-in account.
export function StaffPushPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted") {
      registerSubscription().catch(() => {});
    } else if (Notification.permission === "default") {
      try {
        if (localStorage.getItem("staff-push-dismissed") === "1") return;
      } catch {}
      setVisible(true);
    }
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") await registerSubscription();
    } catch {}
    setBusy(false);
    setVisible(false);
  }

  function dismiss() {
    try { localStorage.setItem("staff-push-dismissed", "1"); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:w-80 z-50 bg-white border border-gray-200 shadow-lg rounded-2xl p-4 flex items-start gap-3">
      <Bell className="w-5 h-5 text-[#F7921A] shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Get notified of new messages</p>
        <p className="text-xs text-gray-500 mt-0.5">Receive an alert on this device when a customer texts you.</p>
        <button
          onClick={enable}
          disabled={busy}
          className="mt-2 px-3 py-1.5 bg-[#1B3FA8] text-white text-xs font-semibold rounded-lg disabled:opacity-60"
        >
          {busy ? "Enabling…" : "Enable notifications"}
        </button>
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
    </div>
  );
}
