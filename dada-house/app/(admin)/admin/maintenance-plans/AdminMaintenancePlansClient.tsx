"use client";

import { useState } from "react";
import {
  Users, Thermometer, DollarSign, TrendingUp, Search,
  ChevronDown, ChevronUp, ExternalLink,
  MessageSquare, ClipboardList, X, Loader2, CheckCircle, Plus,
} from "lucide-react";

type Contract = {
  id: string;
  membershipNumber: string | null;
  status: string;
  selfEnrolled: boolean;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  numberOfSystems: number;
  billingInterval: string | null;
  annualTotal: number | null;
  monthlyTotal: number | null;
  paidAt: string | null;
  renewalDate: string | null;
  membershipStartDate: string | null;
  createdAt: string;
  repName: string | null;
  customer: { firstName: string; lastName: string | null; phone: string; userId: string | null };
  properties: { id: string; address: string; city: string; state: string; systemCount: number }[];
  planType: { name: string };
};

type PlanType = { id: string; name: string; monthlyPrice: number; annualPrice: number };

type Stats = {
  activeCount: number;
  totalSystems: number;
  annualRevenue: number;
  monthlyRecurring: number;
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    "bg-green-100 text-green-700",
  PAST_DUE:  "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  SENT:      "bg-amber-100 text-amber-700",
  PAID:      "bg-blue-100 text-blue-700",
  SIGNED:    "bg-purple-100 text-purple-700",
};

