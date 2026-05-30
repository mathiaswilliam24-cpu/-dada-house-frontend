"use client";

import { Phone, AlertTriangle, MessageSquare } from "lucide-react";

export default function AnnouncementBar() {
  return (
    <div className="announcement-shimmer relative overflow-hidden z-50">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        {/* Contact info — hidden on smallest screens */}
        <div className="hidden md:flex items-center gap-2 text-white/90 text-xs">
          <Phone size={11} />
          <span className="font-semibold">+1 (910) 685-8042</span>
          <span className="text-white/50 mx-1">|</span>
          <AlertTriangle size={11} />
          <span className="font-semibold">832-626-4398</span>
          <span className="text-white/50 mx-1">|</span>
          <MessageSquare size={11} />
          <span className="font-semibold">346-649-9353</span>
          <span className="text-white/60 text-[10px]">(text only)</span>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href="tel:+19106858042"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 border border-white/40 rounded-lg text-white text-xs font-bold transition-all whitespace-nowrap"
          >
            <Phone size={11} />
            <span className="hidden sm:inline">Call Service Line</span>
            <span className="sm:hidden">Service</span>
          </a>
          <a
            href="sms:+13466499353"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-xs font-black transition-all whitespace-nowrap"
          >
            <MessageSquare size={11} />
            <span className="hidden sm:inline">Text Us</span>
            <span className="sm:hidden">Text</span>
          </a>
          <a
            href="tel:+18326264398"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-orange-700 hover:bg-orange-50 rounded-lg text-xs font-black transition-all whitespace-nowrap shadow-lg"
          >
            <AlertTriangle size={11} />
            <span className="hidden sm:inline">Emergency Call</span>
            <span className="sm:hidden">Emergency</span>
          </a>
        </div>
      </div>
    </div>
  );
}
