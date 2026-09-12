"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MessageSquare, Send, Loader2, User, Plus, X, FileText, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { formatCallCenterTimeOnly } from "@/lib/utils";
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

function MessageMedia({ urls, outbound }: { urls: string[]; outbound: boolean }) {
  if (!urls?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-1.5">
      {urls.map((url) => (
        isImageUrl(url) ? (
          <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" className="w-32 rounded-lg" /></a>
        ) : isVideoUrl(url) ? (
          <video key={url} src={url} controls className="w-40 rounded-lg" />
        ) : (
          <a key={url} href={url} target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs ${outbound ? "bg-white/15" : "bg-gray-100"}`}>
            <FileText className="w-3.5 h-3.5" /> {urlFileName(url)}
          </a>
        )
      ))}
    </div>
  );
}

type ThreadListItem = {
  id: string;
  phoneNumber: string;
  lastMessageAt: string;
  unreadCount: number;
  customer: { id: string; firstName: string; lastName: string | null; phone: string } | null;
  messages: { body: string; direction: string }[];
};

type ThreadDetail = {
  id: string;
  phoneNumber: string;
  customer: { id: string; firstName: string; lastName: string | null } | null;
  messages: { id: string; direction: string; body: string; status: string; createdAt: string; sentBy: { name: string | null } | null; mediaUrls: string[] }[];
};

export default function MessagesPage() {
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [draft, setDraft] = useState("");
  const [draftMedia, setDraftMedia] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const [showNewModal, setShowNewModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newMedia, setNewMedia] = useState<string[]>([]);
  const [newSending, setNewSending] = useState(false);
  const [newError, setNewError] = useState("");

  const loadThreads = useCallback(async () => {
    const res = await fetch("/api/messages", { cache: "no-store" });
    const d = await res.json();
    setThreads(d.threads ?? []);
    setLoading(false);
  }, []);

  const loadThread = useCallback(async (id: string) => {
    const res = await fetch(`/api/messages/${id}`, { cache: "no-store" });
    const d = await res.json();
    setThread(d.thread ?? null);
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => { if (activeId) loadThread(activeId); }, [activeId, loadThread]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread]);

  // Poll for new inbound replies / new threads while the page is open — a reply
  // arrives via webhook with no way to push it to this tab otherwise.
  useEffect(() => {
    const interval = setInterval(() => {
      loadThreads();
      if (activeId) loadThread(activeId);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeId, loadThreads, loadThread]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || (!draft.trim() && draftMedia.length === 0)) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(`/api/messages/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft || "(attachment)", mediaUrls: draftMedia }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to send");
      setDraft("");
      setDraftMedia([]);
      loadThread(activeId);
      loadThreads();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Error sending message");
    } finally {
      setSending(false);
    }
  }

  async function handleStartNew(e: React.FormEvent) {
    e.preventDefault();
    setNewSending(true);
    setNewError("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone, body: newBody, mediaUrls: newMedia }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to send");
      setShowNewModal(false);
      setNewPhone("");
      setNewBody("");
      setNewMedia([]);
      await loadThreads();
      if (d.thread?.id) setActiveId(d.thread.id);
    } catch (err) {
      setNewError(err instanceof Error ? err.message : "Error");
    } finally {
      setNewSending(false);
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Thread list */}
      <div className={`${activeId ? "hidden md:block" : "block"} w-full md:w-72 border-r border-gray-100 overflow-y-auto shrink-0`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h1 className="font-bold text-gray-900 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Messages</h1>
          <button onClick={() => { setShowNewModal(true); setNewError(""); }} className="p-1.5 text-[#1B3FA8] hover:bg-blue-50 rounded-lg" title="New message">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#1B3FA8]" /></div>
        ) : (
          threads.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${activeId === t.id ? "bg-blue-50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {t.customer ? `${t.customer.firstName} ${t.customer.lastName ?? ""}` : t.phoneNumber}
                </p>
                {t.unreadCount > 0 && <span className="text-[10px] bg-[#F7921A] text-white rounded-full px-1.5 py-0.5">{t.unreadCount}</span>}
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">{t.messages[0]?.body ?? "No messages"}</p>
            </button>
          ))
        )}
        {!loading && threads.length === 0 && <p className="text-center text-xs text-gray-400 py-10">No conversations yet</p>}
      </div>

      {/* Conversation */}
      <div className={`${activeId ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
        {!thread ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Select a conversation</div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveId(null)} className="md:hidden -ml-1 mr-1 p-1 text-gray-400 hover:text-gray-600" title="Back to conversations">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 bg-[#1B3FA8] rounded-full flex items-center justify-center shrink-0"><User className="w-4 h-4 text-white" /></div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{thread.customer ? `${thread.customer.firstName} ${thread.customer.lastName ?? ""}` : thread.phoneNumber}</p>
                  <p className="text-xs text-gray-400">{thread.phoneNumber}</p>
                </div>
              </div>
              {thread.customer && (
                <Link href={`/customers/${thread.customer.id}`} className="text-xs text-[#1B3FA8] hover:underline shrink-0">View profile</Link>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
              {thread.messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${m.direction === "OUTBOUND" ? "bg-[#1B3FA8] text-white" : "bg-white border border-gray-200 text-gray-800"}`}>
                    <MessageMedia urls={m.mediaUrls} outbound={m.direction === "OUTBOUND"} />
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={`text-[10px] mt-1 ${m.direction === "OUTBOUND" ? "text-blue-200" : "text-gray-400"}`}>
                      {formatCallCenterTimeOnly(m.createdAt)} {m.sentBy?.name ? `· ${m.sentBy.name}` : ""}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-gray-100">
              <div className="flex items-end gap-2">
                <AttachmentPicker value={draftMedia} onChange={setDraftMedia} />
                <textarea
                  ref={autoGrowRef}
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); autoGrow(e.target); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit();
                    }
                  }}
                  placeholder="Type a message… (Enter for a new line, Ctrl+Enter to send)"
                  rows={1}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8] resize-none overflow-y-auto max-h-40"
                />
                <button type="submit" disabled={sending || (!draft.trim() && draftMedia.length === 0)} className="px-4 py-2 bg-[#F7921A] hover:bg-[#E07F10] disabled:opacity-60 text-white rounded-lg shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
            {sendError && <p className="text-red-600 text-xs px-3 pb-2">{sendError}</p>}
          </>
        )}
      </div>

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">New Message</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleStartNew} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Phone Number</label>
                <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required type="tel"
                  placeholder="(346) 000-0000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Message</label>
                <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} required rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
              </div>
              <AttachmentPicker value={newMedia} onChange={setNewMedia} />
              {newError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{newError}</p>}
              <button type="submit" disabled={newSending} className="w-full py-2.5 bg-[#F7921A] hover:bg-[#E07F10] disabled:opacity-60 text-white rounded-xl text-sm font-bold">
                {newSending ? "Sending…" : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
