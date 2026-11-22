"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Loader2, CheckCircle2, PenLine, ArrowDown, FileText } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { formatCurrency } from "@/lib/utils";
import SignaturePad from "@/components/portal/signature-pad";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "pk_test_placeholder");

type Property = { id: string; nickname: string | null; address: string; apt: string | null; city: string; state: string; zipCode: string; systemCount: number };

type Contract = {
  id: string;
  status: string;
  autoRenew: boolean;
  membershipNumber: string | null;
  paidAt: string | null;
  membershipStartDate: string | null;
  renewalDate: string | null;
  annualTotal: number | null;
  monthlyTotal: number | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  customerSigned: boolean;
  signedAt: string | null;
  properties: Property[];
  systemMakeModel: string | null;
  systemAge: string | null;
  numberOfSystems: number;
  systemTypes: string[];
  billingInterval: string | null;
  customer: { firstName: string; lastName: string | null; phone: string; email: string | null; address: string | null; city: string | null; state: string | null; zipCode: string | null };
  planType: { name: string; monthlyPrice: number; annualPrice: number; contractHtml: string };
};

function PaymentForm({ token, planType, customer, quantity, onSuccess }: { token: string; planType: Contract["planType"]; customer: Contract["customer"]; quantity: number; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");
  const [saveCard, setSaveCard] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError("");
    try {
      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) throw new Error("Card details are required");
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: "card",
        card: cardNumberElement,
        billing_details: {
          name: `${customer.firstName} ${customer.lastName ?? ""}`.trim(),
          address: {
            line1: customer.address ?? undefined,
            city: customer.city ?? undefined,
            state: customer.state ?? undefined,
            postal_code: customer.zipCode ?? undefined,
          },
        },
      });
      if (pmError || !paymentMethod) throw new Error(pmError?.message ?? "Failed to process card");

      const res = await fetch(`/api/contracts/${token}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval, saveCard: interval === "monthly" ? true : saveCard, paymentMethodId: paymentMethod.id }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Payment failed");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="space-y-2">
        <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer ${interval === "monthly" ? "border-[#1B3FA8] bg-blue-50" : "border-gray-200"}`}>
          <span className="flex items-center gap-2">
            <input type="radio" checked={interval === "monthly"} onChange={() => setInterval("monthly")} />
            <span className="font-semibold text-sm">Monthly</span>
          </span>
          <span className="font-bold text-sm">{formatCurrency(planType.monthlyPrice * quantity)}/mo</span>
        </label>
        <label className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer ${interval === "annual" ? "border-[#1B3FA8] bg-blue-50" : "border-gray-200"}`}>
          <span className="flex items-center gap-2">
            <input type="radio" checked={interval === "annual"} onChange={() => setInterval("annual")} />
            <span className="font-semibold text-sm">Annual</span>
          </span>
          <span className="font-bold text-sm">{formatCurrency(planType.annualPrice * quantity)}/yr</span>
        </label>
        {quantity > 1 && <p className="text-xs text-gray-400">Price shown for {quantity} systems ({formatCurrency(planType.monthlyPrice)}/mo per system)</p>}
      </div>

      <label className="flex items-start gap-2 text-xs text-gray-600">
        <input
          type="checkbox"
          checked={interval === "monthly" ? true : saveCard}
          onChange={(e) => setSaveCard(e.target.checked)}
          disabled={interval === "monthly"}
          className="mt-0.5"
        />
        <span>
          Save my card for automatic renewal.
          {interval === "annual" && !saveCard && (
            <span className="block text-amber-600 mt-1">Unchecked: this is a one-time payment for this year only — your plan will not renew automatically.</span>
          )}
        </span>
      </label>

      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Card Number</label>
          <div className="border border-gray-200 rounded-xl p-3">
            <CardNumberElement options={{ style: { base: { fontSize: "16px" } } }} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500 font-medium mb-1 block">Expiry</label>
            <div className="border border-gray-200 rounded-xl p-3">
              <CardExpiryElement options={{ style: { base: { fontSize: "16px" } } }} />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 font-medium mb-1 block">CVC</label>
            <div className="border border-gray-200 rounded-xl p-3">
              <CardCvcElement options={{ style: { base: { fontSize: "16px" } } }} />
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button type="submit" disabled={!stripe || paying} className="w-full py-3 bg-[#F7921A] hover:bg-[#E07F10] disabled:opacity-60 text-white rounded-xl font-bold">
        {paying ? "Processing…" : `Pay ${formatCurrency((interval === "monthly" ? planType.monthlyPrice : planType.annualPrice) * quantity)}`}
      </button>
      <p className="text-[11px] text-gray-400 text-center">Sales tax calculated automatically at checkout based on your address.</p>
    </form>
  );
}

export default function ContractPage() {
  const { token } = useParams<{ token: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [systemMakeModel, setSystemMakeModel] = useState("");
  const [systemAge, setSystemAge] = useState("");
  const [paidJustNow, setPaidJustNow] = useState(false);

  useEffect(() => {
    fetch(`/api/contracts/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError("This contract link is invalid or has expired.");
        else {
          setContract(d.contract);
          setSystemMakeModel(d.contract.systemMakeModel ?? "");
          setSystemAge(d.contract.systemAge ?? "");
        }
        setLoading(false);
      })
      .catch(() => { setError("Failed to load contract."); setLoading(false); });
  }, [token]);

  async function handleSign(signatureUrl: string) {
    const res = await fetch(`/api/contracts/${token}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureUrl, systemMakeModel, systemAge }),
    });
    if (!res.ok) throw new Error("Failed to save signature");
    const d = await res.json();
    setContract(d.contract);
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#1B3FA8]" /></div>;
  }
  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center">
        <div>
          <p className="text-gray-500 text-lg">{error}</p>
          <p className="text-gray-400 text-sm mt-2">Please contact DADA HOUSE at (844) 928-0875</p>
        </div>
      </div>
    );
  }

  const paidStatus = contract.status === "ACTIVE" || contract.status === "PAID" || contract.status === "PAST_DUE";
  // Paid online or by phone, not signed yet: the customer signs the agreement now.
  if (paidStatus && !contract.customerSigned && !paidJustNow) {
    return <SignPaidContract token={token} contract={contract} />;
  }

  const isPaid = contract.status === "ACTIVE" || contract.status === "PAID" || paidJustNow;
  const isSigned = contract.status === "SIGNED" || isPaid;
  const { customer, planType } = contract;

  if (isPaid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-gray-900 mb-2">You're All Set!</h1>
          <p className="text-gray-500 mb-1">{planType.name} Maintenance Plan</p>
          <p className="text-sm text-gray-400 mt-4">A confirmation and your signed copy have been sent to your phone and email.</p>
          <a href={`/print/contract/${token}`} className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl bg-[#1B3FA8] text-white text-sm font-bold">
            <FileText className="w-4 h-4" /> View my signed contract
          </a>
          <p className="text-xs text-gray-400 mt-4">DADA HOUSE · (844) 928-0875</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ backgroundColor: "#1B3FA8" }} className="px-4 py-6 text-white text-center">
        <div className="inline-block bg-white rounded-xl px-4 py-2 mb-2">
          <Image src="/logo dada house.png" alt="DADA HOUSE" width={120} height={56} className="object-contain" />
        </div>
        <p className="text-sm opacity-80">{planType.name} Maintenance Plan</p>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-sm">
          <p className="font-bold text-gray-900 mb-2">Customer Information</p>
          <p>{customer.firstName} {customer.lastName ?? ""}</p>
          <p className="text-gray-500">{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</p>
          {customer.address && <p className="text-gray-500">{customer.address}, {customer.city}, {customer.state} {customer.zipCode}</p>}
          {contract.systemTypes.length > 0 && (
            <p className="text-gray-500 mt-1">{contract.numberOfSystems} system{contract.numberOfSystems === 1 ? "" : "s"} · {contract.systemTypes.join(" + ")}</p>
          )}
        </div>

        {!isSigned && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">HVAC System Make/Model (optional)</label>
              <input value={systemMakeModel} onChange={(e) => setSystemMakeModel(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">System Age (optional)</label>
              <input value={systemAge} onChange={(e) => setSystemAge(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        <div
          className="bg-white rounded-2xl border border-gray-200 p-5 text-sm leading-relaxed max-h-96 overflow-y-auto [&_h2]:text-[#1B3FA8] [&_h2]:font-bold [&_h2]:text-base [&_h2]:mt-4 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5 [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:pb-1 [&_td]:py-0.5"
          dangerouslySetInnerHTML={{ __html: planType.contractHtml }}
        />

        {!isSigned ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="font-bold text-gray-900 mb-3">Sign to Accept</p>
            <SignaturePad onSubmit={handleSign} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="font-bold text-gray-900 mb-3">Choose Your Payment Plan</p>
            <Elements stripe={stripePromise}>
              <PaymentForm token={token} planType={planType} customer={customer} quantity={contract.numberOfSystems || 1} onSuccess={() => setPaidJustNow(true)} />
            </Elements>
          </div>
        )}
      </div>
    </div>
  );
}

const fmtDay = (d: string | null) => d ? new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/New_York" }) : "—";
const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

/** Paid plan, agreement not signed yet: the filled contract + a very visible "Sign here". */
function SignPaidContract({ token, contract }: { token: string; contract: Contract }) {
  const [done, setDone] = useState<{ email: string | null } | null>(null);
  const name = [contract.firstName ?? contract.customer.firstName, contract.lastName ?? contract.customer.lastName].filter(Boolean).join(" ");
  const email = contract.email ?? contract.customer.email;
  const phone = contract.phone ?? contract.customer.phone;
  const monthly = contract.billingInterval === "monthly";
  const systems = contract.numberOfSystems || 1;
  const price = monthly ? (contract.monthlyTotal ?? contract.planType.monthlyPrice * systems) : (contract.annualTotal ?? contract.planType.annualPrice * systems);

  async function sign(signatureUrl: string) {
    const res = await fetch(`/api/contracts/${token}/sign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ signatureUrl }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error ?? "Failed to save signature");
    setDone({ email: d.emailedTo ?? email ?? null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-gray-900 mb-2">Contract signed — thank you!</h1>
          <p className="text-gray-500 text-sm">
            {done.email ? <>Your signed contract and your payment receipt are on their way to <strong>{done.email}</strong>.</> : "Your signed contract is saved."}
          </p>
          <a href={`/print/contract/${token}`} className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl bg-[#1B3FA8] text-white text-sm font-bold">
            <FileText className="w-4 h-4" /> View / download my contract
          </a>
          <p className="text-xs text-gray-400 mt-6">DADA HOUSE · (844) 928-0875</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div style={{ backgroundColor: "#1B3FA8" }} className="px-4 py-6 text-white text-center">
        <div className="inline-block bg-white rounded-xl px-4 py-2 mb-2">
          <Image src="/logo dada house.png" alt="DADA HOUSE" width={120} height={56} className="object-contain" />
        </div>
        <p className="text-sm opacity-80">{contract.planType.name} HVAC Maintenance Plan Agreement</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <a href="#sign-here" className="flex items-center justify-between gap-3 bg-[#F7921A] text-white rounded-2xl px-5 py-4 shadow-lg">
          <span>
            <span className="block font-black text-lg leading-tight">Payment received ✓ — last step: sign your contract</span>
            <span className="block text-sm opacity-90">Review it below, then sign at the bottom.</span>
          </span>
          <ArrowDown className="w-6 h-6 shrink-0 animate-bounce" />
        </a>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-sm">
          <p className="font-bold text-gray-900 mb-3">Your plan</p>
          <dl className="grid grid-cols-[120px_1fr] gap-y-1.5">
            <dt className="text-gray-500">Customer</dt><dd className="font-semibold">{name}</dd>
            {phone && <><dt className="text-gray-500">Phone</dt><dd>{phone}</dd></>}
            {email && <><dt className="text-gray-500">Email</dt><dd className="break-all">{email}</dd></>}
            {contract.membershipNumber && <><dt className="text-gray-500">Membership</dt><dd className="font-semibold text-[#F7921A]">#{contract.membershipNumber}</dd></>}
            <dt className="text-gray-500">Systems covered</dt><dd>{systems}</dd>
            <dt className="text-gray-500">Billing</dt><dd>{monthly ? "Monthly" : "Annual"} — {usd(price)}{monthly ? "/month" : "/year"}{contract.autoRenew ? " (auto-renews)" : ""}</dd>
            <dt className="text-gray-500">Payment date</dt><dd>{fmtDay(contract.paidAt)}</dd>
            <dt className="text-gray-500">Start date</dt><dd>{fmtDay(contract.membershipStartDate ?? contract.paidAt)}</dd>
            {contract.renewalDate && <><dt className="text-gray-500">Next renewal</dt><dd>{fmtDay(contract.renewalDate)}</dd></>}
          </dl>
          {contract.properties.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="font-semibold text-gray-900 mb-1">Covered properties</p>
              {contract.properties.map((p) => (
                <p key={p.id} className="text-gray-600">
                  • {p.nickname ? `${p.nickname}: ` : ""}{p.address}{p.apt ? `, ${p.apt}` : ""}, {p.city}, {p.state} {p.zipCode} — {p.systemCount} system{p.systemCount === 1 ? "" : "s"}
                </p>
              ))}
            </div>
          )}
        </div>

        <div
          className="bg-white rounded-2xl border border-gray-200 p-5 text-sm leading-relaxed [&_h2]:text-[#1B3FA8] [&_h2]:font-bold [&_h2]:text-base [&_h2]:mt-4 [&_h2]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5 [&_table]:w-full [&_table]:text-xs [&_th]:text-left [&_th]:pb-1 [&_td]:py-0.5 [&_p]:mb-2"
          dangerouslySetInnerHTML={{ __html: contract.planType.contractHtml }}
        />

        <div id="sign-here" className="scroll-mt-4 bg-white rounded-2xl border-4 border-[#F7921A] p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-1">
            <PenLine className="w-6 h-6 text-[#F7921A]" />
            <p className="font-black text-xl text-gray-900">Sign here</p>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            I, <strong>{name}</strong>, have read and agree to this DADA HOUSE HVAC Maintenance Plan agreement, including the automatic renewal and the
            recurring credit card payment authorization. Use your finger or mouse in the box below.
          </p>
          <SignaturePad onSubmit={sign} />
          <p className="text-[11px] text-gray-400 mt-3">After you sign, a copy of your signed contract and your payment receipt is emailed to you automatically.</p>
        </div>
      </div>
    </div>
  );
}
