"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Send, ChevronDown, ChevronUp, Check,
  Loader2, ArrowLeft, FileText, Mail, Settings2, X, Users, Search
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type LineItem = {
  id: string;
  desc: string;
  details: string;
  rate: number;
  qty: number;
  amount: number;
};

type EstimateData = {
  id?: string;
  estimateNumber?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientMobile: string;
  clientFax: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  lineItems: LineItem[];
  additionalDetails: string;
  subtotal: number;
  taxType: string;
  taxLabel: string;
  taxRate: number;
  taxInclusive: boolean;
  discountType: string;
  discountValue: number;
  total: number;
  status: string;
  templateColor: string;
  showFinancing: boolean;
  requestSignature: boolean;
  sentAt?: string | null;
};

const TEMPLATE_COLORS = [
  "#1B3FA8", "#0891b2", "#059669", "#7c3aed",
  "#be185d", "#dc2626", "#d97706", "#374151",
];

const FROM = {
  name: "DADA HOUSE LLC",
  email: "customerservice@mydadahouse.com",
  address: "7001 South Texas 6 STE 246",
  city: "Houston, TX 77083",
  phone: "(910) 685-8042",
};

function newLine(): LineItem {
  return { id: crypto.randomUUID(), desc: "", details: "", rate: 0, qty: 1, amount: 0 };
}

function computeTotals(
  items: LineItem[],
  taxType: string,
  taxRate: number,
  taxInclusive: boolean,
  discountType: string,
  discountValue: number
) {
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  let tax = 0;
  if (taxType === "total" && taxRate > 0) {
    tax = taxInclusive ? subtotal - subtotal / (1 + taxRate / 100) : subtotal * (taxRate / 100);
  }
  let discount = 0;
  if (discountType === "percent" && discountValue > 0) {
    discount = subtotal * (discountValue / 100);
  } else if (discountType === "flat" && discountValue > 0) {
    discount = discountValue;
  }
  const total = taxInclusive ? subtotal - discount : subtotal + tax - discount;
  return { subtotal, tax, discount, total };
}

type TechClient = {
  id: string; name: string; email: string | null; phone: string | null;
  mobile: string | null; address: string | null; city: string | null;
  state: string; zip: string | null;
};

type Props = {
  initialData?: Partial<EstimateData>;
  mode: "create" | "edit";
  quick?: boolean;
};

