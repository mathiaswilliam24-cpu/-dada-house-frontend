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
  "AC Installation",
  "AC Repair",
  "Heating Repair",
  "Furnace Tune-Up",
  "Air Duct Cleaning",
  "Dryer Vent Cleaning",
  "Mini-Split Install",
  "Maintenance Plan",
];

export default function HeroSection({ heroImage: _heroImage = "/hero-desktop.webp" }: { heroImage?: string }) {
  return (
    <div className="bg-white">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden min-h-[520px] md:min-h-[640px]">

        {/* Background photo — mobile */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat md:hidden"
          style={{ backgroundImage: `url('/hero-mobile.webp')` }}
        />
        {/* Background photo — desktop */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden md:block"
          style={{ backgroundImage: `url('${_heroImage}')` }}
        />

        {/* Dark overlay so text stays readable */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(10,22,40,0.88) 0%, rgba(27,63,168,0.70) 60%, rgba(10,22,40,0.75) 100%)" }} />

        {/* Orange glow accent */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #F7921A 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />

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
              <span className="text-[#F7921A]">HVAC</span> &amp;<br />
              Air Quality Pros
            </h1>

            <p className="text-slate-300 text-lg md:text-xl max-w-xl leading-relaxed mb-8">
              AC installation, heating, and air duct cleaning — licensed, background-checked HVAC technicians across Texas &amp; North Carolina. Same-day service.
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

      {/* ── WHAT DO YOU NEED TODAY? ── */}
      <section className="bg-[#F8FAFC] py-10 px-5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">
            What brings you here today?
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Emergency */}
            <a href="tel:+18449280875"
              className="group flex flex-col items-center text-center p-5 md:p-7 rounded-2xl bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-900/25 cursor-pointer">
              <span className="text-4xl mb-3">🚨</span>
              <p className="text-white font-black text-sm leading-tight mb-1">AC Broke Down</p>
              <p className="text-red-200 text-xs mb-3">Same-day emergency service</p>
              <span className="px-3 py-1.5 bg-white/20 rounded-lg text-white font-black text-xs">(844) 928-0875</span>
            </a>

            {/* Book */}
            <Link href="/booking"
              className="group flex flex-col items-center text-center p-5 md:p-7 rounded-2xl bg-[#1B3FA8] hover:bg-[#0D1D5E] transition-all shadow-lg shadow-blue-900/25">
              <span className="text-4xl mb-3">📅</span>
              <p className="text-white font-black text-sm leading-tight mb-1">Book a Service</p>
              <p className="text-slate-300 text-xs mb-3">AC · Heating · Duct Cleaning</p>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F7921A] rounded-lg text-white font-black text-xs group-hover:bg-[#e07f10] transition-colors">
                Book Online <ArrowRight size={11} />
              </span>
            </Link>

            {/* Air duct */}
            <Link href="/services/air-duct-cleaning"
              className="group flex flex-col items-center text-center p-5 md:p-7 rounded-2xl bg-teal-700 hover:bg-teal-800 transition-all shadow-lg shadow-teal-900/25">
              <span className="text-4xl mb-3">🌬️</span>
              <p className="text-white font-black text-sm leading-tight mb-1">Air Duct Cleaning</p>
              <p className="text-teal-200 text-xs mb-3">Ducts · Dryer vents · Mold</p>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 rounded-lg text-white font-black text-xs">
                Get a Quote <ArrowRight size={11} />
              </span>
            </Link>

            {/* Maintenance Plan */}
            <Link href="/hvac-maintenance-plan"
              className="group flex flex-col items-center text-center p-5 md:p-7 rounded-2xl bg-[#0A1628] hover:bg-[#061020] border-2 border-[#F7921A]/50 hover:border-[#F7921A] transition-all shadow-lg">
              <span className="text-4xl mb-3">🛡️</span>
              <p className="text-white font-black text-sm leading-tight mb-1">Maintenance Plan</p>
              <p className="text-[#F7921A] font-black text-xl leading-none mb-3">$199<span className="text-sm font-semibold text-slate-400">/yr</span></p>
              <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F7921A] rounded-lg text-white font-black text-xs group-hover:bg-[#e07f10] transition-colors">
                Enroll Now <ArrowRight size={11} />
              </span>
            </Link>

          </div>
        </div>
      </section>
    </div>
  );
}
