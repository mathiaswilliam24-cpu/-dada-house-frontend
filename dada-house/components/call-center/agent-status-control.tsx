"use client";

import { useEffect, useState } from "react";

const STATUSES = [
  { value: "AVAILABLE", label: "Available", color: "bg-green-500" },
  { value: "BUSY", label: "Busy", color: "bg-yellow-500" },
  { value: "ON_CALL", label: "On Call", color: "bg-orange-500" },
  { value: "AWAY", label: "Away", color: "bg-gray-400" },
  { value: "BREAK", label: "Break", color: "bg-purple-500" },
  { value: "OFFLINE", label: "Offline", color: "bg-gray-600" },
] as const;

type StatusValue = (typeof STATUSES)[number]["value"];

export function AgentStatusControl({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<StatusValue>("OFFLINE");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/call-center/status")
      .then((r) => r.json())
      .then((d) => { if (d.user?.agentStatus) setStatus(d.user.agentStatus); })
      .catch(() => {});
  }, []);

  async function handleChange(next: StatusValue) {
    setStatus(next);
    setSaving(true);
    try {
      await fetch("/api/call-center/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  const current = STATUSES.find((s) => s.value === status) ?? STATUSES[5];

  if (compact) {
    return (
      <div className="relative shrink-0">
        <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${current.color}`} />
        <select
          value={status}
          disabled={saving}
          onChange={(e) => handleChange(e.target.value as StatusValue)}
          className="bg-white/10 text-white text-xs rounded-lg pl-5 pr-1.5 py-1.5 appearance-none focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-60"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value} className="text-gray-900">{s.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="px-1">
      <label className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold block mb-1">Agent Status</label>
      <div className="relative">
        <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${current.color}`} />
        <select
          value={status}
          disabled={saving}
          onChange={(e) => handleChange(e.target.value as StatusValue)}
          className="w-full bg-white/10 text-white text-sm rounded-lg pl-7 pr-2 py-2 appearance-none focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-60"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value} className="text-gray-900">{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
