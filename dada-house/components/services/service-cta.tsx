import Link from "next/link";
import { Calendar, Phone, AlertTriangle } from "lucide-react";

export default function ServiceCta({ serviceName }: { serviceName: string }) {
  return (
    <section className="section-navy py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-black text-white mb-5">
          Need {serviceName} Service?
        </h2>
        <p className="text-blue-200 text-xl mb-10">
          Our licensed technicians are on standby 24/7. Book online or call now.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={`/booking?service=${encodeURIComponent(serviceName)}`}
            className="flex items-center gap-2 px-8 py-4 bg-[#F7921A] hover:bg-[#E07F10] text-white font-black text-base rounded-xl transition-all shadow-xl shadow-orange-900/30"
          >
            <Calendar size={18} />
            Book Now
          </Link>
          <a
            href="tel:+13466499353"
            className="flex items-center gap-2 px-8 py-4 border border-[#1A3490] hover:border-[#F7921A] text-blue-200 hover:text-white text-base font-bold rounded-xl transition-all"
          >
            <Phone size={18} />
            +1 (346) 649-9353
          </a>
        </div>

        <div className="mt-8">
          <a
            href="tel:+18326264398"
            className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-semibold transition-colors"
          >
            <AlertTriangle size={14} />
            Emergency? Call 832-626-4398 — 24/7 Response
          </a>
        </div>
      </div>
    </section>
  );
}
