"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Star, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/components/store/cart-provider";

type Product = { id: string; name: string; slug: string; price: number; comparePrice: number | null; category: string; inStock: boolean; images: string[]; description: string | null; featured: boolean; };

const CATEGORIES = ["All", "HVAC", "Plumbing", "Tools", "Service Plans", "Parts", "Accessories"];

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const { addItem } = useCart();

  useEffect(() => {
    const url = category === "All" ? "/api/store/products" : `/api/store/products?category=${encodeURIComponent(category)}`;
    fetch(url).then(r => r.json()).then(d => { setProducts(d.products ?? []); setLoading(false); }).catch(() => setLoading(false));
  }, [category]);

  const featured = products.filter(p => p.featured);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900">DADA HOUSE Store</h1>
        <p className="text-gray-500 mt-1">Products recommended by our certified technicians</p>
      </div>

      {featured.length > 0 && category === "All" && (
        <div className="bg-gradient-to-r from-[#1B3FA8] to-[#0D1D5E] rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-[#F7921A] fill-[#F7921A]" />
            <span className="text-sm font-semibold text-[#F7921A]">Featured Products</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.slice(0, 3).map(p => (
              <Link key={p.id} href={`/store/product/${p.id}`} className="bg-white/10 rounded-xl p-4 hover:bg-white/20 transition-colors">
                <p className="font-semibold">{p.name}</p>
                <p className="text-[#F7921A] font-bold mt-1">{formatCurrency(p.price)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${category === cat ? "bg-[#1B3FA8] text-white border-[#1B3FA8]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-100" />
              <div className="p-4 space-y-2"><div className="h-4 bg-gray-100 rounded w-3/4" /><div className="h-4 bg-gray-100 rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
              <Link href={`/store/product/${p.id}`} className="block h-40 bg-gray-50 flex items-center justify-center overflow-hidden">
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </Link>
              <div className="p-4 flex-1 flex flex-col">
                <span className="text-xs text-gray-400 mb-1">{p.category}</span>
                <Link href={`/store/product/${p.id}`}>
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 hover:text-[#1B3FA8] transition-colors">{p.name}</h3>
                </Link>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[#1B3FA8] font-bold">{formatCurrency(p.price)}</span>
                  {p.comparePrice && p.comparePrice > p.price && (
                    <span className="text-xs text-gray-400 line-through">{formatCurrency(p.comparePrice)}</span>
                  )}
                </div>
                {p.comparePrice && p.comparePrice > p.price && (
                  <div className="flex items-center gap-1 mt-1">
                    <Tag className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">Save {formatCurrency(p.comparePrice - p.price)}</span>
                  </div>
                )}
                <button
                  onClick={() => addItem({ productId: p.id, name: p.name, price: p.price, image: p.images[0] })}
                  disabled={!p.inStock}
                  className="mt-auto pt-3 w-full py-2 rounded-lg text-sm font-semibold bg-[#1B3FA8] text-white hover:bg-[#163291] disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
                >
                  {p.inStock ? "Add to Cart" : "Out of Stock"}
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No products in this category yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
