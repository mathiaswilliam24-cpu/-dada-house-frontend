"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Phone, Mail, MapPin, ArrowLeft, Loader2, PhoneCall, MessageSquare, Calendar, ShieldAlert, CalendarPlus, ClipboardList, Receipt, Send, Pencil, X, Check, Paperclip } from "lucide-react";
import { requestCall } from "@/components/call-center/softphone";
import { formatCallCenterTime, formatCurrency } from "@/lib/utils";
import { AttachmentPicker } from "@/components/call-center/attachment-picker";

function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}
function autoGrowRef(el: HTMLTextAreaElement | null) {
  if (el) autoGrow(el);
}

function isImageUrl(url: string) { return /\.(jpe?g|png|gif|webp|heic)(\?|$)/i.test(url); }
function isVideoUrl(url: string) { return /\.(mp4|mov|avi|webm|mkv)(\?|$)/i.test(url); }
function urlFileName(url: string) { try { return decodeURIComponent(url.split("/").pop() ?? "file"); } catch { return "file"; } }

function AttachmentGrid({ urls, outbound }: { urls?: string[]; outbound: boolean }) {
  if (!urls?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-1.5">
      {urls.map((url) => (
        isImageUrl(url) ? (
          <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="w-24 rounded-lg" /></a>
        ) : isVideoUrl(url) ? (
          <video key={url} src={url} controls className="w-32 rounded-lg" />
        ) : (
          <a key={url} href={url} target="_blank" rel="noreferrer" className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] ${outbound ? "bg-white/15" : "bg-gray-100"}`}>
            <Paperclip className="w-3 h-3" /> {urlFileName(url)}
          </a>
        )
      ))}
    </div>
  );
}

type EmailEntry = { id: string; to: string[]; subject: string; createdAt: string; status: string };

type ConversationEmail = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  subject: string | null;
  body: string;
  createdAt: string;
  attachmentUrls?: string[];
};

type CustomerDetail = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  secondaryPhone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  customerType: string;
  tags: string[];
  notes: string | null;
  doNotContact: { reason: string; optedOutAt: string } | null;
  appointments: { id: string; appointmentNumber: string; service: string; status: string; createdAt: string }[];
  invoices: { id: string; amount: number; status: string; createdAt: string; paymentToken: string | null; appointment: { appointmentNumber: string; service: string } }[];
  maintenanceContracts: { id: string; token: string; status: string; createdAt: string; planType: { name: string; monthlyPrice: number; annualPrice: number } }[];
  calls: { id: string; direction: string; status: string; startedAt: string; disposition: string | null; agent: { name: string | null } | null; aiSummary: string | null; aiTranscript: string | null; appointment: { id: string; appointmentNumber: string; service: string } | null }[];
  messageThreads: { id: string; messages: { id: string; direction: string; body: string; createdAt: string; mediaUrls?: string[] }[] }[];
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [emailsLoading, setEmailsLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resentIds, setResentIds] = useState<Set<string>>(new Set());

  const [smsBody, setSmsBody] = useState("");
  const [smsMedia, setSmsMedia] = useState<string[]>([]);
  const [smsSending, setSmsSending] = useState(false);
  const [smsError, setSmsError] = useState("");
  const [smsSent, setSmsSent] = useState(false);

  const [conversation, setConversation] = useState<ConversationEmail[]>([]);
  const [conversationLoading, setConversationLoading] = useState(true);
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyMedia, setReplyMedia] = useState<string[]>([]);
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySent, setReplySent] = useState(false);

  const [plans, setPlans] = useState<{ id: string; name: string; monthlyPrice: number; annualPrice: number }[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [contractSending, setContractSending] = useState(false);
  const [contractError, setContractError] = useState("");
  const [contractSent, setContractSent] = useState(false);

  useEffect(() => {
    fetch("/api/maintenance-plans").then(r => r.json()).then(d => {
      setPlans(d.plans ?? []);
      if (d.plans?.[0]) setSelectedPlanId(d.plans[0].id);
    }).catch(() => {});
  }, []);

  async function handleSendContract(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlanId) return;
    setContractSending(true);
    setContractError("");
    setContractSent(false);
    try {
      const res = await fetch(`/api/customers/${params.id}/maintenance-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTypeId: selectedPlanId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to send");
      setContractSent(true);
      load();
    } catch (err) {
      setContractError(err instanceof Error ? err.message : "Error");
    } finally {
      setContractSending(false);
    }
  }

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", phone: "", secondaryPhone: "", email: "",
    address: "", city: "", state: "", zipCode: "", customerType: "RESIDENTIAL",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${params.id}`, { cache: "no-store" });
      const d = await res.json();
      setCustomer(d.customer ?? null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  // Poll for new calls/messages arriving via webhook while this page is open.
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/customers/${params.id}`, { cache: "no-store" });
      const d = await res.json();
      if (d.customer) setCustomer(d.customer);
    }, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  useEffect(() => {
    setEmailsLoading(true);
    fetch(`/api/customers/${params.id}/emails`)
      .then((r) => r.json())
      .then((d) => setEmails(d.emails ?? []))
      .finally(() => setEmailsLoading(false));
  }, [params.id]);

  const loadConversation = useCallback(async () => {
    const res = await fetch(`/api/customers/${params.id}/conversation`, { cache: "no-store" });
    const d = await res.json();
    setConversation(d.messages ?? []);
  }, [params.id]);

  useEffect(() => {
    setConversationLoading(true);
    loadConversation().finally(() => setConversationLoading(false));
    const interval = setInterval(loadConversation, 5000);
    return () => clearInterval(interval);
  }, [loadConversation]);

  useEffect(() => {
    if (replySubject || conversation.length === 0) return;
    const latest = conversation[conversation.length - 1];
    setReplySubject(latest.subject?.startsWith("Re:") ? latest.subject : `Re: ${latest.subject ?? "DADA HOUSE"}`);
  }, [conversation, replySubject]);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if ((!replyBody.trim() && replyMedia.length === 0) || !replySubject.trim()) return;
    setReplySending(true);
    setReplyError("");
    setReplySent(false);
    try {
      const res = await fetch(`/api/customers/${params.id}/conversation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: replySubject, body: replyBody || "(attachment)", attachmentUrls: replyMedia }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to send");
      setReplyBody("");
      setReplyMedia([]);
      setReplySent(true);
      loadConversation();
    } catch (err: any) {
      setReplyError(err.message ?? "Failed to send");
    } finally {
      setReplySending(false);
    }
  }

  async function handleSendSms(e: React.FormEvent) {
    e.preventDefault();
    if (!customer || (!smsBody.trim() && smsMedia.length === 0)) return;
    setSmsSending(true);
    setSmsError("");
    setSmsSent(false);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customer.phone, body: smsBody || "(attachment)", mediaUrls: smsMedia }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to send");
      setSmsBody("");
      setSmsMedia([]);
      setSmsSent(true);
      load();
    } catch (err) {
      setSmsError(err instanceof Error ? err.message : "Error");
    } finally {
      setSmsSending(false);
    }
  }

  function openEdit() {
    if (!customer) return;
    setEditForm({
      firstName: customer.firstName,
      lastName: customer.lastName ?? "",
      phone: customer.phone,
      secondaryPhone: customer.secondaryPhone ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      zipCode: customer.zipCode ?? "",
      customerType: customer.customerType,
    });
    setEditError("");
    setShowEdit(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to save");
      setShowEdit(false);
      load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Error");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleResendEmail(emailId: string) {
    setResendingId(emailId);
    try {
      const res = await fetch(`/api/customers/${params.id}/emails/${emailId}/resend`, { method: "POST" });
      if (res.ok) setResentIds((prev) => new Set(prev).add(emailId));
    } finally {
      setResendingId(null);
    }
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;
  if (!customer) return <p className="text-center text-gray-400 py-24">Customer not found</p>;

  const prefillParams = new URLSearchParams({
    customerId: customer.id,
    prefillName: `${customer.firstName} ${customer.lastName ?? ""}`.trim(),
    prefillPhone: customer.phone,
    ...(customer.email && { prefillEmail: customer.email }),
    ...(customer.address && { prefillAddress: customer.address }),
    ...(customer.city && { prefillCity: customer.city }),
  });

  return (
    <div className="space-y-5 max-w-5xl">
      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#1B3FA8] rounded-full flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-white">{customer.firstName[0]?.toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{customer.firstName} {customer.lastName ?? ""}</h1>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                <button
                  onClick={() => requestCall(customer.phone)}
                  className="flex items-center gap-1 text-[#1B3FA8] hover:underline"
                  title="Call this customer"
                >
                  <Phone className="w-3.5 h-3.5" /> {customer.phone}
                </button>
                {customer.secondaryPhone && (
                  <button
                    onClick={() => requestCall(customer.secondaryPhone!)}
                    className="flex items-center gap-1 text-[#1B3FA8] hover:underline"
                    title="Call secondary number"
                  >
                    <Phone className="w-3.5 h-3.5" /> {customer.secondaryPhone}
                  </button>
                )}
                {customer.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {customer.email}</span>}
                {customer.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {customer.address}, {customer.city} {customer.state}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">{customer.customerType}</span>
            <button
              onClick={openEdit}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          </div>
        </div>

        {customer.doNotContact && (
          <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
            <ShieldAlert className="w-4 h-4" /> Opted out of SMS ({customer.doNotContact.reason}) — do not send marketing/automated texts to this number.
          </div>
        )}

        {customer.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-4">
            {customer.tags.map((t) => (
              <span key={t} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        )}

        {customer.notes && <p className="text-sm text-gray-600 mt-4 bg-gray-50 rounded-lg p-3">{customer.notes}</p>}

        {/* Quick actions — everything an agent needs while on the phone with this customer */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100">
          <Link
            href={`/dispatcher/appointments/new?${prefillParams.toString()}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1B3FA8] text-white text-sm font-medium rounded-lg hover:bg-[#1A3490]"
          >
            <CalendarPlus className="w-4 h-4" /> Book Appointment
          </Link>
          <Link
            href={`/admin/invoices?type=estimate&${prefillParams.toString()}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
          >
            <ClipboardList className="w-4 h-4" /> Create Estimate
          </Link>
          <Link
            href={`/admin/invoices?type=invoice&${prefillParams.toString()}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
          >
            <Receipt className="w-4 h-4" /> Create Invoice
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3"><PhoneCall className="w-4 h-4" /> Calls</h2>
          <div className="space-y-2">
            {customer.calls.map((c) => (
              <div key={c.id} className="text-xs border border-gray-100 rounded-lg p-2">
                <p className="font-medium text-gray-800 flex items-center gap-1.5">
                  {c.direction} · {c.status}
                  {(c.aiSummary || c.aiTranscript) && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full">🤖 Emma</span>
                  )}
                </p>
                <p className="text-gray-400">{formatCallCenterTime(c.startedAt)}</p>
                {c.disposition && <p className="text-gray-500 mt-0.5">{c.disposition}</p>}
                {c.aiSummary && <p className="text-gray-600 mt-1 italic">"{c.aiSummary}"</p>}
                {!c.aiSummary && c.aiTranscript && (
                  <p className="text-[#1B3FA8] mt-1"><a href="/calls" className="hover:underline">View full transcript in Call History →</a></p>
                )}
                {c.appointment && (
                  <p className="text-[#1B3FA8] mt-1 font-medium">📅 #{c.appointment.appointmentNumber} — {c.appointment.service}</p>
                )}
              </div>
            ))}
            {customer.calls.length === 0 && <p className="text-xs text-gray-400">No calls yet</p>}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3"><MessageSquare className="w-4 h-4" /> Messages</h2>
          <div className="space-y-2 flex-1">
            {customer.messageThreads.flatMap((t) => t.messages).slice(-5).map((m) => (
              <div key={m.id} className={`flex ${m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] text-xs rounded-lg p-2 ${m.direction === "OUTBOUND" ? "bg-[#1B3FA8] text-white" : "bg-gray-100 border border-gray-200 text-gray-800"}`}>
                  <AttachmentGrid urls={m.mediaUrls} outbound={m.direction === "OUTBOUND"} />
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={`mt-0.5 ${m.direction === "OUTBOUND" ? "text-blue-200" : "text-gray-400"}`}>{formatCallCenterTime(m.createdAt)}</p>
                </div>
              </div>
            ))}
            {customer.messageThreads.length === 0 && <p className="text-xs text-gray-400">No messages yet</p>}
          </div>
          {!customer.doNotContact && (
            <form onSubmit={handleSendSms} className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              <textarea
                ref={autoGrowRef}
                value={smsBody}
                onChange={(e) => { setSmsBody(e.target.value); autoGrow(e.target); }}
                placeholder="Send a text…"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#1B3FA8] resize-none overflow-y-auto max-h-48"
              />
              <AttachmentPicker value={smsMedia} onChange={setSmsMedia} />
              {smsError && <p className="text-[11px] text-red-600">{smsError}</p>}
              {smsSent && <p className="text-[11px] text-green-600">Sent!</p>}
              <button
                type="submit"
                disabled={smsSending || (!smsBody.trim() && smsMedia.length === 0)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-[#F7921A] hover:bg-[#E07F10] disabled:opacity-60 text-white text-xs font-semibold rounded-lg"
              >
                <Send className="w-3.5 h-3.5" /> {smsSending ? "Sending…" : "Send"}
              </button>
            </form>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3"><Calendar className="w-4 h-4" /> Jobs</h2>
          <div className="space-y-2">
            {customer.appointments.map((a) => (
              <div key={a.id} className="text-xs border border-gray-100 rounded-lg p-2">
                <p className="font-medium text-gray-800">{a.service}</p>
                <p className="text-gray-400">#{a.appointmentNumber} · {a.status}</p>
              </div>
            ))}
            {customer.appointments.length === 0 && <p className="text-xs text-gray-400">No jobs yet</p>}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3"><Receipt className="w-4 h-4" /> Estimates & Invoices</h2>
          <div className="space-y-2">
            {customer.invoices.map((inv) => {
              const isEstimate = inv.status === "DRAFT";
              const printUrl = `/print/invoice/${inv.id}${inv.paymentToken ? `?token=${inv.paymentToken}` : ""}`;
              return (
                <a
                  key={inv.id}
                  href={printUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-xs border border-gray-100 rounded-lg p-2 hover:border-[#1B3FA8] hover:bg-blue-50/40 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-800">{isEstimate ? "Estimate" : "Invoice"} — {inv.appointment.service}</p>
                    <p className="text-gray-400">{formatCallCenterTime(inv.createdAt)} · {formatCurrency(inv.amount)} · {inv.status}</p>
                  </div>
                  <span className="text-[#1B3FA8] font-semibold shrink-0 ml-2">View / Download PDF →</span>
                </a>
              );
            })}
            {customer.invoices.length === 0 && <p className="text-xs text-gray-400">No estimates or invoices yet</p>}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3"><ShieldAlert className="w-4 h-4" /> Maintenance Contracts</h2>
          <div className="space-y-2 mb-3">
            {customer.maintenanceContracts.map((c) => (
              <a key={c.id} href={`/contract/${c.token}`} target="_blank" rel="noreferrer"
                className="flex items-center justify-between text-xs border border-gray-100 rounded-lg p-2 hover:border-[#1B3FA8] hover:bg-blue-50/40 transition-colors">
                <div>
                  <p className="font-medium text-gray-800">{c.planType.name} — {formatCurrency(c.planType.monthlyPrice)}/mo or {formatCurrency(c.planType.annualPrice)}/yr</p>
                  <p className="text-gray-400">{formatCallCenterTime(c.createdAt)} · {c.status}</p>
                </div>
                <span className="text-[#1B3FA8] font-semibold shrink-0 ml-2">Open →</span>
              </a>
            ))}
            {customer.maintenanceContracts.length === 0 && <p className="text-xs text-gray-400">No contracts sent yet</p>}
          </div>
          {plans.length > 0 && (
            <form onSubmit={handleSendContract} className="pt-3 border-t border-gray-100 space-y-2">
              <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#1B3FA8]">
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.monthlyPrice)}/mo or {formatCurrency(p.annualPrice)}/yr</option>
                ))}
              </select>
              {contractError && <p className="text-[11px] text-red-600">{contractError}</p>}
              {contractSent && <p className="text-[11px] text-green-600">Sent!</p>}
              <button type="submit" disabled={contractSending}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-[#F7921A] hover:bg-[#E07F10] disabled:opacity-60 text-white text-xs font-semibold rounded-lg">
                <Send className="w-3.5 h-3.5" /> {contractSending ? "Sending…" : "Send Contract to Sign"}
              </button>
            </form>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3"><Mail className="w-4 h-4" /> Emails</h2>
          <div className="space-y-2">
            {emailsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-300 mx-auto" />
            ) : (
              <>
                {emails.map((e) => (
                  <div key={e.id} className="text-xs border border-gray-100 rounded-lg p-2">
                    <p className="font-medium text-gray-800 line-clamp-2">{e.subject}</p>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-gray-400">{formatCallCenterTime(e.createdAt)} · {e.status}</p>
                      <button
                        onClick={() => handleResendEmail(e.id)}
                        disabled={resendingId === e.id}
                        className="text-[#1B3FA8] hover:underline disabled:opacity-50 shrink-0 ml-2"
                      >
                        {resendingId === e.id ? "Sending…" : resentIds.has(e.id) ? "Resent ✓" : "Resend"}
                      </button>
                    </div>
                  </div>
                ))}
                {emails.length === 0 && (
                  customer.email
                    ? <p className="text-xs text-gray-400">No emails found</p>
                    : <p className="text-xs text-gray-400">No email on file</p>
                )}
              </>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3"><Mail className="w-4 h-4" /> Email Conversation</h2>
          <div className="space-y-2 flex-1">
            {conversationLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-gray-300 mx-auto" />
            ) : (
              <>
                {conversation.slice(-5).map((m) => (
                  <div key={m.id} className={`flex ${m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] text-xs rounded-lg p-2 ${m.direction === "OUTBOUND" ? "bg-[#1B3FA8] text-white" : "bg-gray-100 border border-gray-200 text-gray-800"}`}>
                      {m.subject && <p className="font-semibold mb-0.5">{m.subject}</p>}
                      <AttachmentGrid urls={m.attachmentUrls} outbound={m.direction === "OUTBOUND"} />
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={`mt-0.5 ${m.direction === "OUTBOUND" ? "text-blue-200" : "text-gray-400"}`}>{formatCallCenterTime(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {conversation.length === 0 && <p className="text-xs text-gray-400">No email replies yet</p>}
              </>
            )}
          </div>
          {customer.email && (
            <form onSubmit={handleSendReply} className="mt-3 pt-3 border-t border-gray-100 space-y-2">
              <input
                value={replySubject}
                onChange={(e) => setReplySubject(e.target.value)}
                placeholder="Subject"
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#1B3FA8]"
              />
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Reply by email…"
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#1B3FA8]"
              />
              <AttachmentPicker value={replyMedia} onChange={setReplyMedia} />
              {replyError && <p className="text-[11px] text-red-600">{replyError}</p>}
              {replySent && <p className="text-[11px] text-green-600">Sent!</p>}
              <button
                type="submit"
                disabled={replySending || (!replyBody.trim() && replyMedia.length === 0) || !replySubject.trim()}
                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-[#F7921A] hover:bg-[#E07F10] disabled:opacity-60 text-white text-xs font-semibold rounded-lg"
              >
                <Send className="w-3.5 h-3.5" /> {replySending ? "Sending…" : "Send Email"}
              </button>
            </form>
          )}
        </section>
      </div>

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Edit Customer</h2>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">First Name *</label>
                  <input value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Last Name</label>
                  <input value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Phone *</label>
                  <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} required type="tel"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Secondary Phone</label>
                  <input value={editForm.secondaryPhone} onChange={(e) => setEditForm((f) => ({ ...f, secondaryPhone: e.target.value }))} type="tel"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Email</label>
                <input value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} type="email"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Address</label>
                <input value={editForm.address} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input value={editForm.city} onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))} placeholder="City"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                <input value={editForm.state} onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value }))} placeholder="State" maxLength={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8] uppercase" />
                <input value={editForm.zipCode} onChange={(e) => setEditForm((f) => ({ ...f, zipCode: e.target.value }))} placeholder="Zip"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Customer Type</label>
                <select value={editForm.customerType} onChange={(e) => setEditForm((f) => ({ ...f, customerType: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]">
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="ASSISTED_LIVING">Assisted Living</option>
                  <option value="PROPERTY_MANAGER">Property Manager</option>
                </select>
              </div>
              {editError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowEdit(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1B3FA8] hover:bg-[#1A3490] disabled:opacity-60 text-white rounded-xl text-sm font-bold">
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
