"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2, CheckCircle2, CreditCard, DollarSign, Smartphone } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { formatCurrency } from "@/lib/utils";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "pk_test_placeholder");

type Invoice = {
  id: string;
  estimateNumber: string;
  clientName: string;
  total: number;
  lineItems: Array<{ desc: string; rate: number; qty: number; amount: number }>;
  additionalDetails: string | null;
  templateColor: string;
  paidAt: string | null;
  paymentMethod: string | null;
  sentByName: string | null;
};

type Method = "zelle" | "card" | "cash" | null;

function PayPage() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const initMethod = (searchParams.get("method") as Method) ?? null;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<Method>(initMethod);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    fetch(`/api/pay/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError("Invoice not found or link is invalid."); }
        else { setInvoice(d.invoice); if (d.invoice.paidAt) setPaid(true); }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load invoice."); setLoading(false); });
  }, [token]);

  async function selectCard() {
    setMethod("card");
    if (clientSecret) return;
    setCreatingIntent(true);
    try {
      const res = await fetch(`/api/pay/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-intent" }),
      });
      const d = await res.json();
      if (d.clientSecret) setClientSecret(d.clientSecret);
    } finally { setCreatingIntent(false); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B3FA8]" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 text-lg">{error || "Invoice not found."}</p>
          <p className="text-gray-400 text-sm mt-2">Please contact DADA HOUSE at (910) 685-8042</p>
        </div>
      </div>
    );
  }

  if (paid || invoice.paidAt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-gray-900 mb-2">All Paid!</h1>
          <p className="text-gray-500 mb-1">Invoice #{invoice.estimateNumber}</p>
          <p className="text-3xl font-black text-green-600 mb-4">{formatCurrency(invoice.total)}</p>
          <p className="text-sm text-gray-400">Thank you, {invoice.clientName}! 🎉</p>
          <p className="text-xs text-gray-400 mt-4">DADA HOUSE · (910) 685-8042</p>
        </div>
      </div>
    );
  }

  const color = invoice.templateColor || "#1B3FA8";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div style={{ backgroundColor: color }} className="px-4 py-6 text-white text-center">
        <p className="font-black text-xl">DADA HOUSE</p>
        <p className="text-sm opacity-70">Invoice #{invoice.estimateNumber}</p>
        <p className="text-4xl font-black mt-3">{formatCurrency(invoice.total)}</p>
        <p className="text-sm opacity-80 mt-1">Due from {invoice.clientName}</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Line items summary */}
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {invoice.lineItems.filter((i) => i.desc).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.desc}</p>
                <p className="text-xs text-gray-400">Qty: {item.qty} × {formatCurrency(item.rate)}</p>
              </div>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</p>
            </div>
          ))}
          <div className="flex items-center justify-between px-4 py-3">
            <p className="font-bold text-gray-900">Total</p>
            <p className="text-lg font-black" style={{ color }}>{formatCurrency(invoice.total)}</p>
          </div>
        </div>

        {/* Payment method selection */}
        {!method && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-gray-600 text-center">Choose how you'd like to pay</p>
            <button
              onClick={() => setMethod("zelle")}
              className="w-full flex items-center gap-4 p-4 bg-purple-600 text-white rounded-2xl font-bold text-left hover:bg-purple-700 transition-colors"
            >
              <Smartphone className="w-7 h-7 shrink-0" />
              <div>
                <p className="font-bold">Pay with Zelle</p>
                <p className="text-xs font-normal opacity-80">Send directly from your bank app</p>
              </div>
            </button>
            <button
              onClick={selectCard}
              className="w-full flex items-center gap-4 p-4 bg-green-600 text-white rounded-2xl font-bold text-left hover:bg-green-700 transition-colors"
            >
              <CreditCard className="w-7 h-7 shrink-0" />
              <div>
                <p className="font-bold">Pay with Credit/Debit Card</p>
                <p className="text-xs font-normal opacity-80">Secure payment via Stripe</p>
              </div>
            </button>
            <button
              onClick={() => setMethod("cash")}
              className="w-full flex items-center gap-4 p-4 bg-gray-600 text-white rounded-2xl font-bold text-left hover:bg-gray-700 transition-colors"
            >
              <DollarSign className="w-7 h-7 shrink-0" />
              <div>
                <p className="font-bold">Pay with Cash</p>
                <p className="text-xs font-normal opacity-80">Pay your technician directly</p>
              </div>
            </button>
          </div>
        )}

        {/* Zelle flow */}
        {method === "zelle" && (
          <div className="bg-white rounded-2xl border border-purple-200 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setMethod(null)} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
            </div>
            <h2 className="font-black text-gray-900 text-lg">Pay via Zelle</h2>
            <div className="bg-purple-50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Send payment to</p>
              <p className="text-base font-bold text-gray-900">payment@mydadahouse.com</p>
              <p className="text-sm text-gray-600">Company name: <span className="font-semibold">DADA HOUSE LLC</span></p>
              <p className="text-xl font-black text-purple-700 mt-2">{formatCurrency(invoice.total)}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-sm text-amber-800 font-medium">
                After sending payment, please show the Zelle confirmation screen to your technician for verification.
              </p>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Your technician will mark the invoice as paid once confirmed.
            </p>
          </div>
        )}

        {/* Card flow */}
        {method === "card" && (
          <div className="bg-white rounded-2xl border border-green-200 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setMethod(null)} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
            </div>
            <h2 className="font-black text-gray-900 text-lg">Pay by Card</h2>
            {creatingIntent ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                <StripeForm
                  token={token}
                  total={invoice.total}
                  onSuccess={() => { setPaid(true); }}
                />
              </Elements>
            ) : (
              <p className="text-sm text-red-500">Failed to initialize payment. Please try again.</p>
            )}
          </div>
        )}

        {/* Cash flow */}
        {method === "cash" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setMethod(null)} className="text-xs text-gray-400 hover:text-gray-600">← Back</button>
            </div>
            <h2 className="font-black text-gray-900 text-lg">Pay with Cash</h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-sm text-gray-700">
                Pay <span className="font-bold text-gray-900">{formatCurrency(invoice.total)}</span> in cash directly to your DADA HOUSE technician at the time of service.
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-sm text-blue-800 font-medium">
                Your technician will mark the invoice as paid and you'll receive a receipt by email.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2">
          <p className="text-xs text-gray-400">DADA HOUSE · 7001 South Texas 6 STE 246, Houston, TX 77083</p>
          <p className="text-xs text-gray-400">(910) 685-8042 · customerservice@mydadahouse.com</p>
          {invoice.sentByName && <p className="text-xs text-gray-300 mt-1">Prepared by {invoice.sentByName}</p>}
        </div>
      </div>
    </div>
  );
}

function StripeForm({ token, total, onSuccess }: { token: string; total: number; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [stripeError, setStripeError] = useState("");
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setStripeError("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setStripeError(error.message ?? "Payment failed. Please try again.");
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      await fetch(`/api/pay/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "card-paid", paymentIntentId: paymentIntent.id }),
      });
      setSucceeded(true);
      onSuccess();
    }
    setProcessing(false);
  };

  if (succeeded) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="font-bold text-gray-900">Payment successful!</p>
        <p className="text-sm text-gray-500 mt-1">A receipt has been sent to your email.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {stripeError && <p className="text-xs text-red-600">{stripeError}</p>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold text-base hover:bg-green-700 disabled:opacity-60 transition-colors"
      >
        {processing ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Processing…</> : `Pay ${formatCurrency(total)}`}
      </button>
    </form>
  );
}

export default function PayPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1B3FA8]" /></div>}>
      <PayPage />
    </Suspense>
  );
}
