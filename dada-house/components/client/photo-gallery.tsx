"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, Image as ImageIcon } from "lucide-react";

export function PhotoGallery({ photos }: { photos: string[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  function prev(e: React.MouseEvent) {
    e.stopPropagation();
    setLightbox(i => (i! > 0 ? i! - 1 : photos.length - 1));
  }
  function next(e: React.MouseEvent) {
    e.stopPropagation();
    setLightbox(i => (i! < photos.length - 1 ? i! + 1 : 0));
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <ImageIcon className="w-4 h-4 text-[#F7921A]" />
          <h3 className="font-semibold text-gray-900">
            Photos
            <span className="ml-1.5 text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{photos.length}</span>
          </h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((url, i) => (
            <button
              key={i}
              onClick={() => setLightbox(i)}
              className="relative aspect-square overflow-hidden rounded-xl group focus:outline-none focus:ring-2 focus:ring-[#F7921A]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
                <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* Close */}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-sm tabular-nums">
            {lightbox + 1} / {photos.length}
          </div>

          {/* Prev */}
          {photos.length > 1 && (
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[lightbox]}
            alt={`Photo ${lightbox + 1}`}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
          />

          {/* Next */}
          {photos.length > 1 && (
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}

          {/* Dot indicators */}
          {photos.length > 1 && photos.length <= 12 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setLightbox(i); }}
                  className={`w-2 h-2 rounded-full transition-colors ${i === lightbox ? "bg-white" : "bg-white/30 hover:bg-white/60"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
