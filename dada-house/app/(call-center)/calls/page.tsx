"use client";

import { useEffect, useState, useCallback } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing, Loader2, PlayCircle, Voicemail, Bot, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { formatCallCenterTime } from "@/lib/utils";

type CallRow = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  disposition: string | null;
  fromNumber: string;
  toNumber: string;
  startedAt: string;
  durationSeconds: number | null;
  customer: { id: string; firstName: string; lastName: string | null } | null;
  agent: { id: string; name: string | null } | null;
  appointment: { id: string; appointmentNumber: string; service: string } | null;
  recording: { url: string } | null;
  voicemail: { url: string } | null;
  aiSummary: string | null;
  aiTranscript: string | null;
  aiRecordingUrl: string | null;
};

const DISPOSITIONS = [
  "BOOKED_JOB", "EXISTING_JOB_UPDATE", "BILLING_QUESTION", "GENERAL_INQUIRY",
  "COMPLAINT", "WRONG_NUMBER", "SPAM", "VOICEMAIL_LEFT", "NO_ANSWER",
  "TRANSFERRED_TO_VAPI", "OTHER",
];

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function CallsPage() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState("");
  const [status, setStatus] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (direction) params.set("direction", direction);
    if (status) params.set("status", status);
    try {
      const res = await fetch(`/api/calls?${params.toString()}`);
      const d = await res.json();
      setCalls(d.calls ?? []);
    } finally {
      setLoading(false);
    }
  }, [direction, status]);

  useEffect(() => { load(); }, [load]);

  async function updateDisposition(callId: string, disposition: string) {
    setCalls((cs) => cs.map((c) => (c.id === callId ? { ...c, disposition } : c)));
    await fetch(`/api/calls/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disposition }),
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Call History</h1>
        <p className="text-gray-500 text-sm mt-0.5">All inbound and outbound calls</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 flex gap-3">
        <select value={direction} onChange={(e) => setDirection(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
          <option value="">All directions</option>
          <option value="INBOUND">Inbound</option>
          <option value="OUTBOUND">Outbound</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="NO_ANSWER">No Answer</option>
          <option value="VOICEMAIL">Voicemail</option>
          <option value="BUSY">Busy</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Caller</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Disposition</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Media</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {calls.map((c) => {
                  const hasAiData = !!(c.aiSummary || c.aiTranscript);
                  return (
                  <>
                  <tr
                    key={c.id}
                    className={`hover:bg-gray-50 ${hasAiData ? "cursor-pointer" : ""}`}
                    onClick={() => hasAiData && setExpandedId(expandedId === c.id ? null : c.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.direction === "INBOUND" ? <PhoneIncoming className="w-4 h-4 text-green-500" /> : <PhoneOutgoing className="w-4 h-4 text-blue-500" />}
                        <div>
                          {c.customer ? (
                            <Link href={`/customers/${c.customer.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-[#1B3FA8] hover:underline">
                              {c.customer.firstName} {c.customer.lastName ?? ""}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-800">{c.direction === "INBOUND" ? c.fromNumber : c.toNumber}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatCallCenterTime(c.startedAt)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDuration(c.durationSeconds)}</td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {c.agent?.name ?? (hasAiData ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                          <Bot className="w-3 h-3" /> Emma (AI)
                        </span>
                      ) : "—")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{c.status}</span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={c.disposition ?? ""}
                        onChange={(e) => updateDisposition(c.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                      >
                        <option value="">—</option>
                        {DISPOSITIONS.map((d) => <option key={d} value={d}>{d.replace(/_/g, " ")}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.recording && (
                          <a href={c.recording.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-[#1B3FA8]"><PlayCircle className="w-4 h-4" /></a>
                        )}
                        {c.voicemail && (
                          <a href={c.voicemail.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-[#F7921A]"><Voicemail className="w-4 h-4" /></a>
                        )}
                        {hasAiData && (expandedId === c.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />)}
                      </div>
                    </td>
                  </tr>
                  {expandedId === c.id && hasAiData && (
                    <tr className="bg-purple-50/40">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="flex items-start gap-2 mb-2">
                          <Bot className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">Emma's Call Summary</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.aiSummary || "(No summary generated for this call — see full transcript below.)"}</p>
                          </div>
                        </div>
                        {c.appointment && (
                          <Link href={`/customers/${c.customer?.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3FA8] bg-blue-50 px-2.5 py-1 rounded-full hover:underline ml-6">
                            📅 Booked: #{c.appointment.appointmentNumber} — {c.appointment.service}
                          </Link>
                        )}
                        {c.aiRecordingUrl && (
                          <a href={c.aiRecordingUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-purple-700 ml-6 hover:underline">
                            <PlayCircle className="w-3.5 h-3.5" /> Listen to AI call recording
                          </a>
                        )}
                        {c.aiTranscript && (
                          <details className="mt-2 ml-6">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:underline">Full transcript</summary>
                            <p className="text-xs text-gray-600 whitespace-pre-wrap mt-2 bg-white rounded-lg p-3 border border-gray-100">{c.aiTranscript}</p>
                          </details>
                        )}
                      </td>
                    </tr>
                  )}
                  </>
                  );
                })}
                {calls.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <Phone className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No calls found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
