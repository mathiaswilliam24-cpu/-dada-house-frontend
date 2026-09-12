"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Mail, Phone, ChevronRight, Search, Plus, X, Loader2 } from "lucide-react";
import Link from "next/link";

type Customer = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  customerType: string;
  tags: string[];
  _count: { appointments: number; calls: number; messageThreads: number };
};

const EMPTY_FORM = { firstName: "", lastName: "", phone: "", email: "", address: "", city: "", state: "", zipCode: "", customerType: "RESIDENTIAL" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      const d = await res.json();
      setCustomers(d.customers ?? []);
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
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Failed to create customer");
      setForm(EMPTY_FORM);
      setShowModal(false);
      load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">Call center customer directory</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setSaveError(""); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7921A] hover:bg-[#E07F10] text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, phone, email, or address…"
          className="flex-1 text-sm focus:outline-none"
        />
        <button type="submit" className="px-3 py-1.5 bg-[#1B3FA8] text-white text-xs font-semibold rounded-lg">Search</button>
        {q && <button type="button" onClick={() => { setQ(""); load(); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#1B3FA8]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Activity</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#1B3FA8] rounded-full flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-white">{c.firstName[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.firstName} {c.lastName ?? ""}</p>
                          {c.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail className="w-3 h-3" /> {c.email}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="flex items-center gap-1 text-xs text-gray-500"><Phone className="w-3 h-3" /> {c.phone}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">{c.customerType}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {c._count.calls} call{c._count.calls !== 1 ? "s" : ""} · {c._count.appointments} job{c._count.appointments !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/customers/${c.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1B3FA8] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Add New Customer</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">First Name *</label>
                  <input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Last Name</label>
                  <input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Phone *</label>
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required type="tel"
                    placeholder="(346) 000-0000"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">Email</label>
                  <input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} type="email"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Address</label>
                <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="City"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
                <input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="State" maxLength={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8] uppercase" />
                <input value={form.zipCode} onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))} placeholder="Zip"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">Customer Type</label>
                <select value={form.customerType} onChange={(e) => setForm((f) => ({ ...f, customerType: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3FA8]">
                  <option value="RESIDENTIAL">Residential</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="ASSISTED_LIVING">Assisted Living</option>
                  <option value="PROPERTY_MANAGER">Property Manager</option>
                </select>
              </div>
              {saveError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{saveError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-[#F7921A] hover:bg-[#E07F10] disabled:opacity-60 text-white rounded-xl text-sm font-bold">
                  {saving ? "Saving…" : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
