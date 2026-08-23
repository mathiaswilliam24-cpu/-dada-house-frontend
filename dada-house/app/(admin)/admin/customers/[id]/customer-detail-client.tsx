"use client";
import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Mail, Phone, Calendar, FileText, Star, Home,
  CreditCard, Plus, X, Loader2, CheckCircle, Download, MessageSquare,
  Trash2, Eye, AlertTriangle, Printer, Pencil, DollarSign, Image as ImageIcon, Wrench,
  UserPlus, Copy, Check,
} from "lucide-react";

const JobMediaUploader = dynamic(() => import("@/components/admin/job-media-uploader"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────
type Appt = {
  id: string; appointmentNumber: string; service: string; subservice: string | null;
  status: string; notes: string | null; photos: string[];
  createdAt: string; preferredDate: string | null; preferredTime: string | null;
  address: string; city: string; description: string | null;
  technician: { id: string; name: string } | null;
  invoice: { id: string; amount: number; status: string; paidAt: string | null } | null;
};
type Review = {
  id: string; rating: number; content: string; service: string; createdAt: string; approved: boolean;
};
type Property = {
  id: string; address: string; city: string; zipCode: string; type: string; sqft: number | null;
};
type ServicePlan = {
  id: string; status: string;
  plan: { name: string; price: number; interval: string };
};
type Customer = {
  id: string; name: string | null; email: string; phone: string | null;
  createdAt: string; role: string;
  appointments: Appt[];
  reviews: Review[];
  properties: Property[];
  servicePlans: ServicePlan[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtD = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const statusColor: Record<string, string> = {
  PENDING:     "text-yellow-700 bg-yellow-50",
  CONFIRMED:   "text-blue-700 bg-blue-50",
  IN_PROGRESS: "text-purple-700 bg-purple-50",
  COMPLETED:   "text-green-700 bg-green-50",
  CANCELLED:   "text-red-700 bg-red-50",
};

const SERVICES = [
  "AC Repair","AC Installation","Heating Repair","Heating Installation",
  "Plumbing","Remodeling","General Inspection","Emergency Service","Other",
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
      ))}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CustomerDetailClient({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [customer, setCustomer]           = useState<Customer | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");

  // New Appointment modal
  const [showApptModal, setShowApptModal] = useState(false);
  const [apptForm, setApptForm]           = useState({ service: "", subservice: "", address: "", city: "Houston", preferredDate: "", preferredTime: "", description: "", status: "CONFIRMED", notes: "", photos: [] as string[] });
  const [apptSaving, setApptSaving]       = useState(false);
  const [apptError, setApptError]         = useState("");

  // New Invoice modal
  const [showInvModal, setShowInvModal]   = useState(false);
  const [invApptId, setInvApptId]         = useState("");
  const [invNotes, setInvNotes]           = useState("");
  const [invDue, setInvDue]               = useState("");
  const [invSaving, setInvSaving]         = useState(false);
  const [invError, setInvError]           = useState("");
  // Line items + tax
  const [invItems, setInvItems]           = useState<{description:string;note:string;rate:number;qty:number}[]>([{description:"",note:"",rate:0,qty:1}]);
  const [invTaxEnabled, setInvTaxEnabled] = useState(true);
  const [invTaxRate, setInvTaxRate]       = useState(8.25);

  // Invoice send actions
  const [sendingEmail, setSendingEmail]   = useState<string | null>(null);
  const [sendingSMS, setSendingSMS]       = useState<string | null>(null);
  const [emailSent, setEmailSent]         = useState<Set<string>>(new Set());
  const [smsSent, setSmsSent]             = useState<Set<string>>(new Set());

  // Edit invoice modal
  type LI = { description: string; note: string; rate: number; qty: number };
  const [editInvId, setEditInvId]         = useState<string | null>(null);
  const [editInvItems, setEditInvItems]   = useState<LI[]>([]);
  const [editInvTaxEnabled, setEditInvTaxEnabled] = useState(true);
  const [editInvTaxRate, setEditInvTaxRate]       = useState(8.25);
  const [editInvNotes, setEditInvNotes]   = useState("");
  const [editInvDue, setEditInvDue]       = useState("");
  const [editInvLoading, setEditInvLoading] = useState(false);
  const [editInvSaving, setEditInvSaving] = useState(false);
  const [editInvError, setEditInvError]   = useState("");

  // Delete invoice
  const [deleteInvId, setDeleteInvId]     = useState<string | null>(null);
  const [deletingInv, setDeletingInv]     = useState(false);

  // Mark invoice as paid
  const [payDropdown, setPayDropdown]     = useState<string | null>(null);
  const [payingInv, setPayingInv]         = useState<string | null>(null);

  // Edit appointment modal
  const [editAppt, setEditAppt]           = useState<Appt | null>(null);
  const [editApptForm, setEditApptForm]   = useState({ service: "", subservice: "", preferredDate: "", preferredTime: "", address: "", city: "", description: "", status: "PENDING", notes: "", photos: [] as string[] });
  const [editApptSaving, setEditApptSaving] = useState(false);
  const [editApptError, setEditApptError] = useState("");

  // Delete appointment
  const [deleteApptId, setDeleteApptId]   = useState<string | null>(null);
  const [deletingAppt, setDeletingAppt]   = useState(false);

  // Review actions
  const [reviewBusy, setReviewBusy]       = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Convert walk-in to account
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertPw, setConvertPw]               = useState("");
  const [convertShowPw, setConvertShowPw]       = useState(false);
  const [convertLoading, setConvertLoading]     = useState(false);
  const [convertError, setConvertError]         = useState("");
  const [convertDone, setConvertDone]           = useState<{ userId: string; email: string; linked: number; alreadyExisted: boolean } | null>(null);
  const [copied, setCopied]                     = useState(false);

  async function convertToAccount(e: React.FormEvent) {
    e.preventDefault();
    setConvertLoading(true); setConvertError("");
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/convert`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: convertPw }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error");
      setConvertDone(d);
      await load();
    } catch (e) { setConvertError(e instanceof Error ? e.message : "Error"); }
    finally { setConvertLoading(false); }
  }

  function copyCredentials() {
    if (!convertDone) return;
    navigator.clipboard.writeText(`Email: ${convertDone.email}\nPassword: ${convertPw}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`);
      const d = await res.json();
      if (d.user) setCustomer(d.user);
      else setError("Customer not found");
    } catch { setError("Failed to load"); }
    finally { setLoading(false); }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  // ── Appointment creation ───────────────────────────────────────────────────
  function openApptModal() {
    setApptForm({ service: "", subservice: "", address: customer?.properties[0]?.address ?? "", city: customer?.properties[0]?.city ?? "Houston", preferredDate: "", preferredTime: "", description: "", status: "CONFIRMED", notes: "", photos: [] });
    setApptError(""); setShowApptModal(true);
  }
  async function saveAppt(e: React.FormEvent) {
    e.preventDefault(); setApptSaving(true); setApptError("");
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: customer?.name ?? "", phone: customer?.phone ?? "", email: customer?.email ?? "", ...apptForm }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Error"); }
      setShowApptModal(false);
      await load();
    } catch (e) { setApptError(e instanceof Error ? e.message : "Error"); }
    finally { setApptSaving(false); }
  }

  // ── Invoice creation ──────────────────────────────────────────────────────
  function openInvModal() {
    setInvApptId(""); setInvNotes(""); setInvDue(""); setInvError("");
    setInvItems([{description:"",note:"",rate:0,qty:1}]);
    setInvTaxEnabled(true); setInvTaxRate(8.25);
    setShowInvModal(true);
  }
  async function saveInv(e: React.FormEvent) {
    e.preventDefault();
    setInvError("");
    const validItems = invItems.filter(i => i.description.trim() && i.rate > 0);
    if (validItems.length === 0) { setInvError("Add at least one item with a description and rate."); return; }
    setInvSaving(true);
    const liMeta = { taxEnabled: invTaxEnabled, taxRate: invTaxRate, items: validItems };
    const sub = validItems.reduce((s, i) => s + i.rate * i.qty, 0);
    const tax = invTaxEnabled ? sub * invTaxRate / 100 : 0;
    const totalAmt = (sub + tax).toFixed(2);
    const body: Record<string, unknown> = { amount: totalAmt, notes: invNotes, dueDate: invDue, status: "SENT", lineItems: liMeta };
    if (invApptId) {
      body.appointmentId = invApptId;
    } else {
      body.userId = customerId;
      body.customerName = customer?.name ?? customer?.email ?? "Client";
      body.customerPhone = customer?.phone ?? "";
      body.customerEmail = customer?.email ?? "";
      body.service = validItems[0].description.slice(0, 60);
    }
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Error"); }
      setShowInvModal(false); await load();
    } catch (e) { setInvError(e instanceof Error ? e.message : "Error"); }
    finally { setInvSaving(false); }
  }

  // ── Invoice send ──────────────────────────────────────────────────────────
  async function sendEmail(invId: string) {
    setSendingEmail(invId);
    await fetch(`/api/admin/invoices/${invId}/send-email`, { method: "POST" });
    setEmailSent(p => new Set([...p, invId]));
    setTimeout(() => setEmailSent(p => { const s = new Set(p); s.delete(invId); return s; }), 4000);
    setSendingEmail(null);
  }
  async function sendSMS(invId: string) {
    setSendingSMS(invId);
    await fetch(`/api/admin/invoices/${invId}/send-sms`, { method: "POST" });
    setSmsSent(p => new Set([...p, invId]));
    setTimeout(() => setSmsSent(p => { const s = new Set(p); s.delete(invId); return s; }), 4000);
    setSendingSMS(null);
  }

  // ── Edit invoice ─────────────────────────────────────────────────────────
  async function openEditInv(invId: string) {
    setEditInvId(invId); setEditInvLoading(true); setEditInvError("");
    try {
      const res = await fetch(`/api/admin/invoices/${invId}`);
      const d = await res.json();
      const inv = d.invoice;
      // Parse lineItems meta
      let items: LI[] = [{ description: inv.appointment?.service ?? "", note: "", rate: inv.amount, qty: 1 }];
      let taxEnabled = true; let taxRate = 8.25;
      if (inv.lineItems && typeof inv.lineItems === "object" && !Array.isArray(inv.lineItems)) {
        const m = inv.lineItems as Record<string, unknown>;
        if (Array.isArray(m.items) && m.items.length > 0) {
          items = (m.items as LI[]).map(i => ({ description: i.description, note: i.note ?? "", rate: i.rate, qty: i.qty }));
          taxEnabled = m.taxEnabled !== false;
          taxRate = typeof m.taxRate === "number" ? m.taxRate : 8.25;
        }
      } else if (Array.isArray(inv.lineItems) && inv.lineItems.length > 0) {
        items = (inv.lineItems as LI[]).map(i => ({ description: i.description, note: i.note ?? "", rate: i.rate, qty: i.qty }));
      }
      setEditInvItems(items);
      setEditInvTaxEnabled(taxEnabled); setEditInvTaxRate(taxRate);
      setEditInvNotes(inv.notes ?? "");
      setEditInvDue(inv.dueDate ? inv.dueDate.split("T")[0] : "");
    } catch { setEditInvError("Failed to load invoice"); }
    finally { setEditInvLoading(false); }
  }
  async function saveEditInv(e: React.FormEvent) {
    e.preventDefault();
    const validItems = editInvItems.filter(i => i.description.trim() && i.rate > 0);
    if (validItems.length === 0) { setEditInvError("Add at least one item."); return; }
    setEditInvSaving(true); setEditInvError("");
    const liMeta = { taxEnabled: editInvTaxEnabled, taxRate: editInvTaxRate, items: validItems };
    const sub = validItems.reduce((s, i) => s + i.rate * i.qty, 0);
    const tax = editInvTaxEnabled ? sub * editInvTaxRate / 100 : 0;
    try {
      const res = await fetch(`/api/admin/invoices/${editInvId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineItems: liMeta, amount: (sub + tax).toFixed(2), notes: editInvNotes, dueDate: editInvDue || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Error"); }
      setEditInvId(null); await load();
    } catch (e) { setEditInvError(e instanceof Error ? e.message : "Error"); }
    finally { setEditInvSaving(false); }
  }

  // ── Delete invoice ────────────────────────────────────────────────────────
  async function deleteInvoice() {
    if (!deleteInvId) return;
    setDeletingInv(true);
    await fetch(`/api/admin/invoices/${deleteInvId}`, { method: "DELETE" });
    setDeleteInvId(null); setDeletingInv(false); await load();
  }

  // ── Mark invoice as paid ──────────────────────────────────────────────────
  async function markPaid(invId: string, method: string) {
    setPayingInv(invId); setPayDropdown(null);
    await fetch(`/api/admin/invoices/${invId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paidAt: new Date().toISOString(), paymentMethod: method }),
    });
    setPayingInv(null); await load();
  }

  // ── Edit appointment ──────────────────────────────────────────────────────
  function openEditAppt(appt: Appt) {
    setEditAppt(appt);
    setEditApptForm({
      service: appt.service, subservice: appt.subservice ?? "",
      preferredDate: appt.preferredDate ? appt.preferredDate.split("T")[0] : "",
      preferredTime: appt.preferredTime ?? "", address: appt.address,
      city: appt.city, description: appt.description ?? "",
      status: appt.status, notes: appt.notes ?? "", photos: appt.photos ?? [],
    });
    setEditApptError("");
  }
  async function saveEditAppt(e: React.FormEvent) {
    e.preventDefault(); setEditApptSaving(true); setEditApptError("");
    try {
      const res = await fetch(`/api/admin/appointments/${editAppt!.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editApptForm, preferredDate: editApptForm.preferredDate || null, preferredTime: editApptForm.preferredTime || null, subservice: editApptForm.subservice || null, description: editApptForm.description || null, notes: editApptForm.notes || null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Error"); }
      setEditAppt(null); await load();
    } catch (e) { setEditApptError(e instanceof Error ? e.message : "Error"); }
    finally { setEditApptSaving(false); }
  }

  // ── Delete appointment ────────────────────────────────────────────────────
  async function deleteAppointment() {
    if (!deleteApptId) return;
    setDeletingAppt(true);
    await fetch(`/api/admin/appointments/${deleteApptId}`, { method: "DELETE" });
    setDeleteApptId(null); setDeletingAppt(false); await load();
  }

  // ── Review actions ────────────────────────────────────────────────────────
  async function toggleReview(reviewId: string, approve: boolean) {
    setReviewBusy(reviewId);
    await fetch(`/api/admin/reviews/${reviewId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ approved: approve }),
    });
    await load(); setReviewBusy(null);
  }
  async function deleteReview(reviewId: string) {
    setReviewBusy(reviewId);
    await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
    setDeleteConfirm(null); await load(); setReviewBusy(null);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-[#1B3FA8]" />
    </div>
  );
  if (error || !customer) return (
    <div className="text-center py-20 text-red-500">{error || "Not found"}</div>
  );

  const totalSpent = customer.appointments
    .filter(a => a.invoice?.status === "PAID")
    .reduce((s, a) => s + (a.invoice?.amount ?? 0), 0);
  const completed = customer.appointments.filter(a => a.status === "COMPLETED").length;
  const invoices  = customer.appointments.filter(a => a.invoice);
  const apptWithoutInvoice = customer.appointments.filter(a => !a.invoice);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back link */}
      <div>
        <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Link>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#1B3FA8] flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-white">
              {(customer.name ?? customer.email)[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{customer.name ?? "(No name)"}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
              <span className="flex items-center gap-1.5 text-sm text-gray-500"><Mail className="w-3.5 h-3.5" /> {customer.email}</span>
              {customer.phone && <span className="flex items-center gap-1.5 text-sm text-gray-500"><Phone className="w-3.5 h-3.5" /> {customer.phone}</span>}
              <span className="flex items-center gap-1.5 text-sm text-gray-500"><Calendar className="w-3.5 h-3.5" /> Joined {fmtD(customer.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Stats + Annual Report */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="text-center px-4 py-2 bg-blue-50 rounded-xl">
            <p className="text-xl font-bold text-blue-700">{customer.appointments.length}</p>
            <p className="text-xs text-blue-500">Appointments</p>
          </div>
          <div className="text-center px-4 py-2 bg-green-50 rounded-xl">
            <p className="text-xl font-bold text-green-700">{fmt(totalSpent)}</p>
            <p className="text-xs text-green-500">Total Spent</p>
          </div>
          <div className="text-center px-4 py-2 bg-orange-50 rounded-xl">
            <p className="text-xl font-bold text-orange-700">{completed}</p>
            <p className="text-xs text-orange-500">Completed</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {customerId.startsWith("appt:") && (
              <button
                onClick={() => { setShowConvertModal(true); setConvertPw(""); setConvertError(""); setConvertDone(null); }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Create Account
              </button>
            )}
            <a
              href={`/print/customer-report/${customerId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1B3FA8] text-white text-sm font-semibold rounded-xl hover:bg-[#1A3490] transition-colors"
            >
              <Printer className="w-4 h-4" /> Annual Report
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Appointments */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1B3FA8]" /> Appointments ({customer.appointments.length})
              </h2>
              <button
                onClick={openApptModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F7921A] text-white text-xs font-semibold rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Appointment
              </button>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {customer.appointments.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">No appointments yet</div>
              ) : customer.appointments.map(appt => (
                <div key={appt.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{appt.service}</p>
                      {appt.subservice && <span className="text-xs text-gray-400">· {appt.subservice}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400 font-mono">{appt.appointmentNumber}</span>
                      {appt.technician && <span className="text-xs text-blue-600">{appt.technician.name}</span>}
                      <span className="text-xs text-gray-400">{fmtD(appt.createdAt)}</span>
                      {appt.preferredDate && <span className="text-xs text-gray-500">📅 {fmtD(appt.preferredDate)}</span>}
                    </div>
                    {appt.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{appt.description}</p>}
                    <div className="flex items-center gap-2 mt-0.5">
                      {appt.photos?.length > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-orange-500"><ImageIcon className="w-3 h-3" /> {appt.photos.length}</span>
                      )}
                      {appt.notes && (
                        <span className="flex items-center gap-0.5 text-xs text-green-600"><Wrench className="w-3 h-3" /> notes</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {appt.invoice && (
                      <span className="text-xs font-semibold text-gray-700">{fmt(appt.invoice.amount)}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[appt.status] ?? "text-gray-600 bg-gray-50"}`}>
                      {appt.status.replace("_", " ")}
                    </span>
                    <Link
                      href={`/admin/appointments?q=${appt.appointmentNumber}`}
                      className="p-1.5 text-gray-400 hover:text-[#1B3FA8] hover:bg-blue-50 rounded-lg"
                      title="Open appointment"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <button onClick={() => openEditAppt(appt)}
                      className="p-1.5 text-gray-400 hover:text-[#1B3FA8] hover:bg-blue-50 rounded-lg"
                      title="Edit appointment">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteApptId(appt.id)}
                      className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      title="Delete appointment">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Invoices */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#1B3FA8]" /> Invoices ({invoices.length})
              </h2>
              <button
                onClick={openInvModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1B3FA8] text-white text-xs font-semibold rounded-lg hover:bg-[#1A3490] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Invoice
              </button>
            </div>
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {invoices.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">No invoices yet</div>
              ) : invoices.map(appt => {
                const inv = appt.invoice!;
                return (
                  <div key={appt.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{appt.service}</p>
                      <p className="text-xs text-gray-400">{fmtD(appt.createdAt)}</p>
                      {inv.paidAt && <p className="text-xs text-green-600 mt-0.5">Paid {fmtD(inv.paidAt)}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-sm font-bold text-gray-900">{fmt(inv.amount)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.status === "PAID" ? "text-green-700 bg-green-50" : inv.status === "SENT" ? "text-blue-700 bg-blue-50" : "text-gray-600 bg-gray-50"}`}>
                        {inv.status}
                      </span>
                      {/* Download PDF */}
                      <a href={`/print/invoice/${inv.id}`} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg" title="Download PDF">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      {/* Send Email */}
                      {customer.email && (
                        <button onClick={() => sendEmail(inv.id)} disabled={sendingEmail === inv.id}
                          className={`p-1.5 rounded-lg transition-colors ${emailSent.has(inv.id) ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}`}
                          title="Send by email">
                          {sendingEmail === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : emailSent.has(inv.id) ? <CheckCircle className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {/* Send SMS */}
                      {customer.phone && (
                        <button onClick={() => sendSMS(inv.id)} disabled={sendingSMS === inv.id}
                          className={`p-1.5 rounded-lg transition-colors ${smsSent.has(inv.id) ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}
                          title="Send by SMS">
                          {sendingSMS === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : smsSent.has(inv.id) ? <CheckCircle className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      {/* Edit Invoice */}
                      <button onClick={() => openEditInv(inv.id)}
                        className="p-1.5 text-gray-400 hover:text-[#1B3FA8] hover:bg-blue-50 rounded-lg"
                        title="Edit invoice">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {/* Mark Paid */}
                      {inv.status !== "PAID" && (
                        <div className="relative">
                          <button onClick={() => setPayDropdown(payDropdown === inv.id ? null : inv.id)} disabled={payingInv === inv.id}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                            title="Mark as paid">
                            {payingInv === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                          </button>
                          {payDropdown === inv.id && (
                            <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[130px]">
                              {["Check", "Zelle", "Cash", "Cash App"].map(method => (
                                <button key={method} onClick={() => markPaid(inv.id, method)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                  {method}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Delete Invoice */}
                      <button onClick={() => setDeleteInvId(inv.id)}
                        className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        title="Delete invoice">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Reviews */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Star className="w-4 h-4 text-[#1B3FA8]" /> Reviews ({customer.reviews.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {customer.reviews.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs">No reviews submitted</div>
              ) : customer.reviews.map(rev => (
                <div key={rev.id} className="px-5 py-3.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <StarRow rating={rev.rating} />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${rev.approved ? "text-green-700 bg-green-50" : "text-gray-500 bg-gray-100"}`}>
                      {rev.approved ? "Published" : "Pending"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 line-clamp-3">{rev.content}</p>
                  <p className="text-xs text-gray-400">{rev.service} · {fmtD(rev.createdAt)}</p>
                  <div className="flex gap-1.5 pt-0.5">
                    {rev.approved ? (
                      <button
                        onClick={() => toggleReview(rev.id, false)}
                        disabled={reviewBusy === rev.id}
                        className="flex-1 py-1 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg disabled:opacity-50"
                      >
                        {reviewBusy === rev.id ? "…" : "Unpublish"}
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleReview(rev.id, true)}
                        disabled={reviewBusy === rev.id}
                        className="flex-1 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg disabled:opacity-50"
                      >
                        {reviewBusy === rev.id ? "…" : "✓ Publish Online"}
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(rev.id)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete review"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Properties */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Home className="w-4 h-4 text-[#1B3FA8]" /> Properties ({customer.properties.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {customer.properties.length === 0 ? (
                <div className="py-5 text-center text-gray-400 text-xs">No properties registered</div>
              ) : customer.properties.map(prop => (
                <div key={prop.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-gray-900">{prop.address}</p>
                  <p className="text-xs text-gray-500">{prop.city}, TX {prop.zipCode}</p>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{prop.type}</span>
                    {prop.sqft && <span className="text-xs text-gray-400">· {prop.sqft.toLocaleString()} sqft</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Service Plans */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#1B3FA8]" /> Service Plans
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {customer.servicePlans.length === 0 ? (
                <div className="py-5 text-center text-gray-400 text-xs">No active subscriptions</div>
              ) : customer.servicePlans.map(sp => (
                <div key={sp.id} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-gray-900">{sp.plan.name}</p>
                  <p className="text-xs text-gray-500">{fmt(sp.plan.price)}/{sp.plan.interval}</p>
                  <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${sp.status === "ACTIVE" ? "text-green-700 bg-green-50" : "text-gray-600 bg-gray-50"}`}>
                    {sp.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── New Appointment Modal ──────────────────────────────────────────── */}
      {showApptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">New Appointment</h2>
                <p className="text-xs text-gray-400 mt-0.5">For {customer.name ?? customer.email}</p>
              </div>
              <button onClick={() => setShowApptModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <form onSubmit={saveAppt} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Service *</label>
                  <select value={apptForm.service} onChange={e => setApptForm(f => ({...f, service: e.target.value}))} required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="">Select a service…</option>
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Status</label>
                  <select value={apptForm.status} onChange={e => setApptForm(f => ({...f, status: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Sub-service / Detail</label>
                <input value={apptForm.subservice} onChange={e => setApptForm(f => ({...f, subservice: e.target.value}))} placeholder="e.g. Filter replacement, Pipe leak…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Preferred Date</label>
                  <input type="date" value={apptForm.preferredDate} onChange={e => setApptForm(f => ({...f, preferredDate: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Preferred Time</label>
                  <select value={apptForm.preferredTime} onChange={e => setApptForm(f => ({...f, preferredTime: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="">Any time</option>
                    <option value="Morning (8am-12pm)">Morning (8am-12pm)</option>
                    <option value="Afternoon (12pm-5pm)">Afternoon (12pm-5pm)</option>
                    <option value="Evening (5pm-8pm)">Evening (5pm-8pm)</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Address</label>
                <input value={apptForm.address} onChange={e => setApptForm(f => ({...f, address: e.target.value}))} placeholder="1234 Main St"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Client Request / Description</label>
                <textarea value={apptForm.description} onChange={e => setApptForm(f => ({...f, description: e.target.value}))} rows={2}
                  placeholder="Describe the issue or work needed…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Work Notes (visible to client)</label>
                <textarea value={apptForm.notes} onChange={e => setApptForm(f => ({...f, notes: e.target.value}))} rows={3}
                  placeholder="What was done, parts replaced, recommendations…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-2 block">Photos & Videos</label>
                <JobMediaUploader
                  value={apptForm.photos}
                  onChange={urls => setApptForm(f => ({...f, photos: urls}))}
                />
              </div>
              {apptError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{apptError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowApptModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={apptSaving} className="flex-1 py-2.5 bg-[#F7921A] text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {apptSaving && <Loader2 className="w-4 h-4 animate-spin" />} Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── New Invoice Modal ──────────────────────────────────────────────── */}
      {showInvModal && (() => {
        const sub = invItems.reduce((s, i) => s + (i.rate || 0) * (i.qty || 1), 0);
        const tax = invTaxEnabled ? sub * invTaxRate / 100 : 0;
        const total = sub + tax;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">New Invoice</h2>
                  <p className="text-xs text-gray-400 mt-0.5">For {customer.name ?? customer.email}</p>
                </div>
                <button onClick={() => setShowInvModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <form onSubmit={saveInv} className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Link to appointment */}
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Link to Appointment</label>
                  <select value={invApptId} onChange={e => setInvApptId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="">Without appointment</option>
                    {apptWithoutInvoice.map(a => (
                      <option key={a.id} value={a.id}>{a.appointmentNumber} — {a.service} ({fmtD(a.createdAt)})</option>
                    ))}
                  </select>
                </div>

                {/* Line items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Line Items *</label>
                    <button type="button" onClick={() => setInvItems(prev => [...prev, {description:"",note:"",rate:0,qty:1}])}
                      className="text-xs text-[#1B3FA8] font-semibold hover:underline">+ Add item</button>
                  </div>
                  <div className="space-y-3">
                    {invItems.map((item, i) => (
                      <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Item {i + 1}</span>
                          {invItems.length > 1 && (
                            <button type="button" onClick={() => setInvItems(prev => prev.filter((_, j) => j !== i))}
                              className="text-xs text-red-400 hover:text-red-600">Remove</button>
                          )}
                        </div>
                        <textarea
                          value={item.description}
                          onChange={e => setInvItems(prev => prev.map((it, j) => j === i ? {...it, description: e.target.value} : it))}
                          placeholder="Description (Enter for multiple lines)…"
                          rows={3}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y bg-white"
                        />
                        <textarea
                          value={item.note}
                          onChange={e => setInvItems(prev => prev.map((it, j) => j === i ? {...it, note: e.target.value} : it))}
                          placeholder="Additional note (optional)…"
                          rows={1}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y bg-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Rate ($)</label>
                            <input type="number" min="0" step="0.01" value={item.rate || ""}
                              onChange={e => setInvItems(prev => prev.map((it, j) => j === i ? {...it, rate: parseFloat(e.target.value)||0} : it))}
                              placeholder="0.00"
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Qty</label>
                            <input type="number" min="1" step="1" value={item.qty || 1}
                              onChange={e => setInvItems(prev => prev.map((it, j) => j === i ? {...it, qty: parseInt(e.target.value)||1} : it))}
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
                    <input type="checkbox" checked={invTaxEnabled} onChange={e => setInvTaxEnabled(e.target.checked)} className="w-4 h-4 accent-[#1B3FA8]" />
                    <span className="text-sm font-medium text-gray-700">Apply Tax</span>
                  </label>
                  {invTaxEnabled && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <input type="number" min="0" max="100" step="0.01" value={invTaxRate}
                        onChange={e => setInvTaxRate(parseFloat(e.target.value)||0)}
                        className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  )}
                </div>

                {/* Total preview */}
                <div className="flex justify-between items-center px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-sm font-semibold text-blue-800">
                    {invTaxEnabled ? `${fmt(sub)} + Tax ${fmt(tax)} =` : "Total:"}
                  </span>
                  <span className="text-lg font-bold text-[#1B3FA8]">{fmt(total)}</span>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Due Date</label>
                  <input type="date" value={invDue} onChange={e => setInvDue(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Notes</label>
                  <textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} rows={2} placeholder="Work details, terms…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
                </div>
                {invError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{invError}</p>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowInvModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={invSaving || invItems.filter(i => i.description.trim() && i.rate > 0).length === 0}
                    className="flex-1 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-bold hover:bg-[#1A3490] disabled:opacity-50 flex items-center justify-center gap-2">
                    {invSaving && <Loader2 className="w-4 h-4 animate-spin" />} Create Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ── Edit Invoice Modal ─────────────────────────────────────────────── */}
      {editInvId && (() => {
        const sub = editInvItems.reduce((s, i) => s + (i.rate || 0) * (i.qty || 1), 0);
        const tax = editInvTaxEnabled ? sub * editInvTaxRate / 100 : 0;
        const total = sub + tax;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
                <h2 className="text-lg font-bold text-gray-900">Edit Invoice</h2>
                <button onClick={() => setEditInvId(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              {editInvLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
              ) : (
                <form onSubmit={saveEditInv} className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Line Items *</label>
                      <button type="button" onClick={() => setEditInvItems(prev => [...prev, {description:"",note:"",rate:0,qty:1}])}
                        className="text-xs text-[#1B3FA8] font-semibold hover:underline">+ Add item</button>
                    </div>
                    <div className="space-y-3">
                      {editInvItems.map((item, i) => (
                        <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Item {i + 1}</span>
                            {editInvItems.length > 1 && (
                              <button type="button" onClick={() => setEditInvItems(prev => prev.filter((_, j) => j !== i))}
                                className="text-xs text-red-400 hover:text-red-600">Remove</button>
                            )}
                          </div>
                          <textarea value={item.description}
                            onChange={e => setEditInvItems(prev => prev.map((it, j) => j === i ? {...it, description: e.target.value} : it))}
                            placeholder="Description…" rows={3}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y bg-white" />
                          <textarea value={item.note}
                            onChange={e => setEditInvItems(prev => prev.map((it, j) => j === i ? {...it, note: e.target.value} : it))}
                            placeholder="Additional note (optional)…" rows={1}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y bg-white" />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Rate ($)</label>
                              <input type="number" min="0" step="0.01" value={item.rate || ""}
                                onChange={e => setEditInvItems(prev => prev.map((it, j) => j === i ? {...it, rate: parseFloat(e.target.value)||0} : it))}
                                placeholder="0.00" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Qty</label>
                              <input type="number" min="1" step="1" value={item.qty || 1}
                                onChange={e => setEditInvItems(prev => prev.map((it, j) => j === i ? {...it, qty: parseInt(e.target.value)||1} : it))}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 px-3 py-3 border border-gray-200 rounded-xl bg-gray-50">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={editInvTaxEnabled} onChange={e => setEditInvTaxEnabled(e.target.checked)} className="w-4 h-4 accent-[#1B3FA8]" />
                      <span className="text-sm font-medium text-gray-700">Apply Tax</span>
                    </label>
                    {editInvTaxEnabled && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <input type="number" min="0" max="100" step="0.01" value={editInvTaxRate}
                          onChange={e => setEditInvTaxRate(parseFloat(e.target.value)||0)}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-sm font-semibold text-blue-800">
                      {editInvTaxEnabled ? `${fmt(sub)} + Tax ${fmt(tax)} =` : "Total:"}
                    </span>
                    <span className="text-lg font-bold text-[#1B3FA8]">{fmt(total)}</span>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Due Date</label>
                    <input type="date" value={editInvDue} onChange={e => setEditInvDue(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Notes</label>
                    <textarea value={editInvNotes} onChange={e => setEditInvNotes(e.target.value)} rows={2} placeholder="Work details, terms…"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
                  </div>
                  {editInvError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{editInvError}</p>}
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setEditInvId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button type="submit" disabled={editInvSaving || editInvItems.filter(i => i.description.trim() && i.rate > 0).length === 0}
                      className="flex-1 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-bold hover:bg-[#1A3490] disabled:opacity-50 flex items-center justify-center gap-2">
                      {editInvSaving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Delete Invoice Confirm ───────────────────────────────────────────── */}
      {deleteInvId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900">Delete this invoice?</h3>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteInvId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={deleteInvoice} disabled={deletingInv}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                {deletingInv ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Appointment Modal ───────────────────────────────────────────── */}
      {editAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit Appointment</h2>
                <p className="text-xs text-gray-400 mt-0.5">{editAppt.appointmentNumber}</p>
              </div>
              <button onClick={() => setEditAppt(null)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <form onSubmit={saveEditAppt} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Service *</label>
                  <select value={editApptForm.service} onChange={e => setEditApptForm(f => ({...f, service: e.target.value}))} required
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="">Select a service…</option>
                    {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Status</label>
                  <select value={editApptForm.status} onChange={e => setEditApptForm(f => ({...f, status: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Sub-service / Detail</label>
                <input value={editApptForm.subservice} onChange={e => setEditApptForm(f => ({...f, subservice: e.target.value}))}
                  placeholder="e.g. Filter replacement, Pipe leak…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Preferred Date</label>
                  <input type="date" value={editApptForm.preferredDate} onChange={e => setEditApptForm(f => ({...f, preferredDate: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Preferred Time</label>
                  <select value={editApptForm.preferredTime} onChange={e => setEditApptForm(f => ({...f, preferredTime: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200">
                    <option value="">Any time</option>
                    <option value="Morning (8am-12pm)">Morning (8am-12pm)</option>
                    <option value="Afternoon (12pm-5pm)">Afternoon (12pm-5pm)</option>
                    <option value="Evening (5pm-8pm)">Evening (5pm-8pm)</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Address</label>
                <input value={editApptForm.address} onChange={e => setEditApptForm(f => ({...f, address: e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Client Request / Description</label>
                <textarea value={editApptForm.description} onChange={e => setEditApptForm(f => ({...f, description: e.target.value}))} rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Work Notes (visible to client)</label>
                <textarea value={editApptForm.notes} onChange={e => setEditApptForm(f => ({...f, notes: e.target.value}))} rows={3}
                  placeholder="What was done, parts replaced, recommendations…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-2 block">Photos & Videos</label>
                <JobMediaUploader
                  value={editApptForm.photos}
                  onChange={urls => setEditApptForm(f => ({...f, photos: urls}))}
                />
              </div>
              {editApptError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{editApptError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditAppt(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={editApptSaving || !editApptForm.service}
                  className="flex-1 py-2.5 bg-[#F7921A] text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
                  {editApptSaving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Appointment Confirm ───────────────────────────────────────── */}
      {deleteApptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900">Delete this appointment?</h3>
            <p className="text-sm text-gray-500">This will also delete any linked invoice. Cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteApptId(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={deleteAppointment} disabled={deletingAppt}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                {deletingAppt ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Convert Walk-in to Account Modal ─────────────────────────────── */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Create Client Account</h2>
                <p className="text-xs text-gray-400 mt-0.5">For {customer.name ?? customer.email}</p>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {convertDone ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800">
                      {convertDone.alreadyExisted ? "Existing account linked!" : "Account created successfully!"}
                    </p>
                    <p className="text-sm text-green-700 mt-0.5">
                      {convertDone.linked} appointment{convertDone.linked > 1 ? "s" : ""} linked to this account.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Login Credentials</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono text-gray-800">📧 {convertDone.email}</p>
                      {!convertDone.alreadyExisted && (
                        <p className="text-sm font-mono text-gray-800 mt-1">🔑 {convertPw}</p>
                      )}
                    </div>
                    {!convertDone.alreadyExisted && (
                      <button
                        onClick={copyCredentials}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${copied ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  A welcome email with these credentials was sent to the client automatically.
                </p>

                <button
                  onClick={() => {
                    setShowConvertModal(false);
                    if (convertDone?.userId) router.push(`/admin/customers/${convertDone.userId}`);
                  }}
                  className="w-full py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-bold hover:bg-[#1A3490]"
                >
                  View Client Account →
                </button>
              </div>
            ) : (
              <form onSubmit={convertToAccount} className="p-5 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-sm text-blue-800">
                    An account will be created with email <span className="font-semibold">{customer.email}</span>.
                    All existing appointments will be linked automatically.
                  </p>
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Temporary Password *</label>
                  <div className="relative">
                    <input
                      type={convertShowPw ? "text" : "password"}
                      value={convertPw}
                      onChange={e => setConvertPw(e.target.value)}
                      placeholder="Min. 6 characters…"
                      required
                      minLength={6}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <button
                      type="button"
                      onClick={() => setConvertShowPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {convertShowPw ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                {convertError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{convertError}</p>}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowConvertModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={convertLoading || convertPw.length < 6}
                    className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {convertLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Review Confirm ─────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900">Delete this review?</h3>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={() => deleteReview(deleteConfirm)} disabled={!!reviewBusy}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                {reviewBusy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
