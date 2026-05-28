"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, CreditCard, Loader2, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/components/store/cart-provider";

type AddressForm = { name: string; email: string; street: string; city: string; state: string; zip: string; };

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const [form, setForm] = useState<AddressForm>({ name: "", email: "", street: "", city: "", state: "TX", zip: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const tax = total * 0.0825;
  const orderTotal = total + tax;

  useEffect(() => {
    if (items.length === 0 && !success) router.push("/store/cart");
  }, [items, success, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price, productName: i.name })),
          shippingAddress: form,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      clearCart();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Order Placed!</h1>
        <p className="text-gray-500">Thank you for your order. You&apos;ll receive a confirmation email shortly.</p>
        <div className="flex gap-3 justify-center pt-4">
          <Link href="/store" className="px-5 py-2.5 bg-[#1B3FA8] text-white rounded-xl text-sm font-semibold hover:bg-[#163291] transition-colors">
            Continue Shopping
          </Link>
          <Link href="/portal/orders" className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
            View Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/store/cart" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="w-4 h-4" />Back to Cart
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Shipping Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                  <input required value={form.street} onChange={e => setForm({...form, street: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input required value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP *</label>
                  <input required value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />Payment
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 text-center">
                <Lock className="w-4 h-4 mx-auto mb-2 text-gray-400" />
                Stripe payment integration — card collection handled securely
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2 mb-4">
                {items.map(item => (
                  <div key={item.productId} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 text-gray-700 truncate">{item.name}</span>
                    <span className="text-gray-500">×{item.quantity}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
                <div className="flex justify-between text-gray-600"><span>Tax (8.25%)</span><span>{formatCurrency(tax)}</span></div>
                <div className="flex justify-between font-bold text-gray-900"><span>Total</span><span>{formatCurrency(orderTotal)}</span></div>
              </div>
              <button type="submit" disabled={loading} className="mt-5 w-full py-3 rounded-xl bg-[#F7921A] text-white font-bold text-sm hover:bg-[#E07F10] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Placing Order…</> : <><Lock className="w-4 h-4" />Place Order · {formatCurrency(orderTotal)}</>}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
