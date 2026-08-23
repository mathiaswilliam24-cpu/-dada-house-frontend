"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  FileText, DollarSign, Clock, CheckCircle, Plus, ChevronDown,
  Loader2, Search, ExternalLink, Send, RefreshCw, X,
  Eye, Download, Mail, MessageSquare,
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

type PreviewInvoice = {
  id: string; amount: number; notes: string | null; dueDate: string | null; createdAt: string;
  lineItems: unknown;
  appointment: { name: string; phone: string; email: string; address: string; city: string; service: string; appointmentNumber: string };
};

type LI = { description: string; note?: string; rate: number; qty: number };
const pFmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const pDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function parseMeta(raw: unknown, fallbackService: string, fallbackAmount: number) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const m = raw as Record<string, unknown>;
    if (Array.isArray(m.items) && m.items.length > 0) {
      return { taxEnabled: m.taxEnabled !== false, taxRate: typeof m.taxRate === "number" ? m.taxRate : 8.25, items: m.items as LI[] };
    }
  }
  if (Array.isArray(raw) && raw.length > 0) return { taxEnabled: true, taxRate: 8.25, items: raw as LI[] };
  return { taxEnabled: true, taxRate: 8.25, items: [{ description: fallbackService, rate: fallbackAmount, qty: 1 }] };
}

