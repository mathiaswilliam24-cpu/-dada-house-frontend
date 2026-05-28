"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Briefcase, FileText, Users, Receipt, User } from "lucide-react";

const NAV = [
  { href: "/technician", label: "Today", icon: Calendar, exact: true },
  { href: "/technician/jobs", label: "Jobs", icon: Briefcase, exact: false },
  { href: "/technician/invoices", label: "Invoices", icon: Receipt, exact: false },
  { href: "/technician/clients", label: "Clients", icon: Users, exact: false },
  { href: "/technician/profile", label: "Profile", icon: User, exact: false },
];

export default function TechnicianNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center safe-area-pb z-30">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
              active ? "text-[#1B3FA8]" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Icon
              size={20}
              strokeWidth={active ? 2.5 : 1.8}
              className={href === "/technician/schedule" ? "w-5 h-5" : ""}
            />
            <span className={`text-[10px] font-medium ${active ? "font-bold" : ""}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
