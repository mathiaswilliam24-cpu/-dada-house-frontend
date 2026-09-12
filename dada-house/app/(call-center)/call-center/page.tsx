"use client";

import { useEffect, useState, useCallback } from "react";
import { LiveQueue, type QueueCall } from "@/components/call-center/live-queue";
import { ActiveCallPanel } from "@/components/call-center/active-call-panel";
import { CustomerActionPanel } from "@/components/call-center/customer-action-panel";

export default function CallCenterPage() {
  const [calls, setCalls] = useState<QueueCall[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/call-center/queue", { cache: "no-store" });
    const d = await res.json();
    setCalls(d.activeCalls ?? []);
  }, []);

  useEffect(() => {
    fetch("/api/call-center/status").then((r) => r.json()).then((d) => setMyUserId(d.user?.id ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load]);

  const myActiveCall = calls.find((c) => c.status === "IN_PROGRESS" && c.agent?.id === myUserId) ?? null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Live Call Center</h1>
        <p className="text-gray-500 text-sm mt-0.5">Answer calls from the softphone in the bottom-right corner</p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr_260px] gap-4 items-start">
        <LiveQueue calls={calls} />
        <ActiveCallPanel call={myActiveCall} />
        <CustomerActionPanel call={myActiveCall} />
      </div>
    </div>
  );
}
