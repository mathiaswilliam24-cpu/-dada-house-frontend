"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export function AdminNavLink({ href, label, icon: Icon }: Props) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? "bg-white/15 text-white font-medium"
          : "text-gray-300 hover:text-white hover:bg-white/10"
      }`}
    >
      <Icon size={16} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
