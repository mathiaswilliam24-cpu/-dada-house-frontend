"use client";

import Link from "next/link";
import { Phone, AlertTriangle, Calendar, Star, CheckCircle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const trustBadges = [
  { icon: CheckCircle, label: "Background-Checked" },
  { icon: Star, label: "5-Star Rated" },
  { icon: CheckCircle, label: "Same-Day Service" },
];

export default function HeroSection({ heroImage = "/Backround%20dada%20house%20web%20site.png" }: { heroImage?: string }) {
  return (
    <div>
      {/* ── Badge + Trust (white background) ── */}
      <div className="bg-white px-4 pt-5 pb-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7921A]/10 border border-[#F7921A]/30 rounded-full mb-4">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[#F7921A] text-sm font-bold tracking-wide uppercase">
            Available 24 Hours / 7 Days a Week
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {trustBadges.map((badge) => (
            <div key={badge.label} className="flex items-center gap-1.5 text-gray-700 text-sm font-semibold">
              <badge.icon size={15} className="text-[#F7921A]" />
              <span>{badge.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hero image with overlaid content ── */}
      <section className="relative min-h-[400px] md:min-h-[640px]">
        {/* Mobile background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat md:hidden"
          style={{ backgroundImage: `url('/Backround%20dada%20house%20phone.png')` }}
        />
        {/* Desktop background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden md:block"
          style={{ backgroundImage: `url('${heroImage}')` }}
        />

        <div className="relative px-5 pt-8 pb-10 md:max-w-7xl md:mx-auto md:px-10 md:pt-24 md:pb-28">
          {/* Book Appointment button */}
          <Link
            href="/booking"
            className={cn(buttonVariants({ size: "default" }), "gap-2 font-bold")}
          >
            <Calendar size={16} />
            Book Appointment
          </Link>

          {/* Rating row */}
          <div className="flex items-center gap-2 mt-5">
            <div className="flex -space-x-2">
              {["#3B82F6", "#8B5CF6", "#EF4444", "#10B981"].map((color, i) => (
                <div
                  key={i}
                  style={{ backgroundColor: color }}
                  className="w-8 h-8 rounded-full border-2 border-white"
                />
              ))}
            </div>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={13} className="fill-[#F7921A] text-[#F7921A]" />
              ))}
            </div>
            <span className="text-[#F7921A] text-sm font-bold">5.0 (200+ Reviews)</span>
          </div>
        </div>
      </section>

      {/* ── Contact cards ── */}
      <div className="bg-white px-4 py-5">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Service Requests */}
          <div className="bg-[#0D1D5E] rounded-2xl p-4">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500/20 border border-blue-500/20 rounded-full mb-2">
              <Phone size={10} className="text-blue-300" />
              <span className="text-blue-300 text-[10px] font-bold uppercase tracking-wide">Service Requests</span>
            </div>
            <a href="tel:+13466499353" className="block text-white text-lg font-black leading-tight mb-1">
              +1 (346) 649-9353
            </a>
            <p className="text-slate-400 text-xs mb-3 leading-snug">Call anytime for appointments and service requests.</p>
            <a
              href="tel:+13466499353"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F7921A] hover:bg-[#E07F10] text-white text-xs font-bold rounded-xl transition-colors"
            >
              <Phone size={11} />
              Call Now
            </a>
          </div>

          {/* Emergency Line */}
          <div className="bg-red-950/90 border border-red-900/40 rounded-2xl p-4">
            <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-500/20 border border-red-500/20 rounded-full mb-2">
              <AlertTriangle size={10} className="text-red-300" />
              <span className="text-red-300 text-[10px] font-bold uppercase tracking-wide">Emergency Line</span>
            </div>
            <a href="tel:+18326264398" className="block text-white text-lg font-black leading-tight mb-1">
              832-626-4398
            </a>
            <p className="text-slate-400 text-xs mb-3 leading-snug">Speak directly with a technician for urgent situations.</p>
            <a
              href="tel:+18326264398"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <AlertTriangle size={11} />
              Emergency Call
            </a>
          </div>
        </div>

        {/* SMS Card */}
        <a
          href="sms:+13466499353"
          className="flex items-center gap-3 w-full bg-emerald-950/40 border border-emerald-800/50 hover:border-emerald-500/70 rounded-2xl p-4 transition-colors"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <MessageSquare size={18} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="text-emerald-300 text-[10px] font-black uppercase tracking-widest">💬 Text Message Only</span>
              <span className="px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-bold">SMS</span>
            </div>
            <p className="text-white text-base font-black">346-649-9353</p>
            <p className="text-slate-400 text-xs leading-snug mt-0.5">
              Send us a text for quick questions &amp; appointment requests —{" "}
              <span className="text-emerald-400 font-semibold">text messages only</span>, no calls.
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl transition-colors whitespace-nowrap">
            <MessageSquare size={12} />
            Send Text
          </div>
        </a>
      </div>

      {/* ── 24 HOURS divider ── */}
      <div className="flex items-center justify-center gap-3 py-5 bg-white">
        <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#1A3490]" />
        <span className="text-[#1B3FA8] text-sm font-bold tracking-[0.3em] uppercase">
          24 HOURS • 7 DAYS A WEEK
        </span>
        <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#1A3490]" />
      </div>
    </div>
  );
}