export default function EstimateEditor({ initialData, mode, quick: _quick }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [sentAt, setSentAt] = useState<string | null>(initialData?.sentAt ?? null);

  // Client picker
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<TechClient[]>([]);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientSearching, setClientSearching] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showClientPicker) return;
    const timer = setTimeout(async () => {
      setClientSearching(true);
      try {
        const res = await fetch(`/api/technician/clients${clientSearch ? `?q=${encodeURIComponent(clientSearch)}` : ""}`);
        const d = await res.json();
        setClientResults(d.clients ?? []);
      } finally {
        setClientSearching(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [clientSearch, showClientPicker]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowClientPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function fillFromClient(c: TechClient) {
    setClientName(c.name);
    setClientEmail(c.email ?? "");
    setClientPhone(c.phone ?? "");
    setClientMobile(c.mobile ?? "");
    setClientAddress(c.address ?? "");
    setClientCity(c.city ?? "");
    setClientState(c.state ?? "TX");
    setClientZip(c.zip ?? "");
    setShowClientPicker(false);
    setClientSearch("");
  }

  // Client fields
  const [clientName, setClientName] = useState(initialData?.clientName ?? "");
  const [clientEmail, setClientEmail] = useState(initialData?.clientEmail ?? "");
  const [clientPhone, setClientPhone] = useState(initialData?.clientPhone ?? "");
  const [clientMobile, setClientMobile] = useState(initialData?.clientMobile ?? "");
  const [clientFax, setClientFax] = useState(initialData?.clientFax ?? "");
  const [clientAddress, setClientAddress] = useState(initialData?.clientAddress ?? "");
  const [clientCity, setClientCity] = useState(initialData?.clientCity ?? "");
  const [clientState, setClientState] = useState(initialData?.clientState ?? "TX");
  const [clientZip, setClientZip] = useState(initialData?.clientZip ?? "");
  const [additionalDetails, setAdditionalDetails] = useState(initialData?.additionalDetails ?? "");

  // Line items
  const [items, setItems] = useState<LineItem[]>(
    initialData?.lineItems?.length
      ? (initialData.lineItems as LineItem[])
      : [newLine()]
  );

  // Settings
  const [templateColor, setTemplateColor] = useState(initialData?.templateColor ?? "#1B3FA8");
  const [taxType, setTaxType] = useState(initialData?.taxType ?? "none");
  const [taxLabel, setTaxLabel] = useState(initialData?.taxLabel ?? "Tax");
  const [taxRate, setTaxRate] = useState(initialData?.taxRate ?? 0);
  const [taxInclusive, setTaxInclusive] = useState(initialData?.taxInclusive ?? false);
  const [discountType, setDiscountType] = useState(initialData?.discountType ?? "none");
  const [discountValue, setDiscountValue] = useState(initialData?.discountValue ?? 0);
  const [showFinancing, setShowFinancing] = useState(initialData?.showFinancing ?? false);
  const [requestSignature, setRequestSignature] = useState(initialData?.requestSignature ?? true);

  const { subtotal, tax, discount, total } = computeTotals(
    items, taxType, taxRate, taxInclusive, discountType, discountValue
  );

  const updateItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "rate" || field === "qty") {
          updated.amount = Number(updated.rate) * Number(updated.qty);
        }
        return updated;
      })
    );
  }, []);

  const addItem = () => setItems((prev) => [...prev, newLine()]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const buildPayload = () => ({
    clientName, clientEmail, clientPhone, clientMobile, clientFax,
    clientAddress, clientCity, clientState, clientZip,
    lineItems: items.map(({ id: _id, ...rest }) => rest),
    additionalDetails,
    subtotal, taxType, taxLabel, taxRate, taxInclusive,
    discountType, discountValue, total,
    templateColor, showFinancing, requestSignature,
    status: initialData?.status ?? "OPEN",
  });

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const url = mode === "create"
        ? "/api/technician/estimates"
        : `/api/technician/estimates/${initialData!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (mode === "create") {
        router.replace(`/technician/estimates/${data.estimate.id}`);
      }
    } catch {
      setError("Failed to save estimate. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!clientEmail) { setError("Add the client's email address before sending."); return; }
    if (!confirm(`Send this estimate to ${clientEmail}?`)) return;

    setSending(true);
    setError("");
    try {
      let estimateId = initialData?.id;

      // If new estimate, save it first to get an ID
      if (!estimateId) {
        const res = await fetch("/api/technician/estimates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        if (!res.ok) throw new Error("Save failed");
        const data = await res.json();
        estimateId = data.estimate.id;
      } else {
        // Save latest changes first
        const res = await fetch(`/api/technician/estimates/${estimateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        if (!res.ok) throw new Error("Save failed");
      }

      const res = await fetch(`/api/technician/estimates/${estimateId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "email" }),
      });
      if (!res.ok) throw new Error("Email failed");

      const now = new Date().toISOString();
      setSentAt(now);
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 4000);

      if (mode === "create") {
        router.replace(`/technician/estimates/${estimateId}`);
      }
    } catch {
      setError("Failed to send email. Check the email address and try again.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    if (!confirm("Delete this estimate?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/technician/estimates/${initialData.id}`, { method: "DELETE" });
      router.replace("/technician/estimates");
    } catch {
      setError("Failed to delete.");
      setDeleting(false);
    }
  };

  const handleClose = async () => {
    if (mode === "edit" && initialData?.id) {
      await fetch(`/api/technician/estimates/${initialData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
    }
    router.replace("/technician/estimates");
  };

  const previewProps = {
    from: FROM,
    clientName, clientEmail, clientAddress, clientCity, clientState, clientZip,
    estimateNumber: initialData?.estimateNumber ?? "DRAFT",
    items, additionalDetails, subtotal, tax, discount, total,
    taxLabel, taxType, discountType, templateColor, showFinancing,
    onBack: () => setActiveTab("edit" as const),
  };

  if (activeTab === "preview") return <PreviewPanel {...previewProps} />;

  return (
    <div className="space-y-4 pb-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 sticky top-0 bg-gray-50 py-2 z-10 -mx-4 px-4 border-b border-gray-200">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-1 bg-white rounded-xl border border-gray-200 p-0.5">
          <button
            onClick={() => setActiveTab("edit")}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors bg-[#1B3FA8] text-white"
          >
            Edit
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors text-gray-500"
          >
            Preview
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1B3FA8] text-white rounded-xl text-xs font-bold hover:bg-[#1A3490] transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : null}
          {saving ? "Saving…" : saved ? "Saved!" : "Save"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2 flex items-center justify-between">
          {error}
          <button onClick={() => setError("")}><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {sentSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl px-3 py-2 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 shrink-0" />
          Estimate sent to <span className="font-semibold">{clientEmail}</span>
        </div>
      )}

      {/* Send email button — prominent */}
      <button
        onClick={handleSendEmail}
        disabled={sending}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors ${
          sending
            ? "bg-gray-100 text-gray-400"
            : clientEmail
            ? "bg-[#1B3FA8] text-white hover:bg-[#1A3490] active:scale-[0.98]"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {sending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
        ) : (
          <><Mail className="w-4 h-4" /> {sentAt ? "Resend Estimate by Email" : "Send Estimate by Email"}</>
        )}
      </button>

      {sentAt && !sentSuccess && (
        <p className="text-center text-xs text-gray-400">
          Last sent {new Date(sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      {!clientEmail && (
        <p className="text-center text-xs text-orange-500">Add the client's email address above to enable sending</p>
      )}

      {/* Secondary actions */}
      <div className="flex gap-2">
        {mode === "edit" && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-red-200 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        )}
        {mode === "edit" && initialData?.status === "OPEN" && (
          <button
            onClick={handleClose}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {/* FROM section */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div style={{ backgroundColor: templateColor }} className="px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" style={{ color: templateColor }} />
          </div>
          <div>
            <p className="font-bold text-white text-sm">DADA HOUSE</p>
            <p className="text-xs text-white/70">Estimate #{initialData?.estimateNumber ?? "—"}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-white/70">Date</p>
            <p className="text-xs text-white font-medium">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
          </div>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">From</p>
          <p className="text-sm font-semibold text-gray-900">{FROM.name}</p>
          <p className="text-xs text-gray-500">{FROM.email}</p>
          <p className="text-xs text-gray-500">{FROM.address}, {FROM.city}</p>
          <p className="text-xs text-gray-500">{FROM.phone}</p>
        </div>
      </div>

      {/* BILL TO section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bill To</p>
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              onClick={() => { setShowClientPicker((v) => !v); setClientSearch(""); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-[#1B3FA8] rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
            >
              <Users className="w-3.5 h-3.5" /> My Clients
            </button>
            {showClientPicker && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-2xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      autoFocus
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Search clients…"
                      className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                    />
                  </div>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {clientSearching ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                  ) : clientResults.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No clients found</p>
                  ) : (
                    clientResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => fillFromClient(c)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                      >
                        <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                        {c.email && <p className="text-xs text-gray-500">{c.email}</p>}
                        {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Client name *"
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
        />
        <input
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          placeholder="Email address"
          type="email"
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
        />
        <input
          value={clientAddress}
          onChange={(e) => setClientAddress(e.target.value)}
          placeholder="Street address"
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            value={clientCity}
            onChange={(e) => setClientCity(e.target.value)}
            placeholder="City"
            className="col-span-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
          />
          <input
            value={clientState}
            onChange={(e) => setClientState(e.target.value)}
            placeholder="State"
            className="col-span-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
          />
          <input
            value={clientZip}
            onChange={(e) => setClientZip(e.target.value)}
            placeholder="ZIP"
            className="col-span-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="Phone"
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
          />
          <input
            value={clientMobile}
            onChange={(e) => setClientMobile(e.target.value)}
            placeholder="Mobile"
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
          />
        </div>
        <input
          value={clientFax}
          onChange={(e) => setClientFax(e.target.value)}
          placeholder="Fax (optional)"
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
        />
      </div>

      {/* Line items */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Line Items</p>
          <button
            onClick={addItem}
            className="flex items-center gap-1 text-xs font-bold text-[#1B3FA8] hover:text-[#1A3490] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase">
          <div className="col-span-5">Description</div>
          <div className="col-span-2 text-right">Rate</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-1" />
        </div>

        {items.map((item, idx) => (
          <div key={item.id} className={`px-4 py-3 ${idx < items.length - 1 ? "border-b border-gray-50" : ""}`}>
            <div className="grid grid-cols-12 gap-1 items-start">
              <div className="col-span-5">
                <input
                  value={item.desc}
                  onChange={(e) => updateItem(item.id, "desc", e.target.value)}
                  placeholder="Description"
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.rate || ""}
                  onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8] text-right"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.qty || ""}
                  onChange={(e) => updateItem(item.id, "qty", parseInt(e.target.value) || 1)}
                  placeholder="1"
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8] text-center"
                />
              </div>
              <div className="col-span-2 flex items-center justify-end">
                <p className="text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</p>
              </div>
              <div className="col-span-1 flex items-center justify-center">
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                  className="p-1 text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <textarea
              value={item.details}
              onChange={(e) => updateItem(item.id, "details", e.target.value)}
              placeholder="Additional details for this item (optional)"
              rows={1}
              className="mt-1.5 w-full px-2 py-1.5 text-xs border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8] text-gray-500 resize-none bg-gray-50"
            />
          </div>
        ))}

        {/* Additional details */}
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1.5 font-medium">Additional Notes</p>
          <textarea
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
            placeholder="Payment terms, warranties, special conditions…"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8] resize-none"
          />
        </div>

        {/* Totals */}
        <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {taxType !== "none" && taxRate > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{taxLabel || "Tax"} ({taxRate}%{taxInclusive ? " incl." : ""})</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          {discountType !== "none" && discountValue > 0 && (
            <div className="flex items-center justify-between text-sm text-green-600">
              <span>Discount{discountType === "percent" ? ` (${discountValue}%)` : ""}</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2">
            <span>Total</span>
            <span style={{ color: templateColor }}>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Settings panel */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowSettings((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-bold text-gray-700">Settings</span>
          </div>
          {showSettings ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showSettings && (
          <div className="px-4 pb-4 space-y-5 border-t border-gray-100">
            {/* Template color */}
            <div className="pt-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Template Color</p>
              <div className="flex gap-2 flex-wrap">
                {TEMPLATE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setTemplateColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-8 h-8 rounded-full transition-transform ${templateColor === c ? "scale-125 ring-2 ring-offset-2 ring-gray-400" : "hover:scale-110"}`}
                  />
                ))}
              </div>
            </div>

            {/* Tax */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Tax</p>
              <div className="space-y-2">
                <select
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8] bg-white"
                >
                  <option value="none">No Tax</option>
                  <option value="total">On Total</option>
                </select>
                {taxType !== "none" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={taxLabel}
                        onChange={(e) => setTaxLabel(e.target.value)}
                        placeholder="Tax label (e.g. Sales Tax)"
                        className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                      />
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={taxRate || ""}
                          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                          placeholder="Rate"
                          className="w-full px-3 py-2.5 pr-7 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => setTaxInclusive((v) => !v)}
                        className={`w-10 h-5.5 rounded-full transition-colors relative ${taxInclusive ? "bg-[#1B3FA8]" : "bg-gray-200"}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${taxInclusive ? "translate-x-4.5" : ""}`} />
                      </div>
                      <span className="text-sm text-gray-600">Tax inclusive</span>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Discount */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">Discount</p>
              <div className="space-y-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8] bg-white"
                >
                  <option value="none">No Discount</option>
                  <option value="percent">Percentage (%)</option>
                  <option value="flat">Flat Amount ($)</option>
                </select>
                {discountType !== "none" && (
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountValue || ""}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder={discountType === "percent" ? "e.g. 10" : "e.g. 50"}
                      className="w-full px-3 py-2.5 pr-8 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/20 focus:border-[#1B3FA8]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      {discountType === "percent" ? "%" : "$"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-700">Show Financing Options</p>
                  <p className="text-xs text-gray-400">Display financing info on estimate</p>
                </div>
                <div
                  onClick={() => setShowFinancing((v) => !v)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${showFinancing ? "bg-[#1B3FA8]" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${showFinancing ? "translate-x-5" : ""}`} />
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-gray-700">Request Client Signature</p>
                  <p className="text-xs text-gray-400">Client must sign to accept estimate</p>
                </div>
                <div
                  onClick={() => setRequestSignature((v) => !v)}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${requestSignature ? "bg-[#1B3FA8]" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${requestSignature ? "translate-x-5" : ""}`} />
                </div>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Preview Panel ───────────────────────────────────────────────────────────

type PreviewProps = {
  from: typeof FROM;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  estimateNumber: string;
  items: LineItem[];
  additionalDetails: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  taxLabel: string;
  taxType: string;
  discountType: string;
  templateColor: string;
  showFinancing: boolean;
  onBack: () => void;
};

function PreviewPanel(p: PreviewProps) {
  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center gap-3 sticky top-0 bg-gray-50 py-2 z-10 -mx-4 px-4 border-b border-gray-200">
        <button onClick={p.onBack} className="p-2 rounded-xl hover:bg-gray-200 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <p className="text-sm font-bold text-gray-700">Estimate Preview</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div style={{ backgroundColor: p.templateColor }} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-lg">DADA HOUSE</p>
              <p className="text-white/70 text-xs">Premier Home Services · Houston, TX</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold">ESTIMATE</p>
              <p className="text-white/70 text-xs">#{p.estimateNumber}</p>
              <p className="text-white/70 text-xs">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* From / To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">From</p>
              <p className="text-sm font-semibold text-gray-900">{p.from.name}</p>
              <p className="text-xs text-gray-500">{p.from.address}</p>
              <p className="text-xs text-gray-500">{p.from.city}</p>
              <p className="text-xs text-gray-500">{p.from.phone}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bill To</p>
              <p className="text-sm font-semibold text-gray-900">{p.clientName || "—"}</p>
              {p.clientEmail && <p className="text-xs text-gray-500">{p.clientEmail}</p>}
              {p.clientAddress && <p className="text-xs text-gray-500">{p.clientAddress}</p>}
              {(p.clientCity || p.clientState) && (
                <p className="text-xs text-gray-500">{[p.clientCity, p.clientState, ""].join(" ").trim()}</p>
              )}
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="grid grid-cols-12 gap-1 pb-1.5 border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase">
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-3 text-right">Amount</div>
            </div>
            {p.items.filter(i => i.desc).map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1 py-2 border-b border-gray-50">
                <div className="col-span-6">
                  <p className="text-sm text-gray-900">{item.desc}</p>
                  {item.details && <p className="text-xs text-gray-400 mt-0.5">{item.details}</p>}
                </div>
                <div className="col-span-2 text-right text-sm text-gray-600">{formatCurrency(item.rate)}</div>
                <div className="col-span-1 text-center text-sm text-gray-600">{item.qty}</div>
                <div className="col-span-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(item.amount)}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 ml-auto max-w-48">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{formatCurrency(p.subtotal)}</span>
            </div>
            {p.taxType !== "none" && p.tax > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>{p.taxLabel}</span><span>{formatCurrency(p.tax)}</span>
              </div>
            )}
            {p.discountType !== "none" && p.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span><span>-{formatCurrency(p.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-1.5" style={{ color: p.templateColor }}>
              <span>Total</span><span>{formatCurrency(p.total)}</span>
            </div>
          </div>

          {p.additionalDetails && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">{p.additionalDetails}</p>
            </div>
          )}

          {p.showFinancing && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-bold text-blue-700 mb-0.5">Financing Available</p>
              <p className="text-xs text-blue-600">Ask about our flexible payment options. Call (910) 685-8042.</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-3 text-center">
            <p className="text-xs text-gray-400">DADA HOUSE · 7001 South Texas 6 STE 246, Houston, TX 77083</p>
            <p className="text-xs text-gray-400">(910) 685-8042 · customerservice@mydadahouse.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
