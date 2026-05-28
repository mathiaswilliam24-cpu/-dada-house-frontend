"use client";
import { useEffect, useState } from "react";
import { MessageCircle, ChevronDown, ChevronUp, Loader2, Bot, User, Ticket } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; sessionId: string; serviceType: string | null; urgency: string | null; ticketCreated: boolean; createdAt: string; messages: Message[]; user: { name: string | null; email: string | null } | null; };

const URGENCY_COLORS: Record<string, string> = {
  emergency: "bg-red-50 text-red-700",
  high: "bg-orange-50 text-orange-700",
  medium: "bg-yellow-50 text-yellow-700",
  low: "bg-green-50 text-green-700",
};

export default function AdminAIConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/ai-conversations").then(r => r.json()).then(d => { setConversations(d.conversations ?? []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Conversations</h1>
        <p className="text-gray-500 text-sm mt-0.5">{conversations.length} total conversations</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
      ) : (
        <div className="space-y-3">
          {conversations.map(convo => {
            const msgs: Message[] = Array.isArray(convo.messages) ? convo.messages : [];
            return (
              <div key={convo.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === convo.id ? null : convo.id)}
                  className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-gray-50"
                >
                  <div className="w-9 h-9 bg-[#1B3FA8]/10 rounded-lg flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-[#1B3FA8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900 text-sm truncate">{convo.user?.name ?? convo.user?.email ?? `Session ${convo.sessionId.slice(0, 8)}…`}</p>
                      {convo.urgency && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${URGENCY_COLORS[convo.urgency] ?? "bg-gray-50 text-gray-600"}`}>{convo.urgency}</span>
                      )}
                      {convo.ticketCreated && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 flex items-center gap-1">
                          <Ticket className="w-3 h-3" />Ticket
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {convo.serviceType ?? "General inquiry"} · {msgs.length} messages · {new Date(convo.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {expanded === convo.id ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>

                {expanded === convo.id && msgs.length > 0 && (
                  <div className="border-t border-gray-100 p-5 space-y-3 max-h-80 overflow-y-auto bg-gray-50">
                    {msgs.map((msg, i) => (
                      <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "" : "flex-row-reverse"}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-gray-200" : "bg-[#1B3FA8]"}`}>
                          {msg.role === "user" ? <User className="w-3.5 h-3.5 text-gray-600" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className={`max-w-md px-3 py-2 rounded-xl text-sm ${msg.role === "user" ? "bg-white border border-gray-200 text-gray-800" : "bg-[#1B3FA8] text-white"}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {conversations.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">No AI conversations yet</div>
          )}
        </div>
      )}
    </div>
  );
}
