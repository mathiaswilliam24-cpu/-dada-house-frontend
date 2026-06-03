import PwaInstallBadges from "@/components/layout/pwa-install-badges";
import { Smartphone, Wifi, Bell, Shield } from "lucide-react";

const features = [
  { icon: Smartphone, label: "Interface mobile optimisée" },
  { icon: Wifi, label: "Fonctionne hors-ligne" },
  { icon: Bell, label: "Notifications en temps réel" },
  { icon: Shield, label: "Sécurisé & rapide" },
];

export default function AppDownloadSection() {
  return (
    <section className="bg-[#081040] py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left — text */}
          <div className="flex-1 text-center lg:text-left">
            <p className="text-[#F7921A] text-xs font-bold uppercase tracking-widest mb-3">
              Mobile App
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
              Télécharge l'App
              <br />
              <span className="text-[#F7921A]">DADA HOUSE</span>
            </h2>
            <p className="text-slate-400 text-base mb-8 max-w-md mx-auto lg:mx-0">
              Accède à ton compte, suis tes demandes de service et contacte-nous directement depuis ton téléphone.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8 max-w-sm mx-auto lg:mx-0">
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1B3FA8]/60 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#F7921A]" />
                  </div>
                  <span className="text-slate-300 text-xs font-medium">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-center lg:justify-start">
              <PwaInstallBadges />
            </div>
          </div>

          {/* Right — phone mockup */}
          <div className="shrink-0 relative">
            <div className="w-56 h-[460px] bg-[#1B3FA8] rounded-[2.5rem] border-4 border-[#2A4FBB] shadow-2xl shadow-blue-900/50 relative overflow-hidden">
              {/* Phone screen */}
              <div className="absolute inset-2 rounded-[2rem] bg-gray-900 overflow-hidden">
                {/* Status bar */}
                <div className="bg-[#1B3FA8] px-4 py-2 flex items-center justify-between">
                  <span className="text-white text-[10px] font-bold">DADA HOUSE</span>
                  <span className="text-white/70 text-[10px]">9:41</span>
                </div>
                {/* App content preview */}
                <div className="p-3 space-y-2.5">
                  <div className="bg-[#1B3FA8]/20 rounded-xl p-3">
                    <div className="w-16 h-2 bg-white/20 rounded mb-1.5" />
                    <div className="w-24 h-3 bg-white/40 rounded" />
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-3 flex gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#F7921A]/20 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="w-full h-2 bg-white/20 rounded" />
                        <div className="w-2/3 h-1.5 bg-white/10 rounded" />
                      </div>
                    </div>
                  ))}
                  <div className="bg-[#F7921A] rounded-xl p-3 text-center">
                    <div className="w-20 h-2.5 bg-white/70 rounded mx-auto" />
                  </div>
                </div>
              </div>
              {/* Home bar */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-white/30 rounded-full" />
            </div>
            {/* Glow */}
            <div className="absolute inset-0 rounded-[2.5rem] bg-blue-500/10 blur-2xl -z-10 scale-110" />
          </div>
        </div>
      </div>
    </section>
  );
}
