"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/components/store/cart-provider";

type Product = { id: string; name: string; price: number; comparePrice: number | null; category: string; inStock: boolean; images: string[]; };

export default function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  const label = decodeURIComponent(category).replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  useEffect(() => {
    fetch(`/api/store/products?category=${encodeURIComponent(label)}`)
      .then(r => r.json())
      .then(d => { setProducts(d.products ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [label]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/store" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="w-4 h-4" />Back to Store
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{label}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{products.length} products</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
              <div className="h-40 bg-gray-100" />
              <div className="p-4 space-y-2"><div className="h-4 bg-gray-100 rounded w-3/4" /></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
              <Link href={`/store/product/${p.id}`} className="block h-40 bg-gray-50 flex items-center justify-center">
                {p.images[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <ShoppingCart className="w-10 h-10 text-gray-300" />
                )}
              </Link>
              <div className="p-4 flex-1 flex flex-col">
                <Link href={`/store/product/${p.id}`}>
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 hover:text-[#1B3FA8]">{p.name}</h3>
                </Link>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[#1B3FA8] font-bold">{formatCurrency(p.price)}</span>
                  {p.comparePrice && p.comparePrice > p.price && (
                    <span className="text-xs text-gray-400 line-through">{formatCurrency(p.comparePrice)}</span>
                  )}
                </div>
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
            <div className="col-span-full py-16 text-center text-gray-400">No products found</div>
          )}
        </div>
      )}
    </div>
  );
}
