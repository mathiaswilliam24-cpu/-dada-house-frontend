"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Mail, Phone, ChevronRight, Search, Plus, X, Loader2, CheckCircle, UserCheck } from "lucide-react";
import Link from "next/link";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  appointmentCount: number;
  hasAccount: boolean;
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);

  // New customer form
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", city: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      const d = await res.json();
      setCustomers(d.customers ?? []);
      setTotal(d.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(q);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to create customer");
      setSaved(true);
      setForm({ name: "", email: "", phone: "", address: "", city: "" });
      load();
      setTimeout(() => { setSaved(false); setShowModal(false); }, 1500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} client{total !== 1 ? "s" : ""} (registered + appointment history)</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setSaveError(""); setSaved(false); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7921A] hover:bg-[#E07F10] text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="flex-1 text-sm focus:outline-none"
        />
        <button type="submit" className="px-3 py-1.5 bg-[#1B3FA8] text-white text-xs font-semibold rounded-lg">Search</button>
        {q && <button type="button" onClick={() => { setQ(""); load(); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Jobs</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#1B3FA8] rounded-full flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-white">{(c.name || c.email)[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          {c.email && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Mail className="w-3 h-3" /> {c.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {c.phone ? (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-gray-900">{c.appointmentCount}</span>
                      <span className="text-xs text-gray-400 ml-1">job{c.appointmentCount !== 1 ? "s" : ""}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {c.hasAccount ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                          <UserCheck className="w-3 h-3" /> Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full font-medium">
                          Phone/Walk-in
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!c.id.startsWith("appt:") ? (
                        <Link
                          href={`/admin/customers/${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1B3FA8] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No customers found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Add New Customer</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {saved ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <p className="font-semibold text-gray-900">Customer added!</p>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                    placeholder="John Smith"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Email *</label>
                    <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required type="email"
                      placeholder="john@email.com"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium mb-1 block">Phone</label>
                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} type="tel"
                      placeholder="(346) 000-0000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Address</label>
                  <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="1234 Main St"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">City</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Houston"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                </div>
                {saveError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
                <p className="text-xs text-gray-400">A client account will be created. The customer can log in and reset their password via email.</p>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 bg-[#F7921A] hover:bg-[#E07F10] disabled:opacity-60 text-white rounded-xl text-sm font-bold">
                    {saving ? "Saving…" : "Add Customer"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
