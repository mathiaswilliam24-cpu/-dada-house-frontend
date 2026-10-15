"use client";

import Link from "next/link";
import { Phone, Calendar, Star, CheckCircle, ArrowRight, Wrench, Shield, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const stats = [
  { value: "500+", label: "Jobs Completed" },
  { value: "5.0★", label: "Average Rating" },
  { value: "Same Day", label: "Availability" },
  { value: "100%", label: "Satisfaction" },
];

const services = [
  "TV Mounting",
  "Furniture Assembly",
  "Bathroom Remodeling",
  "Kitchen Remodeling",
  "Flooring & Tile",
  "Painting",
  "Plumbing",
  "Pressure Washing",
];

export default function HeroSection({ heroImage: _heroImage = "/hero-desktop.webp" }: { heroImage?: string }) {
  return (
    <div className="bg-white">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0A1628 0%, #102050 40%, #1B3FA8 100%)" }}>

        {/* Blueprint grid pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Cpath d='M60 0 L0 0 0 60' fill='none' stroke='%23ffffff' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
        }} />

        {/* Orange glow accent */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #F7921A 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)", transform: "translate(-30%, 30%)" }} />

        {/* Decorative tool shapes */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5 hidden lg:block">
          <svg width="320" height="320" viewBox="0 0 24 24" fill="white">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-5 md:px-10 pt-14 pb-16 md:pt-24 md:pb-28">
          <div className="max-w-2xl">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
              style={{ background: "rgba(247,146,26,0.15)", border: "1px solid rgba(247,146,26,0.35)" }}>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[#F7921A] text-xs font-bold tracking-widest uppercase">Available Now · TX &amp; NC</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-black text-white leading-[1.05] mb-5">
              Your Trusted<br />
              <span className="text-[#F7921A]">Handyman</span> &amp;<br />
              Remodeling Pros
            </h1>

            <p className="text-slate-300 text-lg md:text-xl max-w-xl leading-relaxed mb-8">
              From TV mounting to full kitchen remodels — skilled, background-checked technicians across Texas &amp; North Carolina. Same-day service.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link href="/booking" className={cn(buttonVariants({ size: "lg" }), "gap-2 font-bold text-base shadow-lg shadow-orange-900/30")}>
                <Calendar size={18} />
                Book a Free Estimate
              </Link>
              <a href="tel:+18449280875"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-base text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
                <Phone size={18} />
                (844) 928-0875
              </a>
            </div>

            {/* Service tags */}
            <div className="flex flex-wrap gap-2">
              {services.map((s) => (
                <span key={s} className="px-3 py-1 text-xs font-semibold rounded-full"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative border-t" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.25)" }}>
          <div className="max-w-7xl mx-auto px-5 md:px-10 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-[#F7921A]">{s.value}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="bg-white border-b border-slate-100 py-4">
        <div className="max-w-7xl mx-auto px-5 md:px-10 flex flex-wrap items-center justify-center gap-6">
          {[
            { icon: Shield, text: "Background-Checked Technicians" },
            { icon: CheckCircle, text: "Licensed & Insured" },
            { icon: Star, text: "5-Star Rated Service" },
            { icon: Clock, text: "Same-Day Availability" },
            { icon: Wrench, text: "Free Estimates" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-slate-600">
              <Icon size={15} className="text-[#F7921A]" />
              <span className="text-sm font-semibold">{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTACT CARDS ── */}
      <section className="bg-[#F8FAFC] py-8 px-5">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Book Online */}
          <Link href="/booking"
            className="group flex flex-col items-center text-center bg-[#1B3FA8] rounded-2xl p-6 hover:bg-[#0D1D5E] transition-colors shadow-md shadow-blue-900/20">
            <div className="w-12 h-12 rounded-xl bg-[#F7921A]/20 border border-[#F7921A]/30 flex items-center justify-center mb-3">
              <Calendar size={22} className="text-[#F7921A]" />
            </div>
            <p className="text-white font-bold text-sm mb-1">Book Online</p>
            <p className="text-slate-400 text-xs leading-snug mb-3">Pick your service &amp; schedule</p>
            <span className="inline-flex items-center gap-1 text-[#F7921A] text-xs font-bold group-hover:gap-2 transition-all">
              Get Started <ArrowRight size={12} />
            </span>
          </Link>

          {/* Call */}
          <a href="tel:+18449280875"
            className="group flex flex-col items-center text-center bg-[#1B3FA8] rounded-2xl p-6 hover:bg-[#0D1D5E] transition-colors shadow-md shadow-blue-900/20">
            <div className="w-12 h-12 rounded-xl bg-[#F7921A]/20 border border-[#F7921A]/30 flex items-center justify-center mb-3">
              <Phone size={22} className="text-[#F7921A]" />
            </div>
            <p className="text-white font-bold text-sm mb-1">Call Us Now</p>
            <p className="text-[#F7921A] font-black text-lg leading-none mb-1">(844) 928-0875</p>
            <p className="text-slate-400 text-xs">24 / 7 · Emergency line</p>
          </a>

          {/* Text */}
          <a href="sms:+18449280875"
            className="group flex flex-col items-center text-center bg-[#1B3FA8] rounded-2xl p-6 hover:bg-[#0D1D5E] transition-colors shadow-md shadow-blue-900/20">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6 text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-white font-bold text-sm mb-1">Send a Text</p>
            <p className="text-white font-black text-lg leading-none mb-1">844-928-0875</p>
            <p className="text-slate-400 text-xs">Quick questions &amp; quotes</p>
          </a>
        </div>
      </section>
    </div>
  );
}
