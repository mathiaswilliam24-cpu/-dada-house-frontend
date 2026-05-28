"use client";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/components/store/cart-provider";

export default function CartPage() {
  const { items, total, updateQuantity, removeItem, loading } = useCart();

  const tax = total * 0.0825;
  const orderTotal = total + tax;

  if (loading) return <div className="text-center py-16 text-gray-400">Loading cart…</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/store" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="w-4 h-4" />Continue Shopping
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
        <p className="text-gray-500 text-sm mt-0.5">{items.length} item{items.length !== 1 ? "s" : ""}</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Your cart is empty</h2>
          <p className="text-gray-400 text-sm mb-6">Browse our store to find products recommended by our technicians</p>
          <Link href="/store" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold hover:bg-[#163291] transition-colors">
            <ShoppingBag className="w-4 h-4" />Shop Now
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {items.map(item => (
              <div key={item.productId} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingCart className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                  <p className="text-[#1B3FA8] font-bold">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                    <Plus className="w-3 h-3" />
                  </button>
                  <button onClick={() => removeItem(item.productId)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-red-400 ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-right shrink-0 w-16">
                  <p className="font-bold text-gray-900 text-sm">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Tax (8.25%)</span><span>{formatCurrency(tax)}</span></div>
                <div className="border-t border-gray-100 pt-2.5 flex justify-between font-bold text-gray-900"><span>Total</span><span>{formatCurrency(orderTotal)}</span></div>
              </div>
              <Link href="/store/checkout"
                className="mt-5 w-full py-3 rounded-xl bg-[#F7921A] text-white font-bold text-sm hover:bg-[#E07F10] transition-colors flex items-center justify-center gap-2 block text-center">
                Proceed to Checkout
              </Link>
              <p className="text-center text-xs text-gray-400 mt-3">Secure checkout powered by Stripe</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
