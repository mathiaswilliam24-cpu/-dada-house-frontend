"use client";
import { useEffect, useState, useCallback } from "react";
import { Bell, Mail, MessageSquare, CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";

type Log = {
  id: string; type: string; status: string; recipient: string;
  sentAt: string; error: string | null;
  appointment: { appointmentNumber: string; service: string; name: string } | null;
};

const TYPE_FILTERS = ["ALL", "SMS", "EMAIL", "PUSH"];
const STATUS_FILTERS = ["ALL", "sent", "failed"];

const typeIcon: Record<string, React.ReactNode> = {
  SMS:   <MessageSquare className="w-3.5 h-3.5" />,
  EMAIL: <Mail className="w-3.5 h-3.5" />,
  PUSH:  <Bell className="w-3.5 h-3.5" />,
};

const typeColor: Record<string, string> = {
  SMS:   "text-green-700 bg-green-50 border-green-200",
  EMAIL: "text-blue-700 bg-blue-50 border-blue-200",
  PUSH:  "text-purple-700 bg-purple-50 border-purple-200",
};

export default function AdminNotificationsPage() {
  const [logs, setLogs]   = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [type, setType]     = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage]     = useState(1);
  const [pages, setPages]   = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (type !== "ALL") params.set("type", type);
    if (status !== "ALL") params.set("status", status);
    const res = await fetch(`/api/admin/notifications?${params}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [type, status, page]);

  useEffect(() => { load(); }, [load]);

  const sentCount   = logs.filter(l => l.status === "sent").length;
  const failedCount = logs.filter(l => l.status === "failed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notification Logs</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} notification{total !== 1 ? "s" : ""} total</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",   value: total,      color: "text-gray-600 bg-gray-50",   icon: Bell },
          { label: "SMS",     value: logs.filter(l=>l.type==="SMS").length,   color: "text-green-600 bg-green-50",  icon: MessageSquare },
          { label: "Email",   value: logs.filter(l=>l.type==="EMAIL").length, color: "text-blue-600 bg-blue-50",    icon: Mail },
          { label: "Failed",  value: failedCount,color: "text-red-600 bg-red-50",     icon: XCircle },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Type:</span>
          {TYPE_FILTERS.map(t => (
            <button
              key={t}
              onClick={() => { setType(t); setPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${type === t ? "bg-[#1B3FA8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">Status:</span>
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${status === s ? "bg-[#1B3FA8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {s === "ALL" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Appointment</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Error</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${typeColor[log.type] ?? "text-gray-600 bg-gray-50 border-gray-200"}`}>
                          {typeIcon[log.type] ?? <Bell className="w-3.5 h-3.5" />}
                          {log.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{log.recipient}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {log.appointment ? (
                          <div>
                            <p className="text-xs font-mono text-gray-500">{log.appointment.appointmentNumber}</p>
                            <p className="text-xs text-gray-400">{log.appointment.name} · {log.appointment.service}</p>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.status === "sent" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                            <XCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {log.error ? (
                          <span className="text-xs text-red-500 truncate max-w-[200px] block" title={log.error}>
                            {log.error}
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(log.sentAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No notifications found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">Page {page} of {pages}</p>
                <div className="flex gap-1.5">
                  {page > 1 && (
                    <button onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200">Previous</button>
                  )}
                  {page < pages && (
                    <button onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs bg-[#1B3FA8] text-white rounded-lg">Next</button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
