"use client";

import { useState } from "react";
import { MapPin, Calendar, CheckCircle, Droplets, Wind, Flame, Hammer, ImageOff, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Category = "ALL" | "PLUMBING" | "AIR_CONDITIONING" | "HEATING" | "REMODELING";

interface Project {
  id: string;
  title: string;
  category: string;
  location: string;
  date: string;
  description: string;
  tags: string[];
  images: string[];
  published: boolean;
}

const CATEGORIES: { key: Category; label: string; icon: React.ElementType; color: string; activeBg: string }[] = [
  { key: "ALL",               label: "All Projects",     icon: CheckCircle, color: "text-slate-400",   activeBg: "bg-[#1B3FA8] text-white" },
  { key: "PLUMBING",          label: "Plumbing",          icon: Droplets,    color: "text-blue-400",    activeBg: "bg-blue-600 text-white" },
  { key: "AIR_CONDITIONING",  label: "Air Conditioning",  icon: Wind,        color: "text-cyan-400",    activeBg: "bg-cyan-600 text-white" },
  { key: "HEATING",           label: "Heating",           icon: Flame,       color: "text-orange-400",  activeBg: "bg-orange-600 text-white" },
  { key: "REMODELING",        label: "Remodeling",        icon: Hammer,      color: "text-emerald-400", activeBg: "bg-emerald-600 text-white" },
];

const CARD_STYLES: Record<string, { gradient: string; icon: React.ElementType; iconColor: string; badge: string; badgeBg: string }> = {
  PLUMBING:         { gradient: "from-blue-900 to-[#0D1D5E]",   icon: Droplets, iconColor: "text-blue-300",    badge: "Plumbing",        badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  AIR_CONDITIONING: { gradient: "from-cyan-900 to-slate-900",    icon: Wind,     iconColor: "text-cyan-300",    badge: "Air Conditioning", badgeBg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  HEATING:          { gradient: "from-orange-900 to-red-950",    icon: Flame,    iconColor: "text-orange-300",  badge: "Heating",         badgeBg: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  REMODELING:       { gradient: "from-emerald-900 to-slate-900", icon: Hammer,   iconColor: "text-emerald-300", badge: "Remodeling",      badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
};

/* ── Lightbox ── */
function Lightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white hover:text-slate-300 transition-colors">
        <X size={28} />
      </button>
      <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
        <img src={images[idx]} alt={`photo ${idx + 1}`} className="w-full max-h-[80vh] object-contain rounded-xl" />
        {images.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors">
              <ChevronLeft size={22} />
            </button>
            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors">
              <ChevronRight size={22} />
            </button>
            <div className="flex justify-center gap-1.5 mt-3">
              {images.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)} className={cn("w-2 h-2 rounded-full transition-colors", i === idx ? "bg-white" : "bg-white/30")} />
              ))}
            </div>
          </>
        )}
        <p className="text-center text-slate-400 text-xs mt-2">{idx + 1} / {images.length}</p>
      </div>
    </div>
  );
}

/* ── Card photo strip ── */
function CardPhoto({ project, style }: { project: Project; style: typeof CARD_STYLES[string] }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const Icon = style.icon;

  const hasPhotos = project.images.length > 0;

  return (
    <>
      <div className={cn("relative h-48 bg-gradient-to-br flex items-center justify-center overflow-hidden cursor-pointer", style.gradient)}
        onClick={() => hasPhotos && setLightbox(photoIdx)}
      >
        {hasPhotos ? (
          <img src={project.images[photoIdx]} alt={project.title} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-3 opacity-30">
            <Icon size={56} className={style.iconColor} />
          </div>
        )}

        {/* Category badge */}
        <div className={cn("absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold backdrop-blur-sm", style.badgeBg)}>
          <Icon size={11} />
          {style.badge}
        </div>

        {/* Photo count */}
        {project.images.length > 1 && (
          <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/60 text-white text-xs font-bold rounded-full backdrop-blur-sm">
            {project.images.length} photos
          </div>
        )}

        {/* Thumbnail strip */}
        {project.images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 flex gap-1 p-2 bg-gradient-to-t from-black/60 to-transparent">
            {project.images.slice(0, 5).map((img, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setPhotoIdx(i); }}
                className={cn("w-8 h-8 rounded overflow-hidden border-2 transition-all flex-shrink-0", i === photoIdx ? "border-white" : "border-transparent opacity-70 hover:opacity-100")}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            {project.images.length > 5 && (
              <div className="w-8 h-8 rounded bg-black/50 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                +{project.images.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {lightbox !== null && (
        <Lightbox images={project.images} startIndex={lightbox} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

/* ── Main component ── */
interface Props { projects: Project[] }

export default function GalleryClient({ projects }: Props) {
  const [active, setActive] = useState<Category>("ALL");

  const filtered = active === "ALL" ? projects : projects.filter((p) => p.category === active);

  return (
    <>
      {/* Filter tabs */}
      <div className="flex flex-wrap justify-center gap-3 mb-12">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = active === cat.key;
          const count = cat.key === "ALL" ? projects.length : projects.filter((p) => p.category === cat.key).length;
          return (
            <button
              key={cat.key}
              onClick={() => setActive(cat.key)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold border transition-all",
                isActive ? cat.activeBg + " border-transparent shadow-lg" : "bg-white border-slate-200 text-slate-600 hover:border-[#1B3FA8] hover:text-[#1B3FA8]"
              )}
            >
              <Icon size={15} className={isActive ? "text-white" : cat.color} />
              {cat.label}
              <span className={cn("px-1.5 py-0.5 rounded-full text-xs font-black", isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <ImageOff size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-semibold">No projects in this category yet.</p>
          <p className="text-sm mt-1">Check back soon — we update our gallery regularly.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((project) => {
            const style = CARD_STYLES[project.category] ?? CARD_STYLES.PLUMBING;
            return (
              <div key={project.id} className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl border border-slate-100 hover:border-[#1B3FA8]/20 transition-all duration-300 hover:-translate-y-1">
                <CardPhoto project={project} style={style} />
                <div className="p-5">
                  <h3 className="font-bold text-[#1B3FA8] text-base leading-snug mb-2 group-hover:text-[#F7921A] transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-3">{project.description}</p>
                  {project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {project.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full font-medium">{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1"><MapPin size={11} />{project.location}</span>
                    <span className="flex items-center gap-1"><Calendar size={11} />{project.date}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
