"use client";

import { Clock, PhoneIncoming, PhoneOutgoing, Star, RefreshCw } from "lucide-react";

export type QueueCall = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  fromNumber: string;
  toNumber: string;
  startedAt: string;
  customer: { id: string; firstName: string; lastName: string | null; phone: string; tags: string[] } | null;
  agent: { id: string; name: string | null } | null;
};

function secondsWaiting(startedAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

export function LiveQueue({ calls }: { calls: QueueCall[] }) {
  const waiting = calls.filter((c) => c.status === "RINGING");
  const active = calls.filter((c) => c.status === "IN_PROGRESS");

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
        <PhoneIncoming className="w-4 h-4" /> Call Queue
      </h2>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Waiting ({waiting.length})</p>
        <div className="space-y-2">
          {waiting.map((c) => (
            <div key={c.id} className="border border-orange-200 bg-orange-50 rounded-lg p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900">{c.customer ? `${c.customer.firstName} ${c.customer.lastName ?? ""}` : c.fromNumber}</p>
                {c.customer?.tags.includes("VIP") && <Star className="w-3.5 h-3.5 text-yellow-500" />}
              </div>
              <p className="text-xs text-gray-500">{c.fromNumber}</p>
              <p className="text-xs text-orange-600 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" /> {secondsWaiting(c.startedAt)}s waiting</p>
            </div>
          ))}
          {waiting.length === 0 && <p className="text-xs text-gray-400">No calls waiting</p>}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">In Progress ({active.length})</p>
        <div className="space-y-2">
          {active.map((c) => (
            <div key={c.id} className="border border-green-200 bg-green-50 rounded-lg p-2.5">
              <div className="flex items-center gap-2">
                {c.direction === "INBOUND" ? <PhoneIncoming className="w-3.5 h-3.5 text-green-600" /> : <PhoneOutgoing className="w-3.5 h-3.5 text-blue-600" />}
                <p className="text-sm font-semibold text-gray-900">{c.customer ? `${c.customer.firstName} ${c.customer.lastName ?? ""}` : c.fromNumber}</p>
              </div>
              <p className="text-xs text-gray-500">{c.agent?.name ?? "Unassigned"}</p>
            </div>
          ))}
          {active.length === 0 && <p className="text-xs text-gray-400">No active calls</p>}
        </div>
      </div>

      <p className="text-[10px] text-gray-300 flex items-center gap-1 pt-1"><RefreshCw className="w-3 h-3" /> Live, refreshes every few seconds</p>
    </div>
  );
}
