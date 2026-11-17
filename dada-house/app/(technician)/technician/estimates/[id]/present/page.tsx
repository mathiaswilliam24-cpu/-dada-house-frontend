"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2, CheckCircle2, CreditCard, ShieldCheck, ChevronLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import SignatureStep from "@/components/technician/signature-step";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

type LineItem = { desc: string; details?: string; rate: number; qty: number; amount: number };
type Estimate = {
  id: string; estimateNumber: string; appointmentId: string | null; clientName: string; clientEmail: string;
  clientPhone: string | null; clientMobile: string | null; clientAddress: string | null; clientCity: string | null;
  clientState: string; clientZip: string | null; lineItems: LineItem[]; additionalDetails: string | null;
  subtotal: number; taxType: string; taxLabel: string | null; taxRate: number; taxInclusive: boolean;
  discountType: string; discountValue: number; total: number; signatureUrl: string | null; paidAt: string | null;
  isInvoice: boolean; templateColor: string;
};
type Card = { id: string; brand: string; last4: string; expMonth: number; expYear: number; funding: string };
type Quote = { brand: string | null; last4: string | null; funding: string; cardFee: number; chargeTotal: number; saveCard: boolean; statement: string };
type Step = "review" | "approve" | "pay" | "authorize" | "done";

const brandLabel = (b?: string | null) => (b ? (b === "amex" ? "Amex" : b.charAt(0).toUpperCase() + b.slice(1)) : "Card");

function totals(e: Estimate) {
  const subtotal = e.lineItems.reduce((s, i) => s + (i.amount || 0), 0);
  let tax = 0;
  if (e.taxType === "total" && e.taxRate > 0) tax = e.taxInclusive ? subtotal - subtotal / (1 + e.taxRate / 100) : subtotal * (e.taxRate / 100);
  const discount = e.discountType === "percent" ? subtotal * (e.discountValue / 100) : e.discountType === "flat" ? e.discountValue : 0;
  return { subtotal, tax, discount };
}