// ─── Send Invite Modal ────────────────────────────────────────────────────────
function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/maintenance-plans/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setDone(true);
      setTimeout(() => { onDone(); onClose(); }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-[#1B3FA8]" />
            <h2 className="text-lg font-bold text-gray-900">Send Enrollment Link</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-500">
            An SMS will be sent with the enrollment link so the customer can subscribe online.
          </p>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="John Smith"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+1 713 000 0000"
              type="tel"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={saving || done}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#1B3FA8] hover:bg-[#0D1D5E] disabled:opacity-60 text-white font-bold rounded-xl transition-colors"
          >
            {done
              ? <><CheckCircle size={16} /> SMS Sent!</>
              : saving
              ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
              : <><MessageSquare size={16} /> Send SMS Link</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Manual Registration Modal ────────────────────────────────────────────────
function ManualModal({
  planTypes, onClose, onDone,
}: {
  planTypes: PlanType[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "", email: "",
    address: "", city: "", state: "TX", zipCode: "",
    planTypeId: planTypes[0]?.id ?? "",
    billingInterval: "annual" as "annual" | "monthly",
    numberOfSystems: 1,
    repName: "",
  });
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState<string | null>(null);
  const [error, setError]     = useState("");

  const selectedPlan = planTypes.find(p => p.id === form.planTypeId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/maintenance-plans/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, numberOfSystems: Number(form.numberOfSystems) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setDone(d.membershipNumber ?? "done");
      setTimeout(() => { onDone(); onClose(); }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  const f = (k: keyof typeof form, v: string | number) =>
    setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-[#F7921A]" />
            <h2 className="text-lg font-bold text-gray-900">Manual Registration</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Customer info */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
                <input value={form.firstName} onChange={e => f("firstName", e.target.value)}
                  placeholder="John" required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name *</label>
                <input value={form.lastName} onChange={e => f("lastName", e.target.value)}
                  placeholder="Smith" required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone *</label>
                <input value={form.phone} onChange={e => f("phone", e.target.value)}
                  placeholder="+1 713 000 0000" type="tel" required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input value={form.email} onChange={e => f("email", e.target.value)}
                  placeholder="john@example.com" type="email"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Service Address</p>
            <div className="space-y-3">
              <input value={form.address} onChange={e => f("address", e.target.value)}
                placeholder="123 Main St" required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <input value={form.city} onChange={e => f("city", e.target.value)}
                    placeholder="Houston" required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
                </div>
                <div>
                  <select value={form.state} onChange={e => f("state", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30">
                    {["TX","NC","MD","FL","GA","VA"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <input value={form.zipCode} onChange={e => f("zipCode", e.target.value)}
                    placeholder="77001" required maxLength={10}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
                </div>
              </div>
            </div>
          </div>

          {/* Plan */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Plan Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Plan Type *</label>
                <select value={form.planTypeId} onChange={e => f("planTypeId", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30">
                  {planTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Billing *</label>
                <select value={form.billingInterval} onChange={e => f("billingInterval", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30">
                  <option value="annual">Annual</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Systems *</label>
                <input type="number" min={1} max={10} value={form.numberOfSystems}
                  onChange={e => f("numberOfSystems", parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Rep Name</label>
                <input value={form.repName} onChange={e => f("repName", e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3FA8]/30" />
              </div>
            </div>
            {selectedPlan && (
              <p className="mt-2 text-xs text-gray-500">
                Estimated:{" "}
                <span className="font-bold text-[#F7921A]">
                  {form.billingInterval === "annual"
                    ? `$${(selectedPlan.annualPrice * form.numberOfSystems).toFixed(0)}/yr`
                    : `$${(selectedPlan.monthlyPrice * form.numberOfSystems).toFixed(2)}/mo`}
                </span>
                {" "}for {form.numberOfSystems} system{form.numberOfSystems !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {done && (
            <p className="text-green-700 text-sm bg-green-50 px-3 py-2 rounded-lg font-semibold">
              ✓ Registered! Membership #{done}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !!done}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#F7921A] hover:bg-[#e07d10] disabled:opacity-60 text-white font-bold rounded-xl transition-colors"
          >
            {done
              ? <><CheckCircle size={16} /> Registered!</>
              : saving
              ? <><Loader2 size={16} className="animate-spin" /> Registering…</>
              : <><Plus size={16} /> Register as Active Member</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminMaintenancePlansClient({
  contracts,
  planTypes,
  stats,
}: {
  contracts: Contract[];
  planTypes: PlanType[];
  stats: Stats;
}) {
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [showInvite, setShowInvite]   = useState(false);
  const [showManual, setShowManual]   = useState(false);
  const [refreshKey, setRefreshKey]   = useState(0);

  const filtered = contracts.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.membershipNumber?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.properties.some(p => `${p.address} ${p.city}`.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto" key={refreshKey}>

      {/* Modals */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onDone={() => setRefreshKey(k => k + 1)}
        />
      )}
      {showManual && (
        <ManualModal
          planTypes={planTypes}
          onClose={() => setShowManual(false)}
          onDone={() => setRefreshKey(k => k + 1)}
        />
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0A1628]">HVAC Maintenance Plans</h1>
          <p className="text-slate-500 text-sm">All subscribers — online self-enrolled &amp; manual registrations</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1B3FA8] hover:bg-[#0D1D5E] text-white text-sm font-bold rounded-xl transition-colors"
          >
            <MessageSquare size={15} />
            Send Link
          </button>
          <button
            onClick={() => setShowManual(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F7921A] hover:bg-[#e07d10] text-white text-sm font-bold rounded-xl transition-colors"
          >
            <ClipboardList size={15} />
            Register Manually
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users,       label: "Active Members",    value: stats.activeCount,      fmt: (v: number) => String(v),               color: "#1B3FA8" },
          { icon: Thermometer, label: "Systems Covered",   value: stats.totalSystems,     fmt: (v: number) => String(v),               color: "#F7921A" },
          { icon: DollarSign,  label: "Annual Revenue",    value: stats.annualRevenue,    fmt: (v: number) => `$${v.toLocaleString()}`, color: "#059669" },
          { icon: TrendingUp,  label: "Monthly Recurring", value: stats.monthlyRecurring, fmt: (v: number) => `$${v.toFixed(0)}/mo`,   color: "#7c3aed" },
        ].map(({ icon: Icon, label, value, fmt, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} style={{ color }} />
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <p className="text-2xl font-black text-[#0A1628]">{fmt(value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone, membership #, address…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#1B3FA8]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#1B3FA8]"
        >
          <option value="ALL">All Statuses</option>
          {["ACTIVE", "PAST_DUE", "SENT", "SIGNED", "PAID", "CANCELLED"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">No matching subscriptions found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(c => {
              const isExpanded = expandedId === c.id;
              const isAnnual   = c.billingInterval === "annual";
              const amount     = isAnnual ? c.annualTotal : c.monthlyTotal;
              return (
                <div key={c.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-[#0A1628] text-sm">{c.firstName} {c.lastName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[c.status] ?? "bg-slate-100 text-slate-500"}`}>
                          {c.status}
                        </span>
                        {!c.selfEnrolled && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-600">
                            Manual
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs">
                        {c.membershipNumber} · {c.email} · {c.phone}
                      </p>
                    </div>
                    <div className="text-right hidden sm:block shrink-0">
                      <p className="font-black text-[#F7921A] text-sm">
                        {amount
                          ? `$${isAnnual ? amount.toFixed(0) : amount.toFixed(2)}/${isAnnual ? "yr" : "mo"}`
                          : "—"}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {c.numberOfSystems} system{c.numberOfSystems !== 1 ? "s" : ""} · {c.planType.name}
                      </p>
                    </div>
                    {isExpanded
                      ? <ChevronUp size={16} className="text-slate-400 shrink-0" />
                      : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 bg-slate-50 border-t border-slate-100 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Enrolled</p>
                          <p className="font-semibold">{new Date(c.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Start Date</p>
                          <p className="font-semibold">{c.membershipStartDate ? new Date(c.membershipStartDate).toLocaleDateString() : "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Renewal</p>
                          <p className="font-semibold">{c.renewalDate ? new Date(c.renewalDate).toLocaleDateString() : "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Billing</p>
                          <p className="font-semibold capitalize">{c.billingInterval ?? "—"}</p>
                        </div>
                      </div>

                      {c.repName && (
                        <p className="text-xs text-slate-500">Registered by: <span className="font-semibold text-slate-700">{c.repName}</span></p>
                      )}

                      {c.properties.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Properties</p>
                          <div className="space-y-1">
                            {c.properties.map(p => (
                              <p key={p.id} className="text-xs text-slate-600">
                                📍 {p.address}, {p.city}, {p.state} · {p.systemCount} system{p.systemCount !== 1 ? "s" : ""}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <a
                          href={`/admin/customers/${c.customer.userId ?? `appt:${c.customer.phone}`}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#1B3FA8] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <ExternalLink size={12} />
                          View Customer
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4">{filtered.length} of {contracts.length} subscriptions shown</p>
    </div>
  );
}
