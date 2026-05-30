import Link from "next/link";
import Image from "next/image";
import {
  Phone,
  AlertTriangle,
  Mail,
  Globe,
  Clock,
  MapPin,
} from "lucide-react";

const serviceLinks = [
  { href: "/services/plumbing", label: "Plumbing" },
  { href: "/services/air-conditioning", label: "Air Conditioning" },
  { href: "/services/heating", label: "Heating" },
  { href: "/services/remodeling", label: "Remodeling" },
];

const quickLinks = [
  { href: "/booking", label: "Book Service" },
  { href: "/reviews", label: "Customer Reviews" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
  { href: "/store", label: "Store" },
];

const accountLinks = [
  { href: "/auth/login", label: "Sign In" },
  { href: "/auth/register", label: "Create Account" },
  { href: "/dashboard", label: "Client Dashboard" },
];

export default function Footer() {
  return (
    <footer className="bg-[#081040] border-t border-[#1A3490]">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand column */}
          <div className="lg:col-span-1">
            {/* Logo */}
            <div className="mb-4">
              <Image
                src="/logo dada house.png"
                alt="DADA HOUSE"
                width={160}
                height={56}
                className="h-14 w-auto object-contain"
              />
            </div>

            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Houston&apos;s premier home services company. Expert plumbing, AC,
              heating, and remodeling — available around the clock.
            </p>

            {/* Contact info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-[#F7921A] flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Service Requests</p>
                  <a
                    href="tel:+19106858042"
                    className="text-white font-bold text-sm hover:text-[#F7921A] transition-colors"
                  >
                    +1 (910) 685-8042
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Emergency Line</p>
                  <a
                    href="tel:+18326264398"
                    className="text-red-400 font-bold text-sm hover:text-red-300 transition-colors"
                  >
                    832-626-4398
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Mail size={14} className="text-[#F7921A] flex-shrink-0" />
                <a
                  href="mailto:customerservice@mydadahouse.com"
                  className="text-slate-400 text-sm hover:text-white transition-colors"
                >
                  customerservice@mydadahouse.com
                </a>
              </div>

              <div className="flex items-center gap-2">
                <Globe size={14} className="text-[#F7921A] flex-shrink-0" />
                <a
                  href="https://mydadahouse.com"
                  className="text-slate-400 text-sm hover:text-white transition-colors"
                >
                  mydadahouse.com
                </a>
              </div>

              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[#F7921A] flex-shrink-0" />
                <span className="text-slate-400 text-sm">Houston, TX</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock size={14} className="text-green-400 flex-shrink-0" />
                <span className="text-green-400 text-sm font-semibold">
                  24 Hours / 7 Days a Week
                </span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">
              Our Services
            </h3>
            <ul className="space-y-3">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-400 text-sm hover:text-[#F7921A] transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#F7921A] opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">
              Quick Links
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-400 text-sm hover:text-[#F7921A] transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#F7921A] opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">
              Account
            </h3>
            <ul className="space-y-3">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-slate-400 text-sm hover:text-[#F7921A] transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#F7921A] opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Book service CTA */}
            <div className="mt-8">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                Ready to get started?
              </p>
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F7921A] hover:bg-[#E07F10] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-900/30"
              >
                Book Service Now
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#1A3490]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <p className="text-slate-500 text-sm">
              © {new Date().getFullYear()} DADA HOUSE. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/privacy-policy" className="text-slate-500 text-xs hover:text-[#F7921A] transition-colors">
                Privacy Policy
              </Link>
              <span className="text-slate-700">·</span>
              <Link href="/terms" className="text-slate-500 text-xs hover:text-[#F7921A] transition-colors">
                Terms & Conditions
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-sm font-semibold">
              Available 24/7
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
