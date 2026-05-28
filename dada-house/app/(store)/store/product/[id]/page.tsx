"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Tag, CheckCircle, Phone } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/components/store/cart-provider";

type Product = { id: string; name: string; slug: string; price: number; comparePrice: number | null; category: string; inStock: boolean; stockCount: number | null; images: string[]; description: string | null; featured: boolean; };

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
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

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-100 rounded w-1/3" /><div className="h-64 bg-gray-100 rounded-xl" /></div>;
  if (!product) return <div className="text-center py-16 text-gray-400">Product not found</div>;

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/store" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" />Back to Store
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-2xl overflow-hidden aspect-square flex items-center justify-center">
            {product.images[activeImage] ? (
              <img src={product.images[activeImage]} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <ShoppingCart className="w-20 h-20 text-gray-300" />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImage(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === activeImage ? "border-[#1B3FA8]" : "border-transparent"}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

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

          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${product.inStock ? "bg-green-500" : "bg-red-400"}`} />
            <span className={product.inStock ? "text-green-700" : "text-red-600"}>
              {product.inStock ? `In Stock${product.stockCount ? ` (${product.stockCount} left)` : ""}` : "Out of Stock"}
            </span>
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