async function post(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/technician/estimates/${id}/present`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error ?? "Something went wrong");
  return d;
}

export default function PresentPage() {
  return (
    <Elements stripe={stripePromise}>
      <PresentFlow />
    </Elements>
  );
}

function PresentFlow() {
  const { id } = useParams<{ id: string }>();
  const stripe = useStripe();
  const elements = useElements();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [canSaveCard, setCanSaveCard] = useState(false);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("review");
  const [signerName, setSignerName] = useState("");

  const [selected, setSelected] = useState<string>("new");
  const [saveCard, setSaveCard] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [payError, setPayError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [result, setResult] = useState<{ amount: number; brand: string | null; last4: string | null } | null>(null);

  const load = useCallback(async () => {
    const d = await fetch(`/api/technician/estimates/${id}/present`).then((r) => r.json());
    if (d.estimate) {
      setEstimate(d.estimate);
      setSignerName((n) => n || d.estimate.clientName || "");
      if (d.estimate.paidAt) setStep("done");
    }
    setCards(d.cards ?? []);
    setCanSaveCard(!!d.canSaveCard);
    if (d.cards?.length) setSelected(d.cards[0].id);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>;
  if (!estimate) return <p className="text-center text-gray-500 py-16">Estimate not found.</p>;

  const { subtotal, tax, discount } = totals(estimate);
  const color = estimate.templateColor || "#1B3FA8";

  async function continueToAuthorize() {
    setPayError("");
    setQuoting(true);
    try {
      let pmId = selected;
      if (selected === "new") {
        if (!stripe || !elements) throw new Error("Card form is still loading");
        const card = elements.getElement(CardElement);
        if (!card) throw new Error("Card form is still loading");
        const { paymentMethod, error } = await stripe.createPaymentMethod({ type: "card", card, billing_details: { name: signerName || estimate!.clientName } });
        if (error || !paymentMethod) throw new Error(error?.message ?? "Check the card details");
        pmId = paymentMethod.id;
      }
      const q = await post(id, { action: "quote", paymentMethodId: pmId, saveCard: selected === "new" && saveCard });
      setPaymentMethodId(pmId);
      setQuote(q);
      setStep("authorize");
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Check the card details");
    } finally {
      setQuoting(false);
    }
  }

  async function charge(name: string, signature: string) {
    let d = await post(id, { action: "charge", paymentMethodId, saveCard: quote?.saveCard, signerName: name, signature });
    if (d.status === "requires_action") {
      if (!stripe) throw new Error("Card verification unavailable");
      const { error, paymentIntent } = await stripe.confirmCardPayment(d.clientSecret);
      if (error || paymentIntent?.status !== "succeeded") throw new Error(error?.message ?? "Card verification failed");
      d = await post(id, { action: "confirm", paymentIntentId: paymentIntent.id });
    }
    setResult({ amount: d.amount, brand: d.brand, last4: d.last4 });
    setStep("done");
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <Link href={`/technician/estimates/${id}`} className="flex items-center gap-1 text-sm text-gray-500"><ChevronLeft className="w-4 h-4" /> Back to estimate</Link>
        <StepDots step={step} />
      </div>

      {/* ── Review ── */}
      {(step === "review" || step === "approve") && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-5 text-white" style={{ background: color }}>
            <p className="text-xs uppercase tracking-widest opacity-80">DADA HOUSE LLC</p>
            <h1 className="text-2xl font-bold mt-1">{estimate.isInvoice ? "Invoice" : "Estimate"} #{estimate.estimateNumber}</h1>
            <p className="text-sm opacity-90 mt-1">Prepared for {estimate.clientName}</p>
            {estimate.clientAddress && (
              <p className="text-xs opacity-80">{[estimate.clientAddress, estimate.clientCity, estimate.clientState, estimate.clientZip].filter(Boolean).join(", ")}</p>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {estimate.lineItems.filter((i) => i.desc).map((item, i) => (
              <div key={i} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-gray-900">{item.desc}</p>
                  <p className="font-bold text-gray-900 shrink-0">{formatCurrency(item.amount)}</p>
                </div>
                {item.details && <p className="text-sm text-gray-500 mt-1">{item.details}</p>}
                {item.qty !== 1 && <p className="text-xs text-gray-400 mt-1">{item.qty} × {formatCurrency(item.rate)}</p>}
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-50 space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatCurrency(subtotal)} />
            {discount > 0 && <Row label="Discount" value={`− ${formatCurrency(discount)}`} />}
            {tax > 0 && <Row label={`${estimate.taxLabel || "Tax"} (${estimate.taxRate}%${estimate.taxInclusive ? ", included" : ""})`} value={formatCurrency(tax)} />}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-200">
              <span className="text-base font-bold text-gray-900">Total</span>
              <span className="text-2xl font-black" style={{ color }}>{formatCurrency(estimate.total)}</span>
            </div>
          </div>
          {estimate.additionalDetails && <p className="p-4 text-sm text-gray-600 border-t border-gray-100 whitespace-pre-line">{estimate.additionalDetails}</p>}
        </div>
      )}

      {step === "review" && (
        estimate.signatureUrl ? (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="w-4 h-4" /> Already approved and signed by the customer.</p>
            <button onClick={() => setStep("pay")} className="w-full py-3.5 bg-[#1B3FA8] text-white rounded-2xl font-bold">Continue to Payment</button>
          </div>
        ) : (
          <button
            onClick={() => setStep("approve")}
            disabled={!(estimate.total > 0)}
            className="w-full py-3.5 bg-[#1B3FA8] text-white rounded-2xl font-bold disabled:opacity-50"
          >
            Approve & Sign
          </button>
        )
      )}

      {/* ── Signature 1: approval ── */}
      {step === "approve" && (
        <SignatureStep
          title="Customer Approval"
          defaultName={signerName}
          statement={`I, [customer name], have reviewed estimate #${estimate.estimateNumber}, including the items, prices and tax shown, for a total of ${formatCurrency(estimate.total)}. I approve this work and authorize DADA HOUSE LLC to perform it at my property.`}
          submitLabel="Sign & Continue to Payment"
          onSubmit={async (name, signature) => {
            const d = await post(id, { action: "approve", signerName: name, signature });
            setEstimate((e) => (e ? { ...e, ...d.estimate } : e));
            setSignerName(name);
            setStep("pay");
          }}
        />
      )}

      {/* ── Payment method ── */}
      {step === "pay" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Payment</h2>
            <span className="text-xl font-black text-gray-900">{formatCurrency(estimate.total)}</span>
          </div>

          {cards.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cards on file</p>
              {cards.map((c) => (
                <label key={c.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${selected === c.id ? "border-[#1B3FA8] bg-blue-50" : "border-gray-200"}`}>
                  <input type="radio" name="card" checked={selected === c.id} onChange={() => setSelected(c.id)} />
                  <CreditCard className="w-5 h-5 text-gray-500" />
                  <span className="font-semibold text-gray-900">{brandLabel(c.brand)} •••• {c.last4}</span>
                  <span className="ml-auto text-xs text-gray-500">exp {String(c.expMonth).padStart(2, "0")}/{String(c.expYear).slice(-2)}</span>
                </label>
              ))}
            </div>
          )}

          <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${selected === "new" ? "border-[#1B3FA8] bg-blue-50" : "border-gray-200"}`}>
            <input type="radio" name="card" checked={selected === "new"} onChange={() => setSelected("new")} />
            <span className="font-semibold text-gray-900">{cards.length ? "Use a different card" : "Enter card"}</span>
          </label>

          <div className={selected === "new" ? "space-y-3" : "hidden"}>
            <div className="border border-gray-300 rounded-xl px-3 py-3.5 bg-white">
              <CardElement options={{ hidePostalCode: false, style: { base: { fontSize: "17px", color: "#111827" } } }} />
            </div>
            {canSaveCard && (
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={saveCard} onChange={(e) => setSaveCard(e.target.checked)} className="mt-0.5" />
                Save this card on file for future DADA HOUSE services (customer agrees)
              </label>
            )}
          </div>

          <p className="text-xs text-gray-400">A 3% fee applies to credit cards only (no fee on debit cards). The exact amount is shown before the customer signs.</p>
          {payError && <p className="text-sm text-red-600">{payError}</p>}
          <button
            onClick={continueToAuthorize}
            disabled={quoting}
            className="w-full py-3.5 flex items-center justify-center gap-2 bg-[#1B3FA8] text-white rounded-2xl font-bold disabled:opacity-60"
          >
            {quoting && <Loader2 className="w-4 h-4 animate-spin" />} Continue
          </button>
          {estimate.appointmentId && (
            <Link href={`/technician/jobs/${estimate.appointmentId}/payment`} className="block text-center text-sm font-semibold text-gray-500">
              Other payment method (cash, check, Zelle)
            </Link>
          )}
        </div>
      )}

      {/* ── Signature 2: payment authorization ── */}
      {step === "authorize" && quote && (
        <SignatureStep
          title="Authorize Payment"
          defaultName={signerName}
          statement={quote.statement}
          submitLabel={`Sign & Pay ${formatCurrency(quote.chargeTotal)}`}
          onSubmit={charge}
        >
          <div className="rounded-xl border border-gray-200 p-3 space-y-1 text-sm">
            <Row label={`Invoice #${estimate.estimateNumber}`} value={formatCurrency(estimate.total)} />
            {quote.cardFee > 0 && <Row label="Credit card fee (3%)" value={formatCurrency(quote.cardFee)} />}
            <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
              <span className="font-bold text-gray-900">Amount to charge</span>
              <span className="text-xl font-black text-gray-900">{formatCurrency(quote.chargeTotal)}</span>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> {brandLabel(quote.brand)} •••• {quote.last4} ({quote.funding}){quote.saveCard ? " — will be saved on file" : ""}</p>
          </div>
          <button onClick={() => setStep("pay")} className="text-sm font-semibold text-gray-500">← Change card</button>
        </SignatureStep>
      )}

      {/* ── Done ── */}
      {step === "done" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center space-y-3">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Payment approved</h2>
          {result ? (
            <p className="text-gray-600">{formatCurrency(result.amount)} charged to {brandLabel(result.brand)} •••• {result.last4}</p>
          ) : (
            <p className="text-gray-600">Invoice #{estimate.estimateNumber} is paid.</p>
          )}
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Receipt sent to the customer. Signatures saved.</p>
          {estimate.appointmentId && (
            <Link href={`/technician/jobs/${estimate.appointmentId}/invoice`} className="block w-full py-3 bg-[#1B3FA8] text-white rounded-2xl font-bold">
              Back to Job
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-gray-600">
      <span>{label}</span><span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function StepDots({ step }: { step: Step }) {
  const order: Step[] = ["review", "approve", "pay", "authorize", "done"];
  const idx = order.indexOf(step);
  return (
    <div className="flex items-center gap-1.5">
      {order.map((s, i) => <span key={s} className={`w-2 h-2 rounded-full ${i <= idx ? "bg-[#1B3FA8]" : "bg-gray-300"}`} />)}
    </div>
  );
}
