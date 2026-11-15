"use client";
import { useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type PhotoItem = { name: string; imageUrl?: string | null; description?: string | null; price?: number };

/** Square price book thumbnail; tapping it opens the full photo. */
export function ItemThumb({ item, size = "w-12 h-12" }: { item: PhotoItem; size?: string }) {
  const [open, setOpen] = useState(false);
  if (!item.imageUrl) {
    return (
      <div className={`${size} shrink-0 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-300`}>
        <ImageIcon className="w-4 h-4" />
      </div>
    );
  }
  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setOpen(true); } }}
        className="shrink-0 cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.imageUrl} alt={item.name} loading="lazy" className={`${size} rounded-lg object-cover border border-gray-200 bg-white`} />
      </span>
      {open && <PhotoLightbox item={item} onClose={() => setOpen(false)} />}
    </>
  );
}

export function PhotoLightbox({ item, onClose }: { item: PhotoItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => { e.stopPropagation(); onClose(); }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        <div className="relative bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl ?? ""} alt={item.name} className="w-full max-h-[60vh] object-contain" />
          <button onClick={onClose} className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow">
            <X className="w-4 h-4 text-gray-700" />
          </button>
        </div>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <p className="font-semibold text-gray-900">{item.name}</p>
            {item.price != null && <p className="font-bold text-[#1B3FA8] shrink-0">{formatCurrency(item.price)}</p>}
          </div>
          {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
        </div>
      </div>
    </div>
  );
}
