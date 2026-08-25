"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Megaphone, Plus, X, Loader2, CheckCircle, Mail, MessageSquare,
  Users, TrendingUp, Eye, AlertCircle, Send, ChevronDown, ChevronUp,
  ImagePlus, Video, Trash2,
} from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing-components";

type Campaign = {
  id: string; name: string; subject: string | null; smsText: string | null;
  flyer: string | null; flyerType: string | null;
  status: string; sentAt: string | null; createdAt: string;
  total: number; emailSent: number; emailDelivered: number; emailOpened: number; emailFailed: number;
  smsSent: number; smsDelivered: number; smsFailed: number;
};

function pct(n: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function FlyerUploader({ onUploaded }: { onUploaded: (url: string, type: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const { startUpload } = useUploadThing("campaignFlyer", {
    onClientUploadComplete: (res) => {
      if (res?.[0]) {
        onUploaded(res[0].ufsUrl ?? res[0].url, res[0].type ?? "image/jpeg");
      }
      setUploading(false);
    },
    onUploadError: (e) => { setErr(e.message); setUploading(false); },
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(""); setUploading(true);
    startUpload([file]);
  }

  return (
    <div>
      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-[#F7921A] hover:bg-orange-50 transition-colors">
        {uploading ? (
          <><Loader2 className="w-6 h-6 animate-spin text-[#F7921A]" /><span className="text-sm text-gray-500">Uploading…</span></>
        ) : (
          <>
            <div className="flex gap-3 text-gray-400">
              <ImagePlus className="w-6 h-6" />
              <Video className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium text-gray-600">Click to upload flyer</span>
            <span className="text-xs text-gray-400">Image (JPG, PNG, WEBP) or Video (MP4) · max 128MB</span>
          </>
        )}
        <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} disabled={uploading} />
      </label>
      {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
    </div>
  );
}

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded]   = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", subject: "", body: "", smsText: "", recipientFilter: "all",
    flyer: "", flyerType: "",
  });
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendDone, setSendDone]   = useState<{ total: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing/campaigns");
      const d = await res.json();
      setCampaigns(d.campaigns ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openModal() {
    setShowModal(true); setSendDone(null); setSendError("");
    setForm({ name: "", subject: "", body: "", smsText: "", recipientFilter: "all", flyer: "", flyerType: "" });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true); setSendError("");
    try {
      const res = await fetch("/api/admin/marketing/campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Error");
      setSendDone({ total: d.campaign.total });
      await load();
    } catch (e) { setSendError(e instanceof Error ? e.message : "Error"); }
    finally { setSending(false); }
  }

  const totalStats = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + c.emailSent + c.smsSent,
      opened: acc.opened + c.emailOpened,
      delivered: acc.delivered + c.emailDelivered + c.smsDelivered,
    }),
    { sent: 0, opened: 0, delivered: 0 }
  );

  const isVideo = form.flyerType?.startsWith("video/");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-[#F7921A]" /> Marketing
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Send promotional emails & SMS to your clients</p>
        </div>
        <button onClick={openModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#F7921A] text-white text-sm font-bold rounded-xl hover:bg-[#E07F10] transition-colors">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Sent", value: totalStats.sent, icon: Send, color: "text-blue-600 bg-blue-50" },
          { label: "Delivered", value: totalStats.delivered, icon: CheckCircle, color: "text-green-600 bg-green-50" },
          { label: "Opened", value: totalStats.opened, icon: Eye, color: "text-purple-600 bg-purple-50" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <Megaphone className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-600 mb-1">No campaigns yet</p>
            <p className="text-sm text-gray-400">Create your first promotional campaign above</p>
          </div>
        ) : campaigns.map(c => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="p-5 flex items-center gap-4">
              {/* Flyer thumbnail */}
              {c.flyer && !c.flyerType?.startsWith("video/") ? (
                <img src={c.flyer} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
              ) : (
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.status === "SENT" ? "bg-green-50" : "bg-gray-50"}`}>
                  {c.flyerType?.startsWith("video/") ? <Video className="w-5 h-5 text-purple-500" /> :
                   c.subject ? <Mail className="w-5 h-5 text-blue-500" /> : <MessageSquare className="w-5 h-5 text-green-500" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === "SENT" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{c.status}</span>
                  {c.subject && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Email</span>}
                  {c.smsText && <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">SMS</span>}
                  {c.flyer && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">{c.flyerType?.startsWith("video/") ? "Video" : "Image"}</span>}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.sentAt ? fmtDate(c.sentAt) : fmtDate(c.createdAt)} · {c.total} recipient{c.total !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-6">
                {c.subject && (
                  <>
                    <div className="text-center"><p className="text-sm font-bold text-gray-900">{c.emailSent}</p><p className="text-xs text-gray-400">Sent</p></div>
                    <div className="text-center"><p className="text-sm font-bold text-green-600">{c.emailDelivered}</p><p className="text-xs text-gray-400">Delivered</p></div>
                    <div className="text-center"><p className="text-sm font-bold text-purple-600">{c.emailOpened}</p><p className="text-xs text-gray-400">Opened</p></div>
                  </>
                )}
                {c.smsText && (
                  <div className="text-center"><p className="text-sm font-bold text-emerald-600">{c.smsDelivered}</p><p className="text-xs text-gray-400">SMS ✓</p></div>
                )}
              </div>
              <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                {expanded === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {expanded === c.id && (
              <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-4">
                {c.flyer && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Flyer</p>
                    {c.flyerType?.startsWith("video/") ? (
                      <a href={c.flyer} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
                        <Video className="w-4 h-4" /> View video
                      </a>
                    ) : (
                      <img src={c.flyer} alt="Campaign flyer" className="rounded-xl max-h-48 object-cover" />
                    )}
                  </div>
                )}
                {c.subject && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Email Stats</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Sent", value: c.emailSent, pct: pct(c.emailSent, c.total), color: "bg-blue-500" },
                        { label: "Delivered", value: c.emailDelivered, pct: pct(c.emailDelivered, c.emailSent || 1), color: "bg-green-500" },
                        { label: "Opened", value: c.emailOpened, pct: pct(c.emailOpened, c.emailDelivered || 1), color: "bg-purple-500" },
                        { label: "Failed", value: c.emailFailed, pct: pct(c.emailFailed, c.total), color: "bg-red-400" },
                      ].map(s => (
                        <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">{s.label}</span>
                            <span className="text-xs font-semibold text-gray-400">{s.pct}</span>
                          </div>
                          <p className="text-xl font-bold text-gray-900">{s.value}</p>
                          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full ${s.color} rounded-full`} style={{ width: s.pct }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {c.smsText && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">SMS Stats</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Sent", value: c.smsSent, color: "bg-emerald-500" },
                        { label: "Delivered", value: c.smsDelivered, color: "bg-green-500" },
                        { label: "Failed", value: c.smsFailed, color: "bg-red-400" },
                      ].map(s => (
                        <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                          <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                          <p className="text-xl font-bold text-gray-900">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {c.subject && <p className="text-xs text-gray-400">Subject: <span className="text-gray-600 font-medium">{c.subject}</span></p>}
                {c.smsText && <p className="text-xs text-gray-400">SMS: <span className="text-gray-600 font-medium">{c.smsText}</span></p>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <h2 className="text-lg font-bold text-gray-900">New Campaign</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {sendDone ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-xl font-bold text-gray-900">Campaign sent! 🎉</p>
                <p className="text-gray-500">Your campaign is being delivered to <strong>{sendDone.total}</strong> recipient{sendDone.total !== 1 ? "s" : ""}.</p>
                <button onClick={() => setShowModal(false)} className="px-6 py-2.5 bg-[#1B3FA8] text-white rounded-xl font-bold hover:bg-[#1A3490]">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSend} className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Campaign name */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Campaign Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                    placeholder="Summer Promo 2026"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
                </div>

                {/* Recipients */}
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Recipients</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "all", label: "All Clients", icon: Users },
                      { value: "with_appointments", label: "Has Appointments", icon: TrendingUp },
                      { value: "completed_jobs", label: "Completed Jobs", icon: CheckCircle },
                    ].map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setForm(f => ({ ...f, recipientFilter: opt.value }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all ${form.recipientFilter === opt.value ? "border-[#1B3FA8] bg-blue-50 text-[#1B3FA8]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                        <opt.icon className="w-4 h-4" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email section */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold text-gray-700">Email</span>
                    <span className="text-xs text-gray-400">(optional)</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Subject</label>
                      <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        placeholder="🏠 Special offer for DADA HOUSE clients!"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1 block">Message Body</label>
                      <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                        rows={4} placeholder={"We have a special offer for you this month!\n\nGet 10% off any AC repair or plumbing service.\nValid until August 31, 2026.\n\nBook now and save!"}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none" />
                    </div>

                    {/* Flyer upload */}
                    <div>
                      <label className="text-xs text-gray-500 font-medium mb-1.5 block">Flyer / Promo Image or Video</label>
                      {form.flyer ? (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200">
                          {isVideo ? (
                            <div className="bg-gray-900 p-6 flex items-center gap-3">
                              <Video className="w-8 h-8 text-purple-400" />
                              <div>
                                <p className="text-white text-sm font-medium">Video uploaded</p>
                                <p className="text-gray-400 text-xs truncate max-w-xs">{form.flyer}</p>
                              </div>
                            </div>
                          ) : (
                            <img src={form.flyer} alt="Flyer preview" className="w-full max-h-48 object-cover" />
                          )}
                          <button type="button" onClick={() => setForm(f => ({ ...f, flyer: "", flyerType: "" }))}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute bottom-2 left-2">
                            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">✓ Uploaded</span>
                          </div>
                        </div>
                      ) : (
                        <FlyerUploader onUploaded={(url, type) => setForm(f => ({ ...f, flyer: url, flyerType: type }))} />
                      )}
                      <p className="text-xs text-gray-400 mt-1">The flyer appears prominently at the top of the email. Emails also include Call + Text buttons.</p>
                    </div>
                  </div>
                </div>

                {/* SMS section */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-gray-700">SMS</span>
                    <span className="text-xs text-gray-400">(optional)</span>
                  </div>
                  <textarea value={form.smsText} onChange={e => setForm(f => ({ ...f, smsText: e.target.value }))}
                    rows={3} maxLength={320} placeholder="DADA HOUSE: Special offer this week! 10% off AC & plumbing. Book now: dada-house.com/booking"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 resize-none" />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-400">Sent to clients with a phone number on file</p>
                    <p className={`text-xs ${form.smsText.length > 160 ? "text-orange-500" : "text-gray-400"}`}>
                      {form.smsText.length}/320{form.smsText.length > 160 ? " (2 SMS)" : ""}
                    </p>
                  </div>
                </div>

                {sendError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {sendError}
                  </div>
                )}

                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={sending || !form.name || (!form.subject && !form.smsText)}
                    className="flex-1 py-3 bg-[#F7921A] text-white rounded-xl text-sm font-bold hover:bg-[#E07F10] disabled:opacity-50 flex items-center justify-center gap-2">
                    {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send Campaign</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
