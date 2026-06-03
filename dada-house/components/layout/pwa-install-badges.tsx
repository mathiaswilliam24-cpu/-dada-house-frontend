"use client";
import { useState, useEffect } from "react";
import { X, Smartphone, Share, MoreVertical, Plus } from "lucide-react";

type Platform = "ios" | "android" | null;

function AppleStoreBadge() {
  return (
    <svg viewBox="0 0 135 40" className="h-10 w-auto" aria-hidden>
      <rect width="135" height="40" rx="6" fill="black" />
      <text x="38" y="13" fontFamily="Arial" fontSize="7" fill="#999" letterSpacing="0.5">Download on the</text>
      <text x="38" y="27" fontFamily="Arial" fontSize="14" fontWeight="bold" fill="white">App Store</text>
      {/* Apple logo */}
      <path d="M18 8c-1.2 1.4-1.1 2.8-.9 3.5.7.1 1.6-.3 2.2-1.1.6-.7.9-1.7.8-2.7-.9.1-1.6.5-2.1 1.3zm-.9 3.5c-1.2 0-2.1.7-2.7.7s-1.4-.6-2.3-.6c-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.3.8 1.2 1.8 2.6 3.1 2.5 1.2 0 1.7-.8 3.2-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-1-2.5-3.8 0-2.4 2-3.5 2-3.5-1.1-1.6-2.8-1.9-3.4-2z" fill="white" transform="translate(5, 5)" />
    </svg>
  );
}

function GooglePlayBadge() {
  return (
    <svg viewBox="0 0 135 40" className="h-10 w-auto" aria-hidden>
      <rect width="135" height="40" rx="6" fill="black" />
      <text x="38" y="13" fontFamily="Arial" fontSize="7" fill="#999" letterSpacing="0.5">GET IT ON</text>
      <text x="38" y="27" fontFamily="Arial" fontSize="14" fontWeight="bold" fill="white">Google Play</text>
      {/* Play triangle */}
      <polygon points="12,10 12,30 24,20" fill="url(#gp)" transform="translate(3,0)" />
      <defs>
        <linearGradient id="gp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00C6FF" />
          <stop offset="50%" stopColor="#34A853" />
          <stop offset="100%" stopColor="#FBBC05" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function PwaInstallBadges() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void } | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detect if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Capture Android install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => void });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleAndroid = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      setDeferredPrompt(null);
    } else {
      setPlatform("android");
    }
  };

  const handleIos = () => setPlatform("ios");

  if (installed) return null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <button onClick={handleIos} className="opacity-90 hover:opacity-100 transition-opacity">
          <AppleStoreBadge />
        </button>
        <button onClick={handleAndroid} className="opacity-90 hover:opacity-100 transition-opacity">
          <GooglePlayBadge />
        </button>
      </div>

      {/* Modal instructions */}
      {platform && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#1B3FA8] px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-white" />
                <p className="text-white font-bold">Install DADA HOUSE App</p>
              </div>
              <button onClick={() => setPlatform(null)} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Instructions */}
            <div className="p-5 space-y-4">
              {platform === "ios" && (
                <>
                  <p className="text-sm text-gray-600">Installe l'app DADA HOUSE sur ton iPhone / iPad en 3 étapes :</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#1B3FA8] text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Ouvre dans Safari</p>
                        <p className="text-xs text-gray-500">Cette fonctionnalité nécessite Safari (pas Chrome)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#1B3FA8] text-white text-xs font-bold flex items-center justify-center shrink-0">2</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                          Tape le bouton Partager <Share className="w-4 h-4 text-blue-500" />
                        </p>
                        <p className="text-xs text-gray-500">En bas de l'écran (iOS 14 et +)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#1B3FA8] text-white text-xs font-bold flex items-center justify-center shrink-0">3</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                          Sélectionne <Plus className="w-3.5 h-3.5" /> Sur l'écran d'accueil
                        </p>
                        <p className="text-xs text-gray-500">L'app apparaîtra comme une vraie application</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-blue-700 font-medium">URL à ouvrir dans Safari :</p>
                    <p className="text-xs text-blue-600 font-mono mt-0.5">dada-house.com</p>
                  </div>
                </>
              )}

              {platform === "android" && (
                <>
                  <p className="text-sm text-gray-600">Installe l'app DADA HOUSE sur ton appareil Android :</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#1B3FA8] text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Ouvre dans Chrome</p>
                        <p className="text-xs text-gray-500">Va sur dada-house.com avec Chrome</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#1B3FA8] text-white text-xs font-bold flex items-center justify-center shrink-0">2</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                          Tape les 3 points <MoreVertical className="w-4 h-4 text-gray-600" />
                        </p>
                        <p className="text-xs text-gray-500">En haut à droite de Chrome</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#1B3FA8] text-white text-xs font-bold flex items-center justify-center shrink-0">3</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Ajouter à l'écran d'accueil</p>
                        <p className="text-xs text-gray-500">L'app s'installe comme une vraie application</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-xs text-green-700 font-medium">URL à ouvrir dans Chrome :</p>
                    <p className="text-xs text-green-600 font-mono mt-0.5">dada-house.com</p>
                  </div>
                </>
              )}

              <button
                onClick={() => setPlatform(null)}
                className="w-full py-2.5 bg-[#1B3FA8] text-white text-sm font-bold rounded-xl hover:bg-[#1A3490] transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
