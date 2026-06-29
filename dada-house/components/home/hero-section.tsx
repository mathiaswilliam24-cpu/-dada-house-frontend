"use client";

import Link from "next/link";
import { Phone, AlertTriangle, Calendar, Star, CheckCircle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const services = [
  { label: "Plumbing", slug: "plumbing", emoji: "🔧" },
  { label: "Air Conditioning", slug: "air-conditioning", emoji: "❄️" },
  { label: "Heating", slug: "heating", emoji: "🔥" },
  { label: "Remodeling", slug: "remodeling", emoji: "🏠" },
];

const trustBadges = [
  { icon: CheckCircle, label: "Background-Checked" },
  { icon: Star, label: "5-Star Rated" },
  { icon: CheckCircle, label: "Same-Day Service" },
];

export default function HeroSection({ heroImage = "/team.jpg" }: { heroImage?: string }) {
  return (
    <section className="relative overflow-hidden">
      {/* Mobile background: 100% width, auto height from top — nothing cropped */}
      <div
        className="absolute inset-0 md:hidden"
        style={{
          backgroundImage: `url('/Backround%20dada%20house%20phone.png')`,
          backgroundSize: "100% auto",
          backgroundPosition: "top center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Desktop background — managed from admin Site Content */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden md:block"
        style={{ backgroundImage: `url('${heroImage}')` }}
      />

      {/* On mobile, push content below the image (image ratio ≈ 9:16 → height ≈ 178 vw) */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[178vw] md:pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7921A]/10 border border-[#F7921A]/30 rounded-full mb-8 fade-up">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[#F7921A] text-sm font-bold tracking-wide uppercase">
              Available 24 Hours / 7 Days a Week
            </span>
          </div>

          {/* Trust badges */}
          <div className="fade-up animate-delay-200 flex flex-wrap items-center justify-center gap-4 mb-12">
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-2 text-gray-800 text-sm font-semibold"
              >
                <badge.icon size={15} className="text-[#F7921A]" />
                <span>{badge.label}</span>
              </div>
            ))}
          </div>

          {/* Contact Cards */}
          <div className="fade-up animate-delay-300 grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto mb-5">
            {/* Service card */}
            <div className="contact-card relative bg-[#0D1D5E] border border-[#1A3490] hover:border-[#F7921A]/50 rounded-2xl p-6 text-left group">
              <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Phone size={40} className="text-[#F7921A]" />
              </div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-3">
                <span className="text-blue-300 text-xs font-bold uppercase tracking-wide">📞 Service Requests</span>
              </div>
              <a
                href="tel:+13466499353"
                className="block text-2xl font-black text-white hover:text-[#F7921A] transition-colors mb-2"
              >
                +1 (346) 649-9353
              </a>
              <p className="text-slate-400 text-sm mb-4">
                Call anytime for appointments and service requests.
              </p>
              <a
                href="tel:+13466499353"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F7921A] hover:bg-[#E07F10] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-900/20"
              >
                <Phone size={14} />
                Call Now
              </a>
            </div>

            {/* Emergency card */}
            <div className="contact-card relative bg-red-950/30 border border-red-900/40 hover:border-red-500/50 rounded-2xl p-6 text-left group">
              <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <AlertTriangle size={40} className="text-red-400" />
              </div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full mb-3">
                <span className="text-red-300 text-xs font-bold uppercase tracking-wide">🚨 Emergency Line</span>
              </div>
              <a
                href="tel:+18326264398"
                className="block text-2xl font-black text-white hover:text-red-400 transition-colors mb-2"
              >
                832-626-4398
              </a>
              <p className="text-slate-400 text-sm mb-4">
                Speak directly with a technician for urgent situations.
              </p>
              <a
                href="tel:+18326264398"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-all"
              >
                <AlertTriangle size={14} />
                Emergency Call
              </a>
            </div>
          </div>

          {/* SMS Card — full width */}
          <div className="fade-up animate-delay-300 max-w-2xl mx-auto mb-10">
            <a
              href="sms:+13466499353"
              className="contact-card group flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full bg-emerald-950/40 border border-emerald-800/50 hover:border-emerald-500/70 rounded-2xl p-5 text-left transition-all"
            >
              <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 group-hover:bg-emerald-500/25 transition-colors">
                <MessageSquare size={22} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-emerald-300 text-xs font-black uppercase tracking-widest">💬 Text Message Only</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-bold">SMS</span>
                </div>
                <p className="text-white text-xl font-black tracking-tight">346-649-9353</p>
                <p className="text-slate-400 text-sm mt-0.5">
                  Send us a text for quick questions &amp; appointment requests — <span className="text-emerald-400 font-semibold">text messages only</span>, no calls.
                </p>
              </div>
              <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all whitespace-nowrap">
                <MessageSquare size={14} />
                Send Text
              </div>
            </a>
          </div>

          {/* 24/7 label */}
          <div className="fade-up animate-delay-400 flex items-center justify-center gap-3 mb-10">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gray-400" />
            <span className="text-gray-700 text-sm font-bold tracking-[0.3em] uppercase">
              24 HOURS • 7 DAYS A WEEK
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gray-400" />
          </div>

          {/* CTA buttons */}
          <div className="fade-up animate-delay-400 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/booking"
              className={cn(
                buttonVariants({ size: "lg" }),
                "text-base font-black px-8 shadow-2xl shadow-orange-900/40"
              )}
            >
              <Calendar size={18} />
              Book Appointment
            </Link>
            <a
              href="tel:+13466499353"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "text-base font-bold px-8"
              )}
            >
              <Phone size={18} />
              Call Now
            </a>
          </div>

          {/* Quick service selector */}
          <div className="fade-up animate-delay-500 mt-14">
            <p className="text-white/70 text-sm font-semibold mb-4 uppercase tracking-wider">
              Quick Service Selection
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {services.map((s) => (
                <Link
                  key={s.slug}
                  href={`/booking?service=${s.label}`}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white/90 hover:bg-white border-2 border-white rounded-full text-sm font-bold text-[#1B3FA8] hover:text-[#F7921A] transition-all shadow-lg"
                >
                  <span>{s.emoji}</span>
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="wave-divider">
        <svg viewBox="0 0 1440 60" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z"
            fill="#ffffff"
          />
        </svg>
      </div>
    </section>
  );
}