function InvoicePreview({ inv }: { inv: PreviewInvoice }) {
  const { taxEnabled, taxRate, items } = parseMeta(inv.lineItems, inv.appointment.service, inv.amount);
  const subtotal = items.reduce((s, i) => s + i.rate * i.qty, 0);
  const tax   = taxEnabled ? subtotal * taxRate / 100 : 0;
  const total = subtotal + tax;
  const num = `INV${inv.id.slice(-6).toUpperCase()}`;
  const due = inv.dueDate ? pDate(inv.dueDate) : "On Receipt";

  return (
    <div style={{ background: "white", maxWidth: "700px", margin: "0 auto", fontFamily: "Arial, Helvetica, sans-serif", boxShadow: "0 2px 12px rgba(0,0,0,0.12)", borderRadius: "4px", overflow: "hidden" }}>
      <div style={{ height: "10px", background: "#1B3FA8" }} />
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", padding: "20px 32px 16px", borderBottom: "1px solid #e5e7eb", gap: "20px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo dada house.png" alt="DADA HOUSE" style={{ width: "90px", height: "auto", flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: "11px", color: "#374151", lineHeight: "1.6" }}>
          <div style={{ fontWeight: "bold", fontSize: "14px", color: "#111827", marginBottom: "3px" }}>DADA HOUSE LLC</div>
          <div><strong>TX:</strong> 7001 South Texas 6 STE 246, Houston TX 77083</div>
          <div><strong>NC:</strong> 106 Thompson St, Jacksonville NC 28540</div>
          <div>☎ (346) 649-9353 · customerservice@mydadahouse.com</div>
          <div style={{ color: "#1B3FA8" }}>www.dada-house.com</div>
        </div>
        <div style={{ textAlign: "right", fontSize: "11px", minWidth: "160px" }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#111827", letterSpacing: "2px" }}>INVOICE</div>
          <div style={{ fontWeight: "700", fontSize: "13px", color: "#1B3FA8", marginBottom: "10px" }}>{num}</div>
          <div style={{ color: "#6b7280" }}>DATE <strong style={{ color: "#111827" }}>{pDate(inv.createdAt)}</strong></div>
          <div style={{ color: "#6b7280" }}>DUE <strong style={{ color: "#111827" }}>{due}</strong></div>
          <div style={{ fontWeight: "700", color: "#111827", marginTop: "6px" }}>BALANCE DUE: USD {pFmt(total)}</div>
        </div>
      </div>
      {/* Bill To */}
      <div style={{ padding: "14px 32px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: "10px", fontWeight: "600", color: "#6b7280", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>BILL TO</div>
        <div style={{ fontWeight: "700", fontSize: "14px", color: "#111827" }}>{inv.appointment.name}</div>
        {inv.appointment.phone && <div style={{ fontSize: "12px", color: "#374151" }}>{inv.appointment.phone}</div>}
        {inv.appointment.email && <div style={{ fontSize: "12px", color: "#374151" }}>{inv.appointment.email}</div>}
      </div>
      {/* Items table */}
      <div style={{ padding: "0 32px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "14px" }}>
          <thead>
            <tr style={{ background: "#1B3FA8", color: "white" }}>
              <th style={{ padding: "9px 12px", textAlign: "left", fontSize: "10px", fontWeight: "700" }}>DESCRIPTION</th>
              <th style={{ padding: "9px 12px", textAlign: "right", fontSize: "10px", fontWeight: "700" }}>RATE</th>
              <th style={{ padding: "9px 12px", textAlign: "center", fontSize: "10px", fontWeight: "700" }}>QTY</th>
              {taxEnabled && <th style={{ padding: "9px 12px", textAlign: "right", fontSize: "10px", fontWeight: "700" }}>TAX</th>}
              <th style={{ padding: "9px 12px", textAlign: "right", fontSize: "10px", fontWeight: "700" }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "12px", fontSize: "12px", color: "#111827" }}>
                  <div style={{ fontWeight: "500", whiteSpace: "pre-wrap" }}>{item.description}</div>
                  {item.note && <div style={{ color: "#6b7280", fontSize: "11px", whiteSpace: "pre-wrap" }}>{item.note}</div>}
                </td>
                <td style={{ padding: "12px", textAlign: "right", fontSize: "12px" }}>{pFmt(item.rate)}</td>
                <td style={{ padding: "12px", textAlign: "center", fontSize: "12px" }}>{item.qty}</td>
                {taxEnabled && (
                  <td style={{ padding: "12px", textAlign: "right", fontSize: "12px" }}>
                    <div>{pFmt(item.rate * item.qty * taxRate / 100)}</div>
                    <div style={{ fontSize: "10px", color: "#6b7280" }}>{taxRate}%</div>
                  </td>
                )}
                <td style={{ padding: "12px", textAlign: "right", fontSize: "12px", fontWeight: "600" }}>{pFmt(item.rate * item.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Payment + totals */}
      <div style={{ display: "flex", padding: "18px 32px", gap: "32px", borderTop: "1px solid #e5e7eb", marginTop: "8px" }}>
        <div style={{ flex: 1, fontSize: "12px" }}>
          <div style={{ fontWeight: "700", fontSize: "13px", color: "#111827", marginBottom: "6px" }}>Payment Info</div>
          <div style={{ fontSize: "10px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", marginBottom: "3px" }}>PAYMENT INSTRUCTIONS</div>
          <div style={{ color: "#374151" }}>Zelle : payment@mydadahouse.com</div>
          {inv.notes && <><div style={{ fontSize: "10px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", marginTop: "10px", marginBottom: "3px" }}>NOTES</div><div style={{ color: "#374151", whiteSpace: "pre-wrap" }}>{inv.notes}</div></>}
        </div>
        <div style={{ minWidth: "200px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr><td style={{ padding: "4px 0", fontSize: "11px", color: "#6b7280", fontWeight: "600" }}>SUBTOTAL</td><td style={{ padding: "4px 0", fontSize: "12px", textAlign: "right" }}>{pFmt(subtotal)}</td></tr>
              {taxEnabled
                ? <tr><td style={{ padding: "4px 0", fontSize: "11px", color: "#6b7280", fontWeight: "600" }}>TAX ({taxRate}%)</td><td style={{ padding: "4px 0", fontSize: "12px", textAlign: "right" }}>{pFmt(tax)}</td></tr>
                : <tr><td style={{ padding: "4px 0", fontSize: "11px", color: "#6b7280", fontWeight: "600" }}>TAX</td><td style={{ padding: "4px 0", fontSize: "12px", textAlign: "right", color: "#9ca3af" }}>—</td></tr>
              }
              <tr style={{ borderTop: "2px solid #e5e7eb" }}><td style={{ padding: "7px 0 4px", fontSize: "12px", fontWeight: "700", color: "#111827" }}>TOTAL</td><td style={{ padding: "7px 0 4px", fontSize: "13px", fontWeight: "700", textAlign: "right" }}>{pFmt(total)}</td></tr>
              <tr><td colSpan={2} style={{ padding: "3px 0" }}><div style={{ background: "#f0f4ff", borderRadius: "5px", padding: "7px 10px", display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: "11px", color: "#1B3FA8", fontWeight: "700" }}>BALANCE DUE</span><span style={{ fontSize: "13px", color: "#1B3FA8", fontWeight: "700" }}>USD {pFmt(total)}</span></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
      {/* Footer */}
      <div style={{ margin: "0 32px", borderTop: "1px solid #e5e7eb", padding: "14px 0 24px" }}>
        <p style={{ fontSize: "11px", color: "#374151", margin: "0 0 4px" }}>It is a pleasure to serve you.</p>
        <p style={{ fontSize: "11px", color: "#374151", margin: "0 0 4px" }}>Our services encompass air conditioning, heating, plumbing, and remodeling.</p>
        <p style={{ fontSize: "11px", color: "#374151", margin: 0 }}>For additional inquiries, please contact us at (910) 685-8042 or visit our website at www.dada-house.com.</p>
      </div>
    </div>
  );
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("ALL");
  const [q, setQ]               = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  // New estimate/invoice modal
  const [showModal, setShowModal]         = useState(false);
  const [modalType, setModalType]         = useState<"estimate" | "invoice">("estimate");
  const [modalStep, setModalStep]         = useState<"client" | "details">("client");

  // Step 1 — client
  const [clientMode, setClientMode]       = useState<"search" | "new" | "appointment">("search");
  const [clientSearch, setClientSearch]   = useState("");
  const [clientResults, setClientResults] = useState<{name:string;phone:string;email:string;address:string;city:string;zipCode:string}[]>([]);
  const [clientSearching, setClientSearching] = useState(false);
  const [selectedClient, setSelectedClient]   = useState<{name:string;phone:string;email:string;address:string;city:string} | null>(null);
  const [newClient, setNewClient]         = useState({ name:"", phone:"", email:"", address:"", city:"Houston" });
  // OR select existing appointment
  const [appointments, setAppointments]   = useState<Appointment[]>([]);
  const [apptSearch, setApptSearch]       = useState("");
  const [selectedAppt, setSelectedAppt]   = useState<Appointment | null>(null);

  // Step 2 — details
  const [estService, setEstService]       = useState("");
  const [estNotes, setEstNotes]           = useState("");
  const [estDueDate, setEstDueDate]       = useState("");
  const [creating, setCreating]           = useState(false);
  const [createError, setCreateError]     = useState("");
  // Line items + tax
  const [lineItems, setLineItems]         = useState<LI[]>([{ description: "", note: "", rate: 0, qty: 1 }]);
  const [taxEnabled, setTaxEnabled]       = useState(true);
  const [taxRate, setTaxRate]             = useState(8.25);

  const clientSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preview + send
  const [previewInv, setPreviewInv] = useState<PreviewInvoice | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [sendingSMS, setSendingSMS]   = useState<string | null>(null);
  const [emailSent, setEmailSent]     = useState<Set<string>>(new Set());
  const [smsSent, setSmsSent]         = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/invoices");
    const data = await res.json();
    setInvoices(data.invoices ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openPreview(id: string) {
    setPreviewLoading(true);
    setPreviewInv(null);
    try {
      const res = await fetch(`/api/admin/invoices/${id}`);
      const d = await res.json();
      if (d.invoice) setPreviewInv(d.invoice);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function sendInvoiceEmail(id: string) {
    setSendingEmail(id);
    try {
      await fetch(`/api/admin/invoices/${id}/send-email`, { method: "POST" });
      setEmailSent(prev => new Set([...prev, id]));
      setTimeout(() => setEmailSent(prev => { const s = new Set(prev); s.delete(id); return s; }), 4000);
    } finally { setSendingEmail(null); }
  }

  async function sendInvoiceSMS(id: string) {
    setSendingSMS(id);
    try {
      await fetch(`/api/admin/invoices/${id}/send-sms`, { method: "POST" });
      setSmsSent(prev => new Set([...prev, id]));
      setTimeout(() => setSmsSent(prev => { const s = new Set(prev); s.delete(id); return s; }), 4000);
    } finally { setSendingSMS(null); }
  }

  async function openModal(type: "estimate" | "invoice") {
    setModalType(type);
    setModalStep("client");
    setClientMode("search");
    setClientSearch(""); setClientResults([]);
    setSelectedClient(null);
    setNewClient({ name:"", phone:"", email:"", address:"", city:"Houston" });
    setSelectedAppt(null); setApptSearch("");
    setEstService(""); setEstNotes(""); setEstDueDate(""); setCreateError("");
    setLineItems([{ description: "", note: "", rate: 0, qty: 1 }]);
    setTaxEnabled(true); setTaxRate(8.25);
    setShowModal(true);
    const res = await fetch("/api/admin/appointments?limit=200");
    const data = await res.json();
    setAppointments(data.appointments ?? []);
  }

  // Debounced client search
  useEffect(() => {
    if (clientSearchTimer.current) clearTimeout(clientSearchTimer.current);
    if (clientSearch.length < 2) { setClientResults([]); return; }
    clientSearchTimer.current = setTimeout(async () => {
      setClientSearching(true);
      try {
        const res = await fetch(`/api/dispatcher/clients?q=${encodeURIComponent(clientSearch)}`);
        const d = await res.json();
        setClientResults(d.clients ?? []);
      } finally { setClientSearching(false); }
    }, 300);
  }, [clientSearch]);

  async function createEstimate() {
    const validItems = lineItems.filter(i => i.description.trim() && i.rate > 0);
    if (validItems.length === 0) { setCreateError("Add at least one line item with a description and rate."); return; }
    setCreating(true); setCreateError("");
    const status = modalType === "invoice" ? "SENT" : "DRAFT";
    const liMeta = { taxEnabled, taxRate, items: validItems };
    const sub = validItems.reduce((s, i) => s + i.rate * i.qty, 0);
    const tax = taxEnabled ? sub * taxRate / 100 : 0;
    const totalAmt = (sub + tax).toFixed(2);

    let body: Record<string, unknown> = { amount: totalAmt, notes: estNotes, dueDate: estDueDate, status, lineItems: liMeta };

    if (clientMode === "appointment" && selectedAppt) {
      body.appointmentId = selectedAppt.id;
    } else {
      const c = clientMode === "new" ? newClient : selectedClient;
      if (!c?.name) { setCreateError("Please select or enter a client"); setCreating(false); return; }
      body = { ...body, customerName: c.name, customerPhone: c.phone, customerEmail: c.email, customerAddress: c.address, customerCity: c.city, service: estService || validItems[0].description.slice(0, 60) || "Service" };
    }

    const res = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
                      <div className="flex items-center gap-1 justify-end flex-wrap">
                        {/* Preview */}
                        <button
                          onClick={() => openPreview(inv.id)}
                          className="p-1.5 text-gray-400 hover:text-[#1B3FA8] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Download PDF */}
                        {!inv.isTechnicianInvoice && (
                          <a
                            href={`/print/invoice/${inv.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        {/* Send email */}
                        {!inv.isTechnicianInvoice && inv.appointment.email && (
                          <button
                            onClick={() => sendInvoiceEmail(inv.id)}
                            disabled={sendingEmail === inv.id}
                            className={`p-1.5 rounded-lg transition-colors ${emailSent.has(inv.id) ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}
                            title="Send by email"
                          >
                            {sendingEmail === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : emailSent.has(inv.id) ? <CheckCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                          </button>
                        )}
                        {/* Send SMS */}
                        {!inv.isTechnicianInvoice && inv.appointment.phone && (
                          <button
                            onClick={() => sendInvoiceSMS(inv.id)}
                            disabled={sendingSMS === inv.id}
                            className={`p-1.5 rounded-lg transition-colors ${smsSent.has(inv.id) ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}
                            title="Send by SMS"
                          >
                            {sendingSMS === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : smsSent.has(inv.id) ? <CheckCircle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                          </button>
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

      {/* Invoice Preview Modal */}
      {(previewLoading || previewInv) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-4 border-b border-gray-100 shrink-0 bg-[#1B3FA8] rounded-t-2xl">
              <span className="text-white font-semibold text-sm flex-1">
                {previewInv ? `Invoice INV${previewInv.id.slice(-6).toUpperCase()}` : "Loading…"}
              </span>
              {previewInv && (
                <>
                  <a
                    href={`/print/invoice/${previewInv.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F97316] text-white text-xs font-semibold rounded-lg hover:bg-orange-600"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </a>
                  {previewInv.appointment.email && (
                    <button
                      onClick={() => sendInvoiceEmail(previewInv.id)}
                      disabled={sendingEmail === previewInv.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${emailSent.has(previewInv.id) ? "bg-green-500 text-white" : "bg-white/20 text-white hover:bg-white/30"}`}
                    >
                      {sendingEmail === previewInv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : emailSent.has(previewInv.id) ? <CheckCircle className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                      {emailSent.has(previewInv.id) ? "Sent!" : "Email"}
                    </button>
                  )}
                  {previewInv.appointment.phone && (
                    <button
                      onClick={() => sendInvoiceSMS(previewInv.id)}
                      disabled={sendingSMS === previewInv.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${smsSent.has(previewInv.id) ? "bg-green-500 text-white" : "bg-white/20 text-white hover:bg-white/30"}`}
                    >
                      {sendingSMS === previewInv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : smsSent.has(previewInv.id) ? <CheckCircle className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                      {smsSent.has(previewInv.id) ? "Sent!" : "SMS"}
                    </button>
                  )}
                </>
              )}
              <button onClick={() => setPreviewInv(null)} className="p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
              {previewLoading ? (
                <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
              ) : previewInv ? (
                <InvoicePreview inv={previewInv} />
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* New Estimate / Invoice Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{modalType === "invoice" ? "New Invoice" : "New Estimate"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${modalStep === "client" ? "bg-[#1B3FA8] text-white" : "bg-gray-100 text-gray-400"}`}>1. Client</span>
                  <span className="text-gray-300 text-xs">›</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${modalStep === "details" ? "bg-[#1B3FA8] text-white" : "bg-gray-100 text-gray-400"}`}>2. Details</span>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* ── STEP 1: Client ── */}
              {modalStep === "client" && (
                <>
                  {/* Mode tabs */}
                  <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                    {([["search","Existing Client"],["new","New Client"],["appointment","By Appointment"]] as const).map(([m, label]) => (
                      <button key={m} onClick={() => { setClientMode(m); setSelectedClient(null); setSelectedAppt(null); setClientSearch(""); setApptSearch(""); }}
                        className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-colors ${clientMode === m ? "bg-white text-[#1B3FA8] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Existing client search */}
                  {clientMode === "search" && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                          placeholder="Search by name, phone or email…"
                          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200" />
                        {clientSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
                      </div>
                      {clientResults.length > 0 && !selectedClient && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                          {clientResults.map((c, i) => (
                            <button key={i} onClick={() => { setSelectedClient(c); setClientSearch(c.name); setClientResults([]); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0">
                              <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                              <p className="text-xs text-gray-500">{c.phone}{c.email ? ` · ${c.email}` : ""}</p>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedClient && (
                        <div className="flex items-center justify-between px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                          <div>
                            <p className="text-sm font-semibold text-blue-900">{selectedClient.name}</p>
                            <p className="text-xs text-blue-600">{selectedClient.phone}{selectedClient.email ? ` · ${selectedClient.email}` : ""}</p>
                          </div>
                          <button onClick={() => { setSelectedClient(null); setClientSearch(""); }} className="text-blue-400 hover:text-blue-600"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* New client */}
                  {clientMode === "new" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-500 font-medium mb-1 block">Full Name *</label>
                        <input value={newClient.name} onChange={e => setNewClient(c => ({...c, name: e.target.value}))} placeholder="John Smith"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 font-medium mb-1 block">Phone</label>
                          <input value={newClient.phone} onChange={e => setNewClient(c => ({...c, phone: e.target.value}))} placeholder="(346) 000-0000" type="tel"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 font-medium mb-1 block">Email</label>
                          <input value={newClient.email} onChange={e => setNewClient(c => ({...c, email: e.target.value}))} placeholder="john@email.com" type="email"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 font-medium mb-1 block">Address</label>
                        <input value={newClient.address} onChange={e => setNewClient(c => ({...c, address: e.target.value}))} placeholder="1234 Main St, Houston"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                      </div>
                    </div>
                  )}

                  {/* By appointment */}
                  {clientMode === "appointment" && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={apptSearch} onChange={e => { setApptSearch(e.target.value); setSelectedAppt(null); }}
                          placeholder="Search by name, job #, service…"
                          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200" />
                      </div>
                      {apptSearch && !selectedAppt && (
                        <div className="border border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                          {filteredAppts.length === 0
                            ? <p className="p-3 text-sm text-gray-400">No appointments found</p>
                            : filteredAppts.slice(0, 8).map(a => (
                              <button key={a.id} onClick={() => { setSelectedAppt(a); setApptSearch(a.name); }}
                                className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0">
                                <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                                <p className="text-xs text-gray-400">{a.appointmentNumber} · {a.service}</p>
                              </button>
                            ))
                          }
                        </div>
                      )}
                      {selectedAppt && (
                        <div className="flex items-center justify-between px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                          <div>
                            <p className="text-sm font-semibold text-blue-900">{selectedAppt.name}</p>
                            <p className="text-xs text-blue-600">#{selectedAppt.appointmentNumber} · {selectedAppt.service}</p>
                          </div>
                          <button onClick={() => { setSelectedAppt(null); setApptSearch(""); }} className="text-blue-400 hover:text-blue-600"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 2: Details ── */}
              {modalStep === "details" && (() => {
                const sub = lineItems.reduce((s, i) => s + (i.rate || 0) * (i.qty || 1), 0);
                const tax = taxEnabled ? sub * taxRate / 100 : 0;
                const total = sub + tax;
                return (
                  <div className="space-y-4">
                    {/* Client recap */}
                    <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                      <p className="font-semibold text-gray-800">
                        {clientMode === "appointment" ? selectedAppt?.name : clientMode === "new" ? newClient.name : selectedClient?.name}
                      </p>
                      {clientMode === "appointment" && <p className="text-xs text-gray-500">#{selectedAppt?.appointmentNumber} · {selectedAppt?.service}</p>}
                    </div>

                    {/* Line items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Line Items *</label>
                        <button type="button" onClick={() => setLineItems(prev => [...prev, { description: "", note: "", rate: 0, qty: 1 }])}
                          className="text-xs text-[#1B3FA8] font-semibold hover:underline">+ Add item</button>
                      </div>
                      <div className="space-y-3">
                        {lineItems.map((item, i) => (
                          <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-gray-500">Item {i + 1}</span>
                              {lineItems.length > 1 && (
                                <button type="button" onClick={() => setLineItems(prev => prev.filter((_, j) => j !== i))}
                                  className="text-xs text-red-400 hover:text-red-600">Remove</button>
                              )}
                            </div>
                            <textarea
                              value={item.description}
                              onChange={e => setLineItems(prev => prev.map((it, j) => j === i ? { ...it, description: e.target.value } : it))}
                              placeholder="Description (use Enter for multiple lines)…"
                              rows={3}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y bg-white"
                            />
                            <textarea
                              value={item.note ?? ""}
                              onChange={e => setLineItems(prev => prev.map((it, j) => j === i ? { ...it, note: e.target.value } : it))}
                              placeholder="Additional note (optional)…"
                              rows={1}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y bg-white"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">Rate ($)</label>
                                <input type="number" min="0" step="0.01" value={item.rate || ""}
                                  onChange={e => setLineItems(prev => prev.map((it, j) => j === i ? { ...it, rate: parseFloat(e.target.value) || 0 } : it))}
                                  placeholder="0.00"
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">Qty</label>
                                <input type="number" min="1" step="1" value={item.qty || 1}
                                  onChange={e => setLineItems(prev => prev.map((it, j) => j === i ? { ...it, qty: parseInt(e.target.value) || 1 } : it))}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tax */}
                    <div className="flex items-center gap-4 px-3 py-3 border border-gray-200 rounded-xl bg-gray-50">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={taxEnabled} onChange={e => setTaxEnabled(e.target.checked)} className="w-4 h-4 accent-[#1B3FA8]" />
                        <span className="text-sm font-medium text-gray-700">Apply Tax</span>
                      </label>
                      {taxEnabled && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <input type="number" min="0" max="100" step="0.01" value={taxRate}
                            onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      )}
                    </div>

                    {/* Total preview */}
                    <div className="flex justify-between items-center px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                      <span className="text-sm font-semibold text-blue-800">
                        {taxEnabled ? `Subtotal ${pFmt(sub)} + Tax ${pFmt(tax)} =` : "Total:"}
                      </span>
                      <span className="text-lg font-bold text-[#1B3FA8]">{pFmt(total)}</span>
                    </div>

                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Due Date (optional)</label>
                      <input type="date" value={estDueDate} onChange={e => setEstDueDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Notes (optional)</label>
                      <textarea value={estNotes} onChange={e => setEstNotes(e.target.value)} placeholder="Additional work notes, terms…" rows={2}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
                    </div>
                    {createError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{createError}</p>}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
              {modalStep === "client" ? (
                <>
                  <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50">Cancel</button>
                  <button
                    onClick={() => setModalStep("details")}
                    disabled={clientMode === "search" && !selectedClient || clientMode === "new" && !newClient.name || clientMode === "appointment" && !selectedAppt}
                    className="flex-1 px-4 py-2.5 bg-[#1B3FA8] text-white text-sm font-semibold rounded-xl hover:bg-[#1A3490] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setModalStep("client")} className="flex-1 px-4 py-2.5 border border-gray-200 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50">← Back</button>
                  <button
                    onClick={createEstimate}
                    disabled={creating || lineItems.filter(i => i.description.trim() && i.rate > 0).length === 0}
                    className={`flex-1 px-4 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors ${modalType === "invoice" ? "bg-[#1B3FA8] hover:bg-[#1A3490]" : "bg-[#F97316] hover:bg-orange-600"}`}
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {modalType === "invoice" ? "Create Invoice" : "Create Estimate"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
