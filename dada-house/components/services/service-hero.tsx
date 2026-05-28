import Link from "next/link";
import { Calendar, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface ServiceHeroProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
}

export default function ServiceHero({
  title,
  description,
  icon,
  badge,
}: ServiceHeroProps) {
  return (
    <section className="hero-gradient relative overflow-hidden py-20 lg:py-28">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {badge && (
            <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-6">
              {badge}
            </span>
          )}

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-[#F7921A]/10 border border-[#F7921A]/30 rounded-2xl flex items-center justify-center text-[#F7921A]">
              {icon}
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white">
              {title}
            </h1>
          </div>

          <p className="text-xl text-blue-200 mb-10 leading-relaxed">
            {description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={`/booking?service=${encodeURIComponent(title)}`}
              className={cn(buttonVariants({ size: "lg" }), "text-base font-black")}
            >
              <Calendar size={18} />
              Book This Service
            </Link>
            <a
              href="tel:+19106858042"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "text-base font-bold")}
            >
              <Phone size={18} />
              Call Now
            </a>
          </div>
        </div>
      </div>

      <div className="wave-divider">
        <svg viewBox="0 0 1440 50" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,25 C360,50 1080,0 1440,25 L1440,50 L0,50 Z" fill="#ffffff" />
        </svg>
      </div>
    </section>
  );
}
