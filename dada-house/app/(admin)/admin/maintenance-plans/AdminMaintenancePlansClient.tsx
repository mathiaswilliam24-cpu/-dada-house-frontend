"use client";

import { useState } from "react";
import { Users, Thermometer, DollarSign, TrendingUp, Search, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

type Contract = {
  id: string;
  membershipNumber: string | null;
  status: string;
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
  customer: { firstName: string; lastName: string | null; phone: string };
  properties: { id: string; address: string; city: string; state: string; systemCount: number }[];
  planType: { name: string };
};

type Stats = {
  activeCount: number;
  totalSystems: number;
  annualRevenue: number;
  monthlyRecurring: number;
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PAST_DUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-500",
  SENT: "bg-amber-100 text-amber-700",
  PAID: "bg-blue-100 text-blue-700",
};

export default function AdminMaintenancePlansClient({
  contracts,
  stats,
}: {
  contracts: Contract[];
  stats: Stats;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    <div className="p-5 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#0A1628]">HVAC Maintenance Plans</h1>
        <p className="text-slate-500 text-sm">Self-enrolled online subscriptions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users,       label: "Active Members",    value: stats.activeCount, format: (v: number) => String(v), color: "#1B3FA8" },
          { icon: Thermometer, label: "Systems Covered",   value: stats.totalSystems, format: (v: number) => String(v), color: "#F7921A" },
          { icon: DollarSign,  label: "Annual Revenue",    value: stats.annualRevenue, format: (v: number) => `$${v.toLocaleString()}`, color: "#059669" },
          { icon: TrendingUp,  label: "Monthly Recurring", value: stats.monthlyRecurring, format: (v: number) => `$${v.toFixed(0)}/mo`, color: "#7c3aed" },
        ].map(({ icon: Icon, label, value, format, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} style={{ color }} />
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <p className="text-2xl font-black text-[#0A1628]">{format(value)}</p>
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
          {["ACTIVE", "PAST_DUE", "SENT", "PAID", "CANCELLED"].map(s => (
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
              const isAnnual = c.billingInterval === "annual";
              const amount = isAnnual ? c.annualTotal : c.monthlyTotal;
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
                      </div>
                      <p className="text-slate-400 text-xs">
                        {c.membershipNumber} · {c.email} · {c.phone}
                      </p>
                    </div>
                    <div className="text-right hidden sm:block shrink-0">
                      <p className="font-black text-[#F7921A] text-sm">
                        {amount ? `$${isAnnual ? amount.toFixed(0) : amount.toFixed(2)}/${isAnnual ? "yr" : "mo"}` : "—"}
                      </p>
                      <p className="text-slate-400 text-xs">{c.numberOfSystems} system{c.numberOfSystems !== 1 ? "s" : ""}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
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
                          <p className="text-xs text-slate-500 mb-0.5">Renewal Date</p>
                          <p className="font-semibold">{c.renewalDate ? new Date(c.renewalDate).toLocaleDateString() : "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Billing</p>
                          <p className="font-semibold capitalize">{c.billingInterval}</p>
                        </div>
                      </div>

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
                          href={`/admin/customers/${c.customer.phone}`}
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
