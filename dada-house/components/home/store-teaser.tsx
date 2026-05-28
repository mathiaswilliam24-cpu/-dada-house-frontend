import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";

export default function StoreTeaser() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-[#1B3FA8] rounded-3xl overflow-hidden border border-[#1A3490] p-10 md:p-16">
          {/* Background pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "28px 28px",
            }}
          />

          {/* Orange glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#F7921A]/10 blur-3xl rounded-full" />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-[#F7921A]/10 border border-[#F7921A]/30 rounded-xl flex items-center justify-center">
                  <ShoppingBag size={24} className="text-[#F7921A]" />
                </div>
                <span className="text-[#F7921A] text-sm font-bold uppercase tracking-wider">
                  DADA HOUSE Store
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
                Shop Trusted Products &<br />Home Solutions
              </h2>
              <p className="text-slate-400 text-lg mb-6 max-w-lg">
                HVAC filters, plumbing supplies, tools, and professional-grade
                home maintenance products — all in one place.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {[
                  "HVAC Products",
                  "Plumbing Parts",
                  "Power Tools",
                  "Service Plans",
                ].map((cat) => (
                  <div
                    key={cat}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-400 text-center font-medium"
                  >
                    {cat}
                  </div>
                ))}
              </div>

              <Link
                href="/store"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#F7921A] hover:bg-[#E07F10] text-white font-black rounded-xl transition-all shadow-lg shadow-orange-900/30 text-base"
              >
                <ShoppingBag size={18} />
                Explore Store
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Visual side */}
            <div className="hidden md:flex flex-col items-center gap-4 flex-shrink-0">
              <div className="w-40 h-40 bg-[#F7921A]/10 border-2 border-[#F7921A]/30 rounded-3xl flex items-center justify-center">
                <ShoppingBag size={64} className="text-[#F7921A]/60" />
              </div>
              <div className="px-4 py-2 bg-[#F7921A]/10 border border-[#F7921A]/30 rounded-full">
                <span className="text-[#F7921A] text-xs font-bold">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
