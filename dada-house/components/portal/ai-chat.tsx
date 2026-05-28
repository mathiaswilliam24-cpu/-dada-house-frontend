"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { Send, Bot, User, Calendar } from "lucide-react";
import Link from "next/link";

type Message = { role: "user" | "assistant"; content: string };

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm the DADA HOUSE AI assistant. Tell me about the issue you're experiencing and I'll help you get the right service scheduled. 🏠" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [suggestBooking, setSuggestBooking] = useState(false);
  const [serviceType, setServiceType] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, conversationId }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.suggestBooking) setSuggestBooking(true);
      if (data.serviceType) setServiceType(data.serviceType);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please call us at +1 (910) 685-8042." }]);
    }
    setLoading(false);
  }

  async function createTicket() {
    if (!conversationId) return;
    const res = await fetch(`/api/ai/conversations/${conversationId}/ticket`, { method: "POST" });
    if (res.ok) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "✅ An appointment request has been created! Our team will contact you shortly to confirm the details. You can also view it in your appointments."
      }]);
      setSuggestBooking(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-[#1B3FA8] rounded-lg flex items-center justify-center">
          <Bot size={18} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">DADA HOUSE AI</p>
          <p className="text-xs text-green-600">● Online 24/7</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-[#1B3FA8]" : "bg-[#F7921A]"}`}>
                {msg.role === "assistant" ? <Bot size={14} className="text-white" /> : <User size={14} className="text-white" />}
              </div>
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${msg.role === "assistant" ? "bg-gray-100 text-gray-800" : "bg-[#1B3FA8] text-white"}`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#1B3FA8] flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-gray-100 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {suggestBooking && serviceType && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-blue-900">Ready to schedule?</p>
            <p className="text-sm text-blue-700">I can create a {serviceType} service request for you, or you can book directly.</p>
            <div className="flex gap-2">
              <button onClick={createTicket} className={buttonVariants({ variant: "default" })}>
                <Calendar size={14} className="mr-1.5" />
                Create Request
              </button>
              <Link href="/booking" className={buttonVariants({ variant: "outline" })}>
                Book Online
              </Link>
            </div>
          </motion.div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your issue…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} className={buttonVariants({ variant: "default" })}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
