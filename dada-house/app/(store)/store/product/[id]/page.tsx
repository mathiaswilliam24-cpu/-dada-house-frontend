"use client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Tag, CheckCircle, Phone, Wrench, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/components/store/cart-provider";

type Product = {
  id: string; name: string; slug: string; price: number; comparePrice: number | null;
  category: string; inStock: boolean; stockCount: number | null; images: string[];
  videoUrl: string | null; description: string | null; featured: boolean;
};

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  // Direct video file
  if (url.match(/\.(mp4|webm|ogg)$/i)) return url;
  return null;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    fetch(`/api/store/products/${id}`)
      .then(r => r.json())
      .then(d => { setProduct(d.product ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  function handleAdd() {
    if (!product) return;
    addItem({ productId: product.id, name: product.name, price: product.price, image: product.images[0] });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const media = product ? [
    ...product.images.map(url => ({ type: "image" as const, url })),
    ...(product.videoUrl ? [{ type: "video" as const, url: product.videoUrl }] : []),
  ] : [];

  const total = media.length;

  function prev() { setActiveIndex(i => (i - 1 + total) % total); setShowVideo(false); }
  function next() { setActiveIndex(i => (i + 1) % total); setShowVideo(false); }

  function onTouchStart(e: React.TouchEvent) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 50) prev();
    else if (dx < -50) next();
    touchStartX.current = null;
  }

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-100 rounded w-1/3" />
      <div className="h-64 bg-gray-100 rounded-xl" />
    </div>
  );
  if (!product) return <div className="text-center py-16 text-gray-400">Product not found</div>;

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  const current = media[activeIndex];
  const embedUrl = current?.type === "video" ? getEmbedUrl(current.url) : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/store" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" />Back to Store
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* ── Media gallery ── */}
        <div className="space-y-3">
          <div
            className="relative bg-gray-50 rounded-2xl overflow-hidden aspect-square flex items-center justify-center select-none"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {current?.type === "image" && (
              <img src={current.url} alt={product.name} className="w-full h-full object-contain" draggable={false} />
            )}

            {current?.type === "video" && !showVideo && (
              <>
                {product.images[0] ? (
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain" draggable={false} />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <Play className="w-16 h-16 text-gray-300" />
                  </div>
                )}
                <button
                  onClick={() => setShowVideo(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                >
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                    <Play className="w-7 h-7 text-[#1B3FA8] fill-[#1B3FA8] ml-1" />
                  </div>
                </button>
              </>
            )}

            {current?.type === "video" && showVideo && (
              embedUrl && !embedUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                />
              ) : (
                <video src={current.url} controls autoPlay className="w-full h-full object-contain" />
              )
            )}

            {!current && (
              <ShoppingCart className="w-20 h-20 text-gray-300" />
            )}

            {/* Arrows */}
            {total > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors z-10"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors z-10"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
                {/* Dot indicators */}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {media.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setActiveIndex(i); setShowVideo(false); }}
                      className={`w-2 h-2 rounded-full transition-all ${i === activeIndex ? "bg-[#1B3FA8] w-4" : "bg-white/70"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {total > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {media.map((m, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveIndex(i); setShowVideo(false); }}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${i === activeIndex ? "border-[#1B3FA8]" : "border-transparent"}`}
                >
                  {m.type === "image" ? (
                    <img src={m.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Dedicated video section */}
          {product.videoUrl && (() => {
            const embed = getEmbedUrl(product.videoUrl);
            if (!embed) return null;
            const isDirect = embed.match(/\.(mp4|webm|ogg)$/i);
            return (
              <div className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-900">
                <div className="px-4 py-2.5 flex items-center gap-2 border-b border-white/10">
                  <Play className="w-4 h-4 text-white fill-white" />
                  <span className="text-sm font-semibold text-white">Product Video</span>
                </div>
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  {isDirect ? (
                    <video
                      src={embed}
                      controls
                      className="absolute inset-0 w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <iframe
                      src={embed.replace("?autoplay=1", "").replace("?autoplay=1", "")}
                      className="absolute inset-0 w-full h-full"
                      allow="fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Product info ── */}
        <div className="space-y-5">
          <div>
            <span className="text-xs font-semibold text-[#1B3FA8] uppercase tracking-wider">{product.category}</span>
            <h1 className="text-2xl font-black text-gray-900 mt-1">{product.name}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-[#1B3FA8]">{formatCurrency(product.price)}</span>
            {product.comparePrice && product.comparePrice > product.price && (
              <>
                <span className="text-lg text-gray-400 line-through">{formatCurrency(product.comparePrice)}</span>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 text-sm font-bold rounded-full">{discount}% off</span>
              </>
            )}
          </div>

          {product.comparePrice && product.comparePrice > product.price && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <Tag className="w-4 h-4" />
              You save {formatCurrency(product.comparePrice - product.price)}
            </div>
          )}

          {product.description && (
            <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${product.inStock ? "bg-green-500" : "bg-red-400"}`} />
              <span className={product.inStock ? "text-green-700" : "text-red-600"}>
                {product.inStock ? `In Stock${product.stockCount ? ` (${product.stockCount} left)` : ""}` : "Out of Stock"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-full px-3 py-1">
              <Wrench className="w-3.5 h-3.5 text-[#F7921A]" />
              <span className="text-xs font-bold text-[#F7921A]">Includes Professional Installation</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleAdd}
              disabled={!product.inStock}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${added ? "bg-green-600 text-white" : "bg-[#1B3FA8] text-white hover:bg-[#163291]"} disabled:bg-gray-100 disabled:text-gray-400`}
            >
              {added ? <><CheckCircle className="w-5 h-5" />Added to Cart!</> : <><ShoppingCart className="w-5 h-5" />Add to Cart</>}
            </button>
            <Link href="/store/cart"
              className="w-full py-3.5 rounded-xl font-bold text-sm border-2 border-[#1B3FA8] text-[#1B3FA8] hover:bg-[#1B3FA8] hover:text-white transition-all flex items-center justify-center">
              View Cart
            </Link>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 mb-2">Need help choosing the right product?</p>
            <a href="tel:+19106858042" className="inline-flex items-center gap-2 text-sm text-[#1B3FA8] font-semibold hover:underline">
              <Phone className="w-4 h-4" />Call us: +1 (910) 685-8042
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
