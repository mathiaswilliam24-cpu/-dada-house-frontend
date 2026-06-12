import type { Metadata } from "next";
import BookingForm from "@/components/booking/booking-form";
import { Phone, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Book a Service — DADA HOUSE Houston",
  description:
    "Schedule your home service appointment online with DADA HOUSE. Plumbing, AC, heating, and remodeling. Available 24/7.",
};

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-[#1B3FA8]">
      {/* Header */}
      <section className="hero-gradient py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-4">
            Schedule Service
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Book Your Appointment
          </h1>
          <p className="text-blue-200 text-xl">
            Fill out the form and we&apos;ll contact you to confirm. Usually
            within 30 minutes.
          </p>

          <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
            <a
              href="tel:+13466499353"
              className="flex items-center gap-2 text-blue-200 hover:text-white text-sm font-semibold transition-colors"
            >
              <Phone size={14} />
              Prefer to call? +1 (346) 649-9353
            </a>
            <a
              href="tel:+18326264398"
              className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-semibold transition-colors"
            >
              <AlertTriangle size={14} />
              Emergency: 832-626-4398
            </a>
          </div>
        </div>
        <div className="wave-divider">
          <svg viewBox="0 0 1440 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,25 C360,50 1080,0 1440,25 L1440,50 L0,50 Z" fill="#081040" />
          </svg>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 bg-[#081040]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <BookingForm />
        </div>
      </section>
    </div>
  );
}
