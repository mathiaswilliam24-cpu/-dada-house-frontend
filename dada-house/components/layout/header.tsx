"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import {
  Wrench, Star, Info, Mail, ShoppingBag, Images,
  Calendar, User, LogOut, ShieldCheck, Phone, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const navLinks = [
  { href: "/services",  label: "Services",       icon: Wrench },
  { href: "/about",     label: "About",           icon: Info },
  { href: "/reviews",   label: "Reviews",         icon: Star },
  { href: "/store",     label: "Store",           icon: ShoppingBag },
  { href: "/gallery",   label: "Project Gallery", icon: Images },
  { href: "/contact",   label: "Contact",         icon: Mail },
];

export default function Header() {
  const [dropOpen, setDropOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="shadow-md">

      {/* ── Row 1: Logo + actions — white background ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <Link href="/" className="flex items-center flex-shrink-0">
              <Image
                src="/logo dada house.png"
                alt="DADA HOUSE"
                width={120}
                height={42}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>

            {/* Right actions — always visible */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Emergency — hide label on small screens */}
              <a
                href="tel:+18326264398"
                className="hidden sm:flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold"
              >
                <Phone size={11} />
                Emergency
              </a>

              {/* Account / Sign In */}
              {session ? (
                <div className="relative">
                  <button
                    onClick={() => setDropOpen(!dropOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 hover:border-[#F7921A] transition-colors text-sm text-gray-700 font-medium"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#F7921A] flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                      {session.user?.name?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <span className="hidden sm:inline text-xs">{session.user?.name?.split(" ")[0]}</span>
                  </button>
                  {dropOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-[#1B3FA8] border border-[#1A3490] rounded-xl shadow-2xl z-50">
                      {session.user?.role === "ADMIN" ? (
                        <Link href="/admin" onClick={() => setDropOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 rounded-t-xl transition-colors">
                          <ShieldCheck size={16} className="text-[#F7921A]" />
                          Admin Panel
                        </Link>
                      ) : (
                        <Link href="/portal" onClick={() => setDropOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/10 rounded-t-xl transition-colors">
                          <User size={16} className="text-[#F7921A]" />
                          My Portal
                        </Link>
                      )}
                      <div className="h-px bg-[#1A3490]" />
                      <button
                        onClick={() => { signOut({ callbackUrl: "/" }); setDropOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 rounded-b-xl w-full text-left transition-colors"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/auth/login"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                  <User size={13} />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              )}

              {/* Book Service */}
              <Link href="/booking"
                className={cn(buttonVariants({ size: "sm" }), "gap-1 text-xs px-2.5")}>
                <Calendar size={12} />
                <span className="hidden sm:inline">Book Service</span>
                <span className="sm:hidden">Book</span>
              </Link>

              {/* Mobile extra menu (phone numbers) */}
              <button
                className="sm:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="More options"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 2: Nav links — ALWAYS VISIBLE, scrollable on mobile ── */}
      <div className="bg-[#1B3FA8]">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <nav className="flex items-center overflow-x-auto h-11" style={{ scrollbarWidth: "none" }}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 sm:px-4 h-full flex items-center text-sm font-bold whitespace-nowrap flex-shrink-0 border-b-2 transition-all",
                  isActive(link.href)
                    ? "text-[#F7921A] border-[#F7921A]"
                    : "text-white border-transparent hover:text-[#F7921A] hover:border-[#F7921A]/50"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Mobile extra panel (phone numbers) ── */}
      {menuOpen && (
        <div className="sm:hidden border-t border-white/10 bg-[#0D1D5E]">
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            <a href="tel:+19106858042"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#1B3FA8] border border-white/20 rounded-xl text-xs text-white font-semibold">
              <Phone size={12} />
              Service Line
            </a>
            <a href="tel:+18326264398"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-red-900/40 border border-red-700/40 rounded-xl text-xs text-red-300 font-semibold">
              <Phone size={12} />
              Emergency
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
