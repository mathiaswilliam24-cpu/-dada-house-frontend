"use client";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { buttonVariants } from "@/components/ui/button";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href + "?paid=1" },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed");
    } else {
      onSuccess();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading || !stripe} className={buttonVariants({ variant: "default" })}>
        {loading ? "Processing…" : "Pay Now"}
      </button>
    </form>
  );
}

export default function InvoicePayButton({
  invoiceId,
  amount,
  appointmentId,
}: {
  invoiceId: string;
  amount: number;
  appointmentId: string;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  async function initPayment() {
    setLoading(true);
    const res = await fetch("/api/payments/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, appointmentId }),
    });
    const data = await res.json();
    setClientSecret(data.clientSecret);
    setLoading(false);
  }

  if (paid) {
    return <p className="text-green-600 font-medium">✓ Payment successful!</p>;
  }

  if (!clientSecret) {
    return (
      <button onClick={initPayment} disabled={loading} className={buttonVariants({ variant: "default" })}>
        {loading ? "Loading…" : `Pay $${amount.toFixed(2)}`}
      </button>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm onSuccess={() => setPaid(true)} />
    </Elements>
  );
}
