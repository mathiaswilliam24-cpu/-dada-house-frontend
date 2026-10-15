import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone, CheckCircle, Calendar } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import CTASection from "@/components/home/cta-section";

export const metadata: Metadata = {
  title: "Handyman Services Texas & North Carolina | DADA HOUSE",
  description:
    "Professional handyman services in Texas & North Carolina. TV mounting, furniture assembly, door repairs, ceiling fans, pressure washing & more. Same-day service. Call (844) 928-0875.",
  alternates: { canonical: "/services/handyman" },
};

const tasks = [
  {
    category: "Installation",
    items: ["TV Mounting & Cable Management", "Ceiling Fan Installation", "Light Fixture Replacement", "Shelf & Closet Installation", "Curtain & Blind Hanging", "Smart Thermostat Install"],
  },
  {
    category: "Assembly",
    items: ["Furniture Assembly (IKEA, Amazon, etc.)", "Outdoor Furniture & Grills", "Playground & Swing Sets", "Office Desk & Chair Assembly", "Bed Frame & Headboard Assembly", "Storage Unit Assembly"],
  },
  {
    category: "Repairs",
    items: ["Door Hinge & Lock Repair", "Window Screen Replacement", "Caulking & Weatherstripping", "Drywall Patch (small holes)", "Cabinet Door & Drawer Repair", "Fence & Gate Repair"],
  },
  {
    category: "Outdoor",
    items: ["Pressure Washing (Driveway, Deck, Siding)", "Gutter Cleaning & Inspection", "Deck Staining & Sealing", "Garden Bed Preparation", "Exterior Caulking", "Mailbox Installation"],
  },
];

const whyUs = [
  "Same-day and next-day availability",
  "Background-checked, vetted technicians",
  "Flat-rate pricing — no surprise fees",
  "5-star rated across Texas & North Carolina",
  "Before & after photos on every job",
  "Satisfaction guaranteed",
];

export default function HandymanPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero-gradient py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-5">
            Most Popular Service
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-5">
            Professional Handyman Services
          </h1>
          <p className="text-blue-200 text-xl max-w-2xl mx-auto mb-8">
            No job too small. TV mounting, furniture assembly, door repairs, pressure washing — we handle it all, same day, across Texas &amp; North Carolina.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/booking" className={cn(buttonVariants({ size: "lg" }), "gap-2 font-bold text-base")}>
              <Calendar size={18} />
              Book a Handyman
            </Link>
            <a
              href="tel:+18449280875"
              className="flex items-center gap-2 text-white/70 hover:text-white text-sm font-semibold transition-colors"
            >
              <Phone size={14} />
              Call (844) 928-0875
            </a>
          </div>
        </div>
        <div className="wave-divider">
          <svg viewBox="0 0 1440 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,25 C360,50 1080,0 1440,25 L1440,50 L0,50 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* Services grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-[#1B3FA8] mb-3">What We Can Do For You</h2>
            <p className="text-slate-500">From a single task to a full honey-do list — we get it done.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tasks.map((group) => (
              <div key={group.category} className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-6">
                <h3 className="text-[#1B3FA8] font-bold text-lg mb-4">{group.category}</h3>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle size={14} className="text-[#F7921A] mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-400 text-sm mt-6">
            Don&apos;t see your task? Call us — if we can&apos;t do it, we&apos;ll refer you to someone who can.
          </p>
        </div>
      </section>

      {/* Why choose us */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black text-[#1B3FA8] text-center mb-10">Why Homeowners Choose DADA HOUSE</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {whyUs.map((point) => (
              <div key={point} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4">
                <CheckCircle size={18} className="text-[#F7921A] shrink-0" />
                <span className="text-slate-700 font-medium text-sm">{point}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/booking" className={cn(buttonVariants({ size: "lg" }), "gap-2 font-bold")}>
              <Calendar size={16} />
              Schedule Your Handyman
            </Link>
          </div>
        </div>
      </section>

      {/* Also offer */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-black text-[#1B3FA8] mb-6">Also Looking For…</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { label: "Bathroom Remodeling", href: "/services/remodeling" },
              { label: "Kitchen Remodeling", href: "/services/remodeling" },
              { label: "Flooring & Tile", href: "/services/remodeling" },
              { label: "Plumbing Repairs", href: "/services/plumbing" },
              { label: "AC Repair", href: "/services/air-conditioning" },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-[#F7921A]/50 text-slate-600 hover:text-[#F7921A] text-sm font-semibold rounded-xl transition-colors"
              >
                {link.label}
                <ArrowRight size={13} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
