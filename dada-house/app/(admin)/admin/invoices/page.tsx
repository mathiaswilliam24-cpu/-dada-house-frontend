"use client";
import { useEffect, useState, useCallback } from "react";
import {
  FileText, DollarSign, Clock, CheckCircle, Plus, ChevronDown,
  Loader2, Search, ExternalLink, Send, RefreshCw, X,
} from "lucide-react";

type Invoice = {
  id: string; amount: number; status: "DRAFT" | "SENT" | "PAID"; notes: string | null;
  pdfUrl: string | null; paidAt: string | null; createdAt: string; dueDate: string | null;
  sentByName?: string | null;
  paymentMethod?: string | null;
  isTechnicianInvoice?: boolean;
  estimateNumber?: string;
  appointment: { id: string; appointmentNumber: string; name: string; phone: string; service: string; email: string };
};

const statusColor: Record<string, string> = {
  DRAFT: "text-gray-600 bg-gray-50 border-gray-200",
  SENT:  "text-blue-600 bg-blue-50 border-blue-200",
  PAID:  "text-green-600 bg-green-50 border-green-200",
};

const STATUS_TABS = ["ALL", "DRAFT", "SENT", "PAID"];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

type Appointment = { id: string; appointmentNumber: string; name: string; service: string };

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("ALL");
  const [q, setQ]               = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // New estimate/invoice modal
  const [showModal, setShowModal]         = useState(false);
  const [modalType, setModalType]         = useState<"estimate" | "invoice">("estimate");
  const [appointments, setAppointments]   = useState<Appointment[]>([]);
  const [apptSearch, setApptSearch]       = useState("");
  const [selectedAppt, setSelectedAppt]   = useState<Appointment | null>(null);
  const [estAmount, setEstAmount]         = useState("");
  const [estNotes, setEstNotes]           = useState("");
  const [estDueDate, setEstDueDate]       = useState("");
  const [creating, setCreating]           = useState(false);
  const [createError, setCreateError]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/invoices");
    const data = await res.json();
    setInvoices(data.invoices ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openModal(type: "estimate" | "invoice") {
    setModalType(type);
    setShowModal(true);
    setSelectedAppt(null); setEstAmount(""); setEstNotes(""); setEstDueDate(""); setCreateError("");
    const res = await fetch("/api/admin/appointments?limit=200");
    const data = await res.json();
    setAppointments(data.appointments ?? []);
  }

  async function createEstimate() {
    if (!selectedAppt || !estAmount) return;
    setCreating(true); setCreateError("");
    const status = modalType === "invoice" ? "SENT" : "DRAFT";
    const res = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointmentId: selectedAppt.id, amount: estAmount, notes: estNotes, dueDate: estDueDate, status }),
    });
    if (res.ok) {
      setShowModal(false);
      await load();
    } else {
      const data = await res.json();
      setCreateError(data.error ?? "Failed to create");
    }
    setCreating(false);
  }

  const filteredAppts = appointments.filter(a =>
    a.name.toLowerCase().includes(apptSearch.toLowerCase()) ||
    a.appointmentNumber.toLowerCase().includes(apptSearch.toLowerCase()) ||
    a.service.toLowerCase().includes(apptSearch.toLowerCase())
  );

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/admin/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(status === "PAID" ? { paidAt: new Date().toISOString() } : {}) }),
    });
    await load();
    setUpdating(null);
  }

  const visible = invoices.filter(inv => {
    const matchTab = tab === "ALL" || inv.status === tab;
    const matchQ = !q || inv.appointment.name.toLowerCase().includes(q.toLowerCase())
      || inv.appointment.appointmentNumber.toLowerCase().includes(q.toLowerCase())
      || inv.appointment.service.toLowerCase().includes(q.toLowerCase());
    return matchTab && matchQ;
  });

  const paid    = invoices.filter(i => i.status === "PAID");
  const pending = invoices.filter(i => i.status !== "PAID");
  const revenue = paid.reduce((s, i) => s + i.amount, 0);
  const outstanding = pending.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices & Estimates</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} · DRAFT = Estimate, SENT = Awaiting, PAID = Collected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => openModal("estimate")} className="flex items-center gap-2 px-4 py-2 border border-[#F97316] text-[#F97316] text-sm font-semibold rounded-xl hover:bg-orange-50 transition-colors">
            <Plus className="w-4 h-4" /> New Estimate
          </button>
          <button onClick={() => openModal("invoice")} className="flex items-center gap-2 px-4 py-2 bg-[#1B3FA8] text-white text-sm font-semibold rounded-xl hover:bg-[#1A3490] transition-colors">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Invoices", value: invoices.length.toString(), icon: FileText, color: "text-blue-600 bg-blue-50" },
          { label: "Paid",          value: paid.length.toString(),      icon: CheckCircle, color: "text-green-600 bg-green-50" },
          { label: "Outstanding",   value: pending.length.toString(),   icon: Clock, color: "text-orange-600 bg-orange-50" },
          { label: "Revenue",       value: fmt(revenue),               icon: DollarSign, color: "text-purple-600 bg-purple-50" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            {s.label === "Outstanding" && outstanding > 0 && (
              <p className="text-xs text-orange-500 mt-0.5">{fmt(outstanding)} pending</p>
            )}
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-gray-200 p-4 items-center">
        <div className="flex gap-1">
          {STATUS_TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${tab === t ? "bg-[#1B3FA8] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {t === "DRAFT" ? "Estimates (DRAFT)" : t === "SENT" ? "Sent" : t === "PAID" ? "Paid" : "All"}
              {t !== "ALL" && ` (${invoices.filter(i => i.status === t).length})`}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search customer, job, service…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F7921A]/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Job</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-gray-500">{inv.appointment.appointmentNumber}</p>
                      {inv.isTechnicianInvoice && (
                        <span className="inline-block text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium mt-0.5">Tech Invoice</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{inv.appointment.name}</p>
                      {inv.sentByName && (
                        <p className="text-xs text-blue-600 mt-0.5">Sent by {inv.sentByName}</p>
                      )}
                      {inv.paymentMethod && inv.paidAt && (
                        <p className="text-xs text-green-600">via {inv.paymentMethod === "CARD" ? "Card" : inv.paymentMethod}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{inv.appointment.service}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{fmt(inv.amount)}</p>
                      {inv.paidAt && (
                        <p className="text-xs text-green-600 mt-0.5">
                          Paid {new Date(inv.paidAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColor[inv.status]}`}>
                        {inv.status === "DRAFT" ? "ESTIMATE" : inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        {inv.pdfUrl && (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-[#1B3FA8] rounded-lg hover:bg-blue-50 transition-colors"
                            title="View PDF"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {updating === inv.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <div className="relative group">
                            <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                              Change <ChevronDown className="w-3 h-3" />
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10 hidden group-hover:block">
                              {inv.status !== "DRAFT" && (
                                <button
                                  onClick={() => updateStatus(inv.id, "DRAFT")}
                                  className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                                >
                                  Mark as Estimate
                                </button>
                              )}
                              {inv.status !== "SENT" && (
                                <button
                                  onClick={() => updateStatus(inv.id, "SENT")}
                                  className="w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-blue-50"
                                >
                                  <Send className="w-3 h-3 inline mr-1" />
                                  Mark as Sent
                                </button>
                              )}
                              {inv.status !== "PAID" && (
                                <button
                                  onClick={() => updateStatus(inv.id, "PAID")}
                                  className="w-full text-left px-3 py-2 text-xs text-green-600 hover:bg-green-50 font-medium"
                                >
                                  <CheckCircle className="w-3 h-3 inline mr-1" />
                                  Mark as Paid
                                </button>
                              )}
                              <div className="border-t border-gray-100 mt-1 pt-1">
                                <a
                                  href={`/admin/appointments?invoice=${inv.appointment.id}`}
                                  className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> View Job
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">No invoices found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Estimate Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{modalType === "invoice" ? "New Invoice" : "New Estimate"}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {modalType === "invoice" ? "Status: SENT — immediately visible to client" : "Status: DRAFT — visible only to you until sent"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Appointment search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Appointment</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={apptSearch}
                    onChange={e => { setApptSearch(e.target.value); setSelectedAppt(null); }}
                    placeholder="Search by name, job number, service…"
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                {apptSearch && !selectedAppt && (
                  <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    {filteredAppts.length === 0 ? (
                      <p className="p-3 text-sm text-gray-400">No appointments found</p>
                    ) : filteredAppts.slice(0, 8).map(a => (
                      <button
                        key={a.id}
                        onClick={() => { setSelectedAppt(a); setApptSearch(a.name); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-orange-50 border-b border-gray-50 last:border-0"
                      >
                        <p className="text-sm font-medium text-gray-900">{a.name}</p>
                        <p className="text-xs text-gray-400">{a.appointmentNumber} · {a.service}</p>
                      </button>
                    ))}
                  </div>
                )}
                {selectedAppt && (
                  <div className="mt-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800 font-medium">
                    ✓ {selectedAppt.appointmentNumber} — {selectedAppt.name} ({selectedAppt.service})
                  </div>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input
                  type="number"
                  value={estAmount}
                  onChange={e => setEstAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {/* Due date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (optional)</label>
                <input
                  type="date"
                  value={estDueDate}
                  onChange={e => setEstDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={estNotes}
                  onChange={e => setEstNotes(e.target.value)}
                  placeholder="Describe the work, materials, labor…"
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                />
              </div>

              {createError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{createError}</p>
              )}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={createEstimate}
                disabled={!selectedAppt || !estAmount || creating}
                className={`flex-1 px-4 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors ${modalType === "invoice" ? "bg-[#1B3FA8] hover:bg-[#1A3490]" : "bg-[#F97316] hover:bg-orange-600"}`}
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {modalType === "invoice" ? "Create Invoice" : "Create Estimate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
