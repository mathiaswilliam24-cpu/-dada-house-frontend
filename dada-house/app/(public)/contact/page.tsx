import type { Metadata } from "next";
import { Phone, AlertTriangle, Mail, Globe, MapPin, Clock } from "lucide-react";
import ContactForm from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact DADA HOUSE — Houston Home Services",
  description:
    "Contact DADA HOUSE for plumbing, AC, heating, and remodeling in Houston TX. Call +1 (346) 649-9353 or use our contact form. Available 24/7.",
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="hero-gradient py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-3 py-1 bg-[#F7921A]/10 border border-[#F7921A]/30 text-[#F7921A] text-xs font-bold rounded-full uppercase tracking-wider mb-5">
            Get In Touch
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Contact DADA HOUSE
          </h1>
          <p className="text-blue-200 text-xl max-w-2xl mx-auto">
            We&apos;re available 24/7. Reach us by phone, email, or use the form
            below and we&apos;ll respond promptly.
          </p>
        </div>
        <div className="wave-divider">
          <svg viewBox="0 0 1440 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,25 C360,50 1080,0 1440,25 L1440,50 L0,50 Z" fill="#f8fafc" />
          </svg>
        </div>
      </section>

      {/* Contact content */}
      <section className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Sidebar info */}
            <div className="space-y-6">
              {/* Service line */}
              <div className="bg-[#1B3FA8] border border-[#1A3490] rounded-2xl p-6">
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                  <Phone size={20} className="text-blue-400" />
                </div>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">
                  📞 Service Requests
                </p>
                <a
                  href="tel:+13466499353"
                  className="block text-xl font-black text-white hover:text-[#F7921A] transition-colors"
                >
                  +1 (346) 649-9353
                </a>
                <p className="text-slate-400 text-sm mt-1">
                  Appointments and service scheduling
                </p>
              </div>

              {/* Emergency */}
              <div className="bg-red-950/30 border border-red-900/40 rounded-2xl p-6">
                <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center mb-4">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">
                  🚨 Emergency Line
                </p>
                <a
                  href="tel:+18326264398"
                  className="block text-xl font-black text-red-400 hover:text-red-300 transition-colors"
                >
                  832-626-4398
                </a>
                <p className="text-slate-400 text-sm mt-1">
                  24/7 emergency technician response
                </p>
              </div>

              {/* Other info */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-[#F7921A] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Email</p>
                    <a
                      href="mailto:customerservice@dada-house.com"
                      className="text-[#1B3FA8] text-sm font-medium hover:text-[#F7921A] transition-colors"
                    >
                      customerservice@dada-house.com
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe size={16} className="text-[#F7921A] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Website</p>
                    <span className="text-[#1B3FA8] text-sm font-medium">
                      dada-house.com
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={16} className="text-[#F7921A] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Service Area</p>
                    <span className="text-[#1B3FA8] text-sm font-medium">
                      Houston, TX & Surrounding Areas
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Availability</p>
                    <span className="text-green-600 text-sm font-bold">
                      24 Hours / 7 Days a Week
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-slate-200 rounded-2xl p-8">
                <h2 className="text-2xl font-black text-[#1B3FA8] mb-2">
                  Send Us a Message
                </h2>
                <p className="text-slate-500 mb-8">
                  Fill out the form and our team will get back to you as soon as
                  possible.
                </p>
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
