import Link from "next/link";
import { Calendar, Phone, AlertTriangle } from "lucide-react";

export default function CTASection() {
  return (
    <section className="py-20 bg-[#F7921A] relative overflow-hidden">
      {/* Subtle pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-5">
          Ready to Get Started?
        </h2>
        <p className="text-orange-100 text-xl mb-10 max-w-2xl mx-auto">
          Our team is available 24/7 for all your home service needs. Schedule
          online or call us right now.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/booking"
            className="flex items-center gap-2 px-8 py-4 bg-white hover:bg-orange-50 text-[#F7921A] font-black text-base rounded-xl transition-all shadow-xl"
          >
            <Calendar size={18} />
            Book Appointment Online
          </Link>

          <a
            href="tel:+13466499353"
            className="flex items-center gap-2 px-8 py-4 bg-transparent hover:bg-white/10 border-2 border-white text-white font-black text-base rounded-xl transition-all"
          >
            <Phone size={18} />
            Call +1 (346) 649-9353
          </a>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          <AlertTriangle size={14} className="text-orange-200" />
          <a
            href="tel:+18326264398"
            className="text-orange-100 text-sm font-semibold hover:text-white transition-colors"
          >
            Emergency? Call 832-626-4398 — We answer 24/7
          </a>
        </div>
      </div>
    </section>
  );
}
