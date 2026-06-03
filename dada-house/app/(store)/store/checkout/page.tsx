"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Loader2, CheckCircle, Wrench } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { formatCurrency } from "@/lib/utils";
import { useCart } from "@/components/store/cart-provider";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type AddressForm = { name: string; email: string; phone: string; street: string; city: string; state: string; zip: string };

const EMPTY_FORM: AddressForm = { name: "", email: "", phone: "", street: "", city: "Houston", state: "TX", zip: "" };

function field(label: string, type = "text", value: string, onChange: (v: string) => void, required = true) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && " *"}</label>
      <input required={required} type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]" />
    </div>
  );
}

function CheckoutForm({ items, subtotal, tax, orderTotal, onSuccess }: {
  items: { productId: string; name: string; price: number; quantity: number }[];
  subtotal: number; tax: number; orderTotal: number;
  onSuccess: (orderId: string | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stripeReady, setStripeReady] = useState(false);

  const set = (k: keyof AddressForm) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError("");
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/store/checkout` },
        redirect: "if_required",
      });
      if (result.error) {
        setError(result.error.message ?? "Payment failed");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.productId, quantity: i.quantity, price: i.price, productName: i.name })),
          shippingAddress: form,
          paymentIntentId: result.paymentIntent?.id,
        }),
      });
      const data = await res.json();
      onSuccess(data.orderId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Contact & Installation Address</h3>
            <div className="bg-orange-50 border border-orange-100 rounded-lg px-4 py-3 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#F7921A] shrink-0" />
              <p className="text-sm text-orange-800">Our technician will contact you to schedule the installation at this address.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">{field("Full Name", "text", form.name, set("name"))}</div>
              <div>{field("Email", "email", form.email, set("email"))}</div>
              <div>{field("Phone", "tel", form.phone, set("phone"))}</div>
              <div className="col-span-2">{field("Street Address", "text", form.street, set("street"))}</div>
              <div>{field("City", "text", form.city, set("city"))}</div>
              <div>{field("ZIP Code", "text", form.zip, set("zip"))}</div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-500" /> Secure Payment
            </h3>
            <PaymentElement onReady={() => setStripeReady(true)} />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
        </div>

        {/* Summary */}
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
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>Tax (8.25%)</span><span>{formatCurrency(tax)}</span></div>
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
                <span>Total</span><span>{formatCurrency(orderTotal)}</span>
              </div>
            </div>
            <div className="mt-4 bg-orange-50 rounded-lg px-3 py-2 flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-[#F7921A] shrink-0" />
              <span className="text-xs text-orange-800 font-medium">Professional installation included</span>
            </div>
            <button type="submit" disabled={loading || !stripeReady || !stripe}
              className="mt-5 w-full py-3 rounded-xl bg-[#F7921A] text-white font-bold text-sm hover:bg-[#E07F10] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
                : <><Lock className="w-4 h-4" />Pay {formatCurrency(orderTotal)}</>
              }
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">Secured by Stripe · SSL encrypted</p>
          </div>
        </div>
      </div>
    </form>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clearCart, loading: cartLoading } = useCart();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [intentError, setIntentError] = useState("");

  const tax = total * 0.0825;
  const orderTotal = total + tax;

  const createIntent = useCallback(async () => {
    if (orderTotal <= 0) return;
    try {
      const res = await fetch("/api/store/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: orderTotal }),
      });
      const data = await res.json();
      if (data.clientSecret) setClientSecret(data.clientSecret);
      else setIntentError(data.error ?? "Could not initialize payment");
    } catch {
      setIntentError("Could not connect to payment service");
    }
  }, [orderTotal]);

  useEffect(() => {
    if (!cartLoading && items.length === 0 && !success) router.push("/store/cart");
  }, [items, cartLoading, success, router]);

  useEffect(() => {
    if (!cartLoading && items.length > 0 && !clientSecret && !success) createIntent();
  }, [cartLoading, items.length, clientSecret, success, createIntent]);

  function handleSuccess(oid: string | null) {
    clearCart();
    setOrderId(oid);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 space-y-5">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Confirmed!</h1>
          <p className="text-gray-500 mt-1 text-sm">A receipt has been sent to your email.</p>
        </div>

        {/* Schedule installation CTA */}
        <div className="bg-[#0A1628] rounded-2xl p-6 text-left space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F97316] rounded-full flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold">Schedule Your Installation</h2>
              <p className="text-blue-300 text-sm">Choose your preferred date & time</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm">Your products include professional installation by a certified DADA HOUSE technician. Click below to schedule your appointment.</p>
          <Link
            href={orderId ? `/store/checkout/schedule?orderId=${orderId}` : "/store/checkout/schedule"}
            className="w-full py-3.5 bg-[#F97316] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#ea6c0a] transition-colors"
          >
            <Wrench className="w-4 h-4" />
            Schedule Installation Now
          </Link>
        </div>

        <div className="flex gap-3 justify-center">
          <Link href="/store" className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
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

      {intentError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{intentError}</div>
      )}

      {!clientSecret ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" />
          <span className="ml-2 text-gray-500 text-sm">Initializing secure payment…</span>
        </div>
      ) : (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#1B3FA8" } } }}>
          <CheckoutForm
            items={items}
            subtotal={total}
            tax={tax}
            orderTotal={orderTotal}
            onSuccess={handleSuccess}
          />
        </Elements>
      )}
    </div>
  );
}
