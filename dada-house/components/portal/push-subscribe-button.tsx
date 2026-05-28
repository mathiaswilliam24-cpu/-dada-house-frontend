"use client";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";

export default function PushSubscribeButton() {
  const [status, setStatus] = useState<"idle" | "subscribing" | "subscribed" | "denied" | "unsupported">("idle");

  async function subscribe() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus("subscribing");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("denied");
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) { setStatus("unsupported"); return; }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
    });

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.toJSON().keys }),
    });
    setStatus("subscribed");
  }

  if (status === "subscribed") {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <Bell size={16} />
        <span className="text-sm font-medium">Notifications enabled</span>
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="flex items-center gap-2 text-red-500">
        <BellOff size={16} />
        <span className="text-sm">Notifications blocked. Enable them in your browser settings.</span>
      </div>
    );
  }
  if (status === "unsupported") {
    return <p className="text-sm text-gray-400">Push notifications are not supported in this browser.</p>;
  }

  return (
    <button onClick={subscribe} disabled={status === "subscribing"} className={buttonVariants({ variant: "outline" })}>
      <Bell size={16} className="mr-1.5" />
      {status === "subscribing" ? "Enabling…" : "Enable Push Notifications"}
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}
